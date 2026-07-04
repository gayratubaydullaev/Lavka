import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import {
  DARKSTORE_ID,
  products,
  categories,
  orders,
  tickets,
  staff,
  pickerTask,
  courierOffer,
} from './data/seed.js';
import {
  samarkandProducts,
  samarkandOrders,
  samarkandStaff,
} from './data/seed-samarkand.js';
import { createWmsState } from './wms/wms-data.js';
import { registerWmsRoutes } from './wms/wms-routes.js';
import { iotAlerts } from './wms/wms-data.js';
import { createPhase3State } from './phase3/phase3-data.js';
import {
  registerPhase3Routes,
  enrichTicket,
  checkAutoRefundEligibility,
  processAutoRefund,
  checkOrderFraud,
  recordPaymentAttempt,
  recordRefund,
  applyOrderLoyalty,
  accrueBonus,
} from './phase3/phase3-routes.js';
import { createPhase4State } from './phase4/phase4-data.js';
import {
  registerPhase4Routes,
  filterByDarkstore,
  calculateDeliveryFee,
  appendAudit,
} from './phase4/phase4-routes.js';
import { recordBlock } from './phase4/fraud-hq.js';
import { canTransition, transitionOrder } from './order-fsm.js';
import {
  handlePaymeWebhook,
  handleClickWebhook,
  getPayment,
  getFiscalReceipt,
  createReplacementRequest,
  getReplacementRequest,
  resolveReplacement,
  enqueuePush,
  listPush,
  issueFiscalReceipt,
} from './billing.js';

const PORT = process.env.PORT || 4010;
const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

const state = {
  orders: [...orders, ...samarkandOrders],
  tickets: [...tickets],
  products: [...products.map((p) => ({ ...p, darkstore_id: p.darkstore_id ?? DARKSTORE_ID })), ...samarkandProducts],
  staff: [...staff, ...samarkandStaff],
  sessions: new Map(),
  idempotency: new Map(),
};

const wms = createWmsState();
registerWmsRoutes(app, wms, state);

const phase3 = createPhase3State();
registerPhase3Routes(app, phase3, state);

const phase4 = createPhase4State();
registerPhase4Routes(app, phase4, state);

function isPublicPath(path, method) {
  if (path.startsWith('/auth') || path === '/health') return true;
  if (path.startsWith('/catalog/')) return true;
  if (path === '/delivery/quote' && method === 'POST') return true;
  if (path.includes('/webhooks/')) return true;
  return false;
}

function auth(req, res, next) {
  if (isPublicPath(req.path, req.method)) return next();
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing token' });
  next();
}

app.use('/api/v1', auth);

// Auth
app.post('/api/v1/auth/otp/send', (req, res) => {
  const sessionId = randomUUID();
  state.sessions.set(sessionId, req.body.phone);
  res.json({ session_id: sessionId });
});

app.post('/api/v1/auth/otp/verify', (req, res) => {
  const { session_id, code } = req.body;
  if (!state.sessions.has(session_id) || code !== '1234') {
    return res.status(400).json({ code: 'INVALID_OTP', message: 'Invalid OTP' });
  }
  const role = req.body.role || 'customer';
  res.json({
    access_token: `mock-jwt-${role}`,
    refresh_token: 'mock-refresh',
    user: { id: randomUUID(), role, name: 'Test User', is_guest: false },
  });
});

app.post('/api/v1/auth/guest', (_req, res) => {
  const guestId = `guest-${randomUUID().slice(0, 8)}`;
  res.json({
    access_token: 'mock-jwt-guest',
    user: { id: guestId, role: 'customer', name: 'Гость', is_guest: true },
  });
});

// Catalog
app.get('/api/v1/catalog/darkstores/:darkstore_id', (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  let filtered = state.products.filter(
    (p) => p.darkstore_id === req.params.darkstore_id && p.active && p.stock > 0,
  );
  if (req.query.is_halal === 'true') filtered = filtered.filter((p) => p.is_halal);
  if (req.query.brand) filtered = filtered.filter((p) => p.brand === req.query.brand);
  if (req.query.min_price) filtered = filtered.filter((p) => p.price >= parseInt(req.query.min_price, 10));
  if (req.query.max_price) filtered = filtered.filter((p) => p.price <= parseInt(req.query.max_price, 10));
  if (req.query.category) filtered = filtered.filter((p) => p.category === req.query.category);
  const start = (page - 1) * limit;
  res.json({
    products: filtered.slice(start, start + limit),
    pagination: { page, limit, total: filtered.length },
  });
});

app.get('/api/v1/catalog/categories', (req, res) => {
  res.json({ categories });
});

app.get('/api/v1/catalog/products/:product_id', (req, res) => {
  const product = state.products.find((p) => p.id === req.params.product_id && p.active);
  if (!product) return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' });
  res.json(product);
});

app.get('/api/v1/catalog/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const results = state.products.filter((p) =>
    Object.values(p.name).some((n) => n.toLowerCase().includes(q))
  );
  res.json({ products: results.slice(0, 20), suggestions: results.slice(0, 5).map((p) => p.name.ru) });
});

app.post('/api/v1/catalog/replacements/calculate', (req, res) => {
  const alts = state.products.filter((p) => p.id !== req.body.product_id).slice(0, 3);
  res.json({
    replacements: alts.map((p, i) => ({ product: p, score: 0.9 - i * 0.1, price_diff: p.price - 10000 })),
    timeout_seconds: 60,
  });
});

// Orders
app.get('/api/v1/orders', (req, res) => {
  res.json({ orders: state.orders });
});

app.get('/api/v1/orders/:order_id', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (!order) return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' });
  res.json(order);
});

app.post('/api/v1/orders', (req, res) => {
  const key = req.headers['x-idempotency-key'];
  if (key && state.idempotency.has(key)) {
    return res.status(409).json(state.idempotency.get(key));
  }
  const customerId = req.body.customer_id ?? req.headers['x-user-id'] ?? 'cust-dilshod';
  const subtotal = req.body.items.reduce((sum, item) => {
    const p = state.products.find((pr) => pr.id === item.product_id);
    return sum + (p?.price ?? 0) * item.quantity;
  }, 0);
  const itemsHalal = req.body.items.every((item) => {
    const p = state.products.find((pr) => pr.id === item.product_id);
    return p?.is_halal ?? false;
  });
  const loyaltyResult = applyOrderLoyalty(phase3.loyalty, customerId, {
    subtotal,
    promocode: req.body.promocode,
    bonus_points_to_spend: req.body.bonus_points_to_spend ?? 0,
  });
  const deliveryFee = Math.max(0, (subtotal >= 100000 ? 0 : 15000));
  const totalBeforeDiscount = subtotal + deliveryFee;
  const totalAmount = Math.max(0, totalBeforeDiscount - loyaltyResult.discount);

  const fraudCheck = checkOrderFraud(phase3.fraud, {
    customer_id: customerId,
    device_id: req.body.device_id,
    total_amount: totalAmount,
  });
  if (fraudCheck.blocked) {
    const blockedStub = {
      id: randomUUID(),
      customer_id: customerId,
      total_amount: totalAmount,
      darkstore_id: req.body.darkstore_id ?? DARKSTORE_ID,
    };
    recordBlock(phase4.fraudHq, blockedStub);
    appendAudit(phase4.audit, { action: 'fraud.block', payload: { order_id: blockedStub.id, customer_id: customerId } });
    return res.status(403).json({
      code: 'FRAUD_BLOCKED',
      message: 'Заказ заблокирован антифродом',
      fraud_profile: fraudCheck.profile,
    });
  }

  const order = {
    id: randomUUID(),
    status: 'NEW',
    items: req.body.items.map((item) => {
      const p = state.products.find((pr) => pr.id === item.product_id);
      return { product_id: item.product_id, name: p?.name.ru ?? '', quantity: item.quantity, price: p?.price ?? 0, zone: p?.zone ?? 'B' };
    }),
    total_amount: totalAmount,
    delivery_fee: deliveryFee,
    subtotal,
    discount: loyaltyResult.discount,
    promocode: req.body.promocode,
    bonus_used: loyaltyResult.bonus_used,
    customer_id: customerId,
    darkstore_id: req.body.darkstore_id,
    payment_method: req.body.payment_method ?? 'payme',
    payment_status: 'pending',
    delivery_address: req.body.delivery_address,
    courier: null,
    eta_minutes: 18,
    created_at: new Date().toISOString(),
  };
  state.orders.unshift(order);
  const result = {
    order_id: order.id,
    status: order.status,
    total_amount: order.total_amount,
    delivery_fee: order.delivery_fee,
    discount: loyaltyResult.discount,
    estimated_delivery_minutes: 18,
  };
  if (key) state.idempotency.set(key, result);
  res.status(201).json(result);
});

app.post('/api/v1/orders/:order_id/cancel', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (!order) return res.status(404).json({ code: 'NOT_FOUND' });
  const result = transitionOrder(order, 'CANCELLED_BY_USER');
  if (!result.ok) return res.status(403).json({ code: 'CANCEL_NOT_ALLOWED', ...result });
  enqueuePush(order.customer_id, { type: 'order_cancelled', order_id: order.id });
  res.json({ status: order.status });
});

app.post('/api/v1/orders/:order_id/repeat', (req, res) => {
  const src = state.orders.find((o) => o.id === req.params.order_id);
  if (!src) return res.status(404).json({ code: 'NOT_FOUND' });
  const items = src.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
  req.body = {
    darkstore_id: src.darkstore_id,
    items,
    delivery_address: src.delivery_address,
    payment_method: src.payment_method ?? 'payme',
    customer_id: src.customer_id,
  };
  // delegate to create handler logic inline
  const customerId = src.customer_id;
  const subtotal = items.reduce((sum, item) => {
    const p = state.products.find((pr) => pr.id === item.product_id);
    return sum + (p?.price ?? 0) * item.quantity;
  }, 0);
  const deliveryFee = subtotal >= 100000 ? 0 : 15000;
  const order = {
    id: randomUUID(),
    status: 'NEW',
    items: items.map((item) => {
      const p = state.products.find((pr) => pr.id === item.product_id);
      return { product_id: item.product_id, name: p?.name.ru ?? '', quantity: item.quantity, price: p?.price ?? 0, zone: p?.zone ?? 'B' };
    }),
    total_amount: subtotal + deliveryFee,
    delivery_fee: deliveryFee,
    subtotal,
    customer_id: customerId,
    darkstore_id: src.darkstore_id,
    delivery_address: src.delivery_address,
    payment_method: src.payment_method ?? 'payme',
    payment_status: 'pending',
    courier: null,
    eta_minutes: 18,
    created_at: new Date().toISOString(),
  };
  state.orders.unshift(order);
  res.status(201).json({ order_id: order.id, status: order.status, total_amount: order.total_amount, repeated_from: src.id });
});

app.get('/api/v1/orders/:order_id/payment', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (!order) return res.status(404).json({ code: 'NOT_FOUND' });
  res.json(getPayment(order));
});

app.get('/api/v1/orders/:order_id/replacement', (req, res) => {
  const req_ = getReplacementRequest(req.params.order_id);
  if (!req_) return res.status(404).json({ code: 'NOT_FOUND' });
  res.json(req_);
});

app.post('/api/v1/orders/:order_id/replacement/choose', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (!order) return res.status(404).json({ code: 'NOT_FOUND' });
  const result = resolveReplacement(req.params.order_id, req.body.product_id, order, state.products);
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true, items: order.items });
});

app.post('/api/v1/orders/:order_id/report-problem', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  const ticket = {
    id: randomUUID(),
    order_id: req.params.order_id,
    status: 'new',
    priority: req.body.problem_type === 'not_delivered' ? 'critical' : 'high',
    type: req.body.problem_type,
    description: req.body.description,
    customer_name: 'Customer',
    customer_id: order?.customer_id ?? req.body.customer_id ?? 'cust-dilshod',
    created_at: new Date().toISOString(),
    sla_deadline: new Date(Date.now() + 1800000).toISOString(),
  };

  const eligibility = checkAutoRefundEligibility(ticket, state, phase3);
  if (eligibility.eligible) {
    processAutoRefund(ticket, state, phase3);
    state.tickets.unshift(ticket);
    return res.status(201).json({
      ticket_id: ticket.id,
      status: 'auto_resolved',
      auto_refund: true,
      refund: { amount: eligibility.amount, status: 'completed' },
    });
  }

  state.tickets.unshift(ticket);
  res.status(201).json({ ticket_id: ticket.id, status: 'open', auto_refund_eligible: false });
});

app.post('/api/v1/orders/:order_id/rate', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/v1/delivery/quote', (req, res) => {
  const cartTotal = req.body.cart_total ?? 0;
  const fee = calculateDeliveryFee(phase4.tariffs, cartTotal, {
    peak: new Date().getHours() >= 12 && new Date().getHours() < 14,
    complex_mahalla: req.body.complex_mahalla,
  });
  const threshold = phase4.tariffs.published.free_delivery_threshold;
  res.json({
    delivery_fee: fee,
    estimated_minutes: 18,
    free_delivery_remaining: Math.max(0, threshold - cartTotal),
    breakdown: { base: fee, distance: 0, peak: 0 },
  });
});

// Billing
app.post('/api/v1/payments/initiate', (req, res) => {
  const order = state.orders.find((o) => o.id === req.body.order_id);
  recordPaymentAttempt(phase3.fraud, order?.customer_id ?? 'cust-dilshod');
  if (order) {
    order.payment_method = req.body.provider;
    transitionOrder(order, 'ACCEPTED');
  }
  res.json({
    payment_id: randomUUID(),
    redirect_url: `https://mock-pay.${req.body.provider}.uz/pay?order=${req.body.order_id}`,
    provider: req.body.provider,
  });
});

app.post('/api/v1/payments/webhooks/payme', (req, res) => {
  const result = handlePaymeWebhook(req.body, state.orders);
  if (result.status === 400 || result.status === 404) {
    return res.status(result.status).json(result);
  }
  res.json(result);
});

app.post('/api/v1/payments/webhooks/click', (req, res) => {
  const result = handleClickWebhook(req.body, state.orders);
  if (result.error && result.error < 0) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/v1/payments/fiscal/:order_id', (req, res) => {
  const receipt = getFiscalReceipt(req.params.order_id);
  if (!receipt) return res.status(404).json({ code: 'NOT_FOUND' });
  res.json(receipt);
});

app.post('/api/v1/payments/fiscal/:order_id/issue', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (!order) return res.status(404).json({ code: 'NOT_FOUND' });
  res.json(issueFiscalReceipt(order));
});

app.post('/api/v1/refunds', (req, res) => {
  res.json({ refund_id: randomUUID(), status: 'completed' });
});

// Picker
app.get('/api/v1/picker/tasks/next', (req, res) => {
  res.json(pickerTask);
});

app.post('/api/v1/picker/tasks/:order_id/start', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (order) order.status = 'ASSEMBLY';
  res.json({ ok: true });
});

app.post('/api/v1/picker/tasks/:order_id/scan', (req, res) => {
  const product = state.products.find((p) => p.id === req.body.product_id);
  if (product && product.barcode !== req.body.barcode) {
    return res.status(400).json({ code: 'BARCODE_MISMATCH' });
  }
  res.json({ ok: true });
});

app.post('/api/v1/picker/tasks/:order_id/replacement', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  const alts = state.products.filter((p) => p.id !== req.body.original_product_id).slice(0, 3);
  if (order) transitionOrder(order, 'PENDING_REPLACEMENT');
  const req_ = createReplacementRequest(req.params.order_id, req.body.original_product_id, alts);
  if (order) {
    enqueuePush(order.customer_id, {
      type: 'replacement_required',
      order_id: order.id,
      options: alts.map((p) => ({ id: p.id, name: p.name.ru, price: p.price })),
      expires_at: req_.expires_at,
    });
  }
  res.json({ replacement_options: alts, timeout_seconds: 60, request_id: req_.id });
});

app.post('/api/v1/picker/tasks/:order_id/complete', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (order) transitionOrder(order, 'READY');
  res.json({ status: order?.status ?? 'READY' });
});

app.get('/api/v1/picker/stats', (req, res) => {
  res.json({ orders_today: 12, avg_time_minutes: 11.5, accuracy_rating: 4.7 });
});

// Courier
app.get('/api/v1/courier/offers', (req, res) => {
  res.json({ offers: [{ ...courierOffer, expires_at: new Date(Date.now() + 30000).toISOString() }] });
});

app.post('/api/v1/courier/offers/:order_id/accept', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (order) {
    order.status = 'AWAITING_COURIER';
    order.courier = { id: 'c1', name: 'Алишер', phone_masked: '+998 ** *** 45 67' };
  }
  res.json({ ok: true });
});

app.post('/api/v1/courier/offers/:order_id/skip', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/v1/courier/shift', (req, res) => {
  res.json({ online: req.body.action === 'start', vehicle_type: req.body.vehicle_type });
});

app.get('/api/v1/courier/orders/active', (req, res) => {
  res.json({
    orders: state.orders.filter((o) => ['AWAITING_COURIER', 'IN_DELIVERY'].includes(o.status)),
    mult_order: true,
    max: 2,
  });
});

app.post('/api/v1/courier/orders/:order_id/status/pickup', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (order) order.status = 'IN_DELIVERY';
  res.json({ ok: true });
});

app.post('/api/v1/courier/orders/:order_id/status/arrived', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/v1/courier/orders/:order_id/status/delivered', (req, res) => {
  const order = state.orders.find((o) => o.id === req.params.order_id);
  if (order) {
    order.status = 'DELIVERED';
    if (order.customer_id) accrueBonus(phase3.loyalty, order.customer_id, order.total_amount);
  }
  res.json({ ok: true });
});

app.post('/api/v1/courier/orders/:order_id/problem', (req, res) => {
  res.json({ ok: true, ticket_id: randomUUID() });
});

app.post('/api/v1/courier/location', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/v1/courier/stats', (req, res) => {
  res.json({ earnings_today: 88000, earnings_week: 420000, earnings_month: 1680000, deliveries_count: 11, rating: 4.9 });
});

// Support
app.get('/api/v1/tickets', (req, res) => {
  let list = state.tickets.map((t) => enrichTicket(t, state, phase3));
  if (req.query.status) list = list.filter((t) => t.status === req.query.status);
  res.json({ tickets: list });
});

app.get('/api/v1/tickets/:ticket_id', (req, res) => {
  const ticket = state.tickets.find((t) => t.id === req.params.ticket_id);
  if (!ticket) return res.status(404).json({ code: 'NOT_FOUND' });
  res.json(enrichTicket(ticket, state, phase3));
});

app.post('/api/v1/tickets/:ticket_id/refund-decision', (req, res) => {
  const ticket = state.tickets.find((t) => t.id === req.params.ticket_id);
  if (!ticket) return res.status(404).json({ code: 'NOT_FOUND' });

  if (req.body.auto) {
    const eligibility = checkAutoRefundEligibility(ticket, state, phase3);
    if (!eligibility.eligible) {
      return res.status(422).json({ code: 'AUTO_REFUND_DENIED', eligibility });
    }
    const refund = processAutoRefund(ticket, state, phase3);
    return res.json({ ok: true, decision: 'approve', auto: true, refund });
  }

  if (ticket) ticket.status = 'resolved';
  if (req.body.decision === 'approve' || req.body.decision === 'partial') {
    const order = state.orders.find((o) => o.id === ticket.order_id);
    recordRefund(phase3.fraud, ticket.customer_id ?? order?.customer_id ?? 'cust-dilshod');
    appendAudit(phase4.audit, {
      action: 'refund.approve',
      payload: { ticket_id: ticket.id, decision: req.body.decision, amount: req.body.amount ?? order?.total_amount },
    });
  }
  res.json({ ok: true, decision: req.body.decision });
});

// Admin
app.get('/api/v1/admin/darkstores/:id/dashboard', (req, res) => {
  const dsId = req.params.id;
  const storeOrders = filterByDarkstore(state.orders, dsId);
  const storeStaff = state.staff.filter((s) => s.darkstore_id === dsId);
  res.json({
    darkstore_id: dsId,
    active_orders: storeOrders.filter((o) => !['DELIVERED', 'CANCELLED_BY_USER'].includes(o.status)).length,
    pickers_online: storeStaff.filter((s) => s.role === 'picker' && s.online).length,
    couriers_on_route: storeStaff.filter((s) => s.role === 'courier' && s.online).length,
    orders_today: storeOrders.length,
    avg_assembly_minutes: dsId.endsWith('78901') ? 14.1 : 12.3,
    alerts: [
      { id: '1', type: 'sla_breach', message: 'Заказ просрочен на 2 мин', severity: 'critical', created_at: new Date().toISOString() },
      ...(dsId.endsWith('78901') ? [] : [
        { id: '2', type: 'low_stock', message: 'Низкий остаток: Молоко', severity: 'warning', created_at: new Date().toISOString() },
        ...iotAlerts.map((a) => ({
          id: a.id,
          type: 'iot_temperature',
          message: `IoT: ${a.device_id} ${a.temperature_c}°C`,
          severity: a.severity,
          created_at: a.created_at,
        })),
      ]),
    ],
  });
});

app.get('/api/v1/admin/orders', (req, res) => {
  let list = state.orders;
  if (req.query.darkstore_id) list = filterByDarkstore(list, req.query.darkstore_id);
  if (req.query.status) list = list.filter((o) => o.status === req.query.status);
  res.json({ orders: list });
});

app.post('/api/v1/admin/orders/:id/reassign', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/v1/admin/inventory', (req, res) => {
  let items = state.products;
  if (req.query.darkstore_id) items = items.filter((p) => p.darkstore_id === req.query.darkstore_id);
  res.json({ items: items.map((p) => ({ ...p, active: p.active ?? true })) });
});

app.patch('/api/v1/admin/inventory/:sku_id', (req, res) => {
  const item = state.products.find((p) => p.id === req.params.sku_id);
  if (!item) return res.status(404).json({ code: 'NOT_FOUND' });
  if (req.body.price !== undefined) item.price = req.body.price;
  if (req.body.quantity_delta !== undefined) item.stock += req.body.quantity_delta;
  if (req.body.active !== undefined) item.active = req.body.active;
  appendAudit(phase4.audit, {
    action: 'inventory.patch',
    payload: { sku_id: item.id, ...req.body },
  });
  res.json(item);
});

app.get('/api/v1/admin/staff', (req, res) => {
  let list = state.staff;
  if (req.query.darkstore_id) list = list.filter((s) => s.darkstore_id === req.query.darkstore_id);
  if (req.query.role) list = list.filter((s) => s.role === req.query.role);
  res.json({ staff: list });
});

app.patch('/api/v1/admin/staff/:id/shift', (req, res) => {
  const member = state.staff.find((s) => s.id === req.params.id);
  if (!member) return res.status(404).json({ code: 'NOT_FOUND' });
  if (req.body.action === 'start') {
    member.online = true;
    member.shift_started_at = new Date().toISOString();
  } else if (req.body.action === 'stop') {
    member.online = false;
    member.shift_started_at = null;
  }
  res.json(member);
});

app.get('/api/v1/push/inbox', (req, res) => {
  const userId = req.query.user_id ?? 'cust-dilshod';
  res.json({ messages: listPush(userId) });
});

app.post('/api/v1/push/register', (req, res) => {
  res.json({ token: `fcm-stub-${req.body.device_id ?? randomUUID()}`, ok: true });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    darkstore_id: DARKSTORE_ID,
    darkstores: phase4.darkstores.length,
    phase: 5,
    tz_demo: true,
    sku_tashkent: state.products.filter((p) => p.darkstore_id === DARKSTORE_ID).length,
    wms: true,
    ai: true,
    backend: 'mock',
    fiscal: true,
    webhooks: true,
  });
});

// WebSocket for order tracking and support chat
const wss = new WebSocketServer({ server, path: '/api/v1/ws' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const channel = url.searchParams.get('channel') || 'orders';
  const orderId = url.searchParams.get('order_id');

  ws.send(JSON.stringify({ type: 'connected', channel }));

  if (channel === 'orders' && orderId) {
    const order = state.orders.find((o) => o.id === orderId);
    if (order) {
      ws.send(JSON.stringify({ type: 'status_changed', status: order.status, eta_minutes: order.eta_minutes }));
    }
    const interval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'courier_location',
          lat: 41.311 + Math.random() * 0.01,
          lng: 69.279 + Math.random() * 0.01,
        }));
      }
    }, 5000);
    ws.on('close', () => clearInterval(interval));
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'chat_message') {
        ws.send(JSON.stringify({ type: 'chat_message', from: 'operator', text: 'Здравствуйте! Чем могу помочь?', ts: Date.now() }));
      }
    } catch {
      // ignore
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Jomboy Lavka mock API: http://localhost:${PORT}/api/v1`);
  console.log(`WebSocket: ws://localhost:${PORT}/api/v1/ws?channel=orders&order_id=<id>`);
  console.log(`Darkstore ID: ${DARKSTORE_ID}`);
  console.log('OTP code for auth: 1234');
});

export default app;
