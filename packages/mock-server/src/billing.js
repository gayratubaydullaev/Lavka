import { randomUUID, createHash } from 'crypto';

const processedWebhooks = new Set();
const fiscalReceipts = new Map();

export function handlePaymeWebhook(body, orders) {
  const txId = body?.params?.id ?? body?.transaction_id;
  if (!txId) return { error: 'missing transaction id', status: 400 };
  if (processedWebhooks.has(txId)) {
    return { result: { state: 2 }, idempotent: true };
  }
  const orderId = body?.params?.account?.order_id ?? body?.order_id;
  const order = orders.find((o) => o.id === orderId);
  const amountTiyin = body?.params?.amount ?? body?.amount;
  if (!order) return { error: 'order not found', status: 404 };
  if (amountTiyin && order.total_amount * 100 !== amountTiyin) {
    return { error: 'amount mismatch', status: 400, fraud: true };
  }
  processedWebhooks.add(txId);
  order.payment_status = 'paid';
  order.paid_at = new Date().toISOString();
  if (order.status === 'NEW') order.status = 'ACCEPTED';
  const receipt = issueFiscalReceipt(order);
  return { result: { state: 2 }, receipt_id: receipt.id };
}

export function handleClickWebhook(body, orders) {
  const txId = body?.click_trans_id ?? body?.transaction_id;
  if (!txId) return { error: 'missing transaction id', status: 400 };
  if (processedWebhooks.has(String(txId))) {
    return { error: 0, error_note: 'Success', idempotent: true };
  }
  const orderId = body?.merchant_trans_id ?? body?.order_id;
  const order = orders.find((o) => o.id === orderId);
  if (!order) return { error: -5, error_note: 'Order not found' };
  processedWebhooks.add(String(txId));
  order.payment_status = 'paid';
  order.paid_at = new Date().toISOString();
  if (order.status === 'NEW') order.status = 'ACCEPTED';
  const receipt = issueFiscalReceipt(order);
  return { error: 0, error_note: 'Success', receipt_id: receipt.id };
}

export function issueFiscalReceipt(order) {
  const id = randomUUID();
  const payload = {
    id,
    order_id: order.id,
    amount: order.total_amount,
    fiscal_sign: createHash('sha256').update(`${order.id}:${order.total_amount}`).digest('hex').slice(0, 16),
    ofd_status: 'sent',
    soliq_ref: `SOLIQ-${id.slice(0, 8).toUpperCase()}`,
    created_at: new Date().toISOString(),
  };
  fiscalReceipts.set(order.id, payload);
  order.fiscal_receipt = payload;
  return payload;
}

export function getFiscalReceipt(orderId) {
  return fiscalReceipts.get(orderId) ?? null;
}

export function getPayment(order) {
  return {
    order_id: order.id,
    status: order.payment_status ?? (order.status === 'NEW' ? 'pending' : 'paid'),
    amount: order.total_amount,
    provider: order.payment_method ?? 'payme',
    paid_at: order.paid_at ?? null,
    fiscal_receipt: order.fiscal_receipt ?? getFiscalReceipt(order.id),
  };
}

/** Pending replacement requests (picker → customer 60s). */
const pendingReplacements = new Map();

export function createReplacementRequest(orderId, originalProductId, options) {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  pendingReplacements.set(orderId, {
    id,
    order_id: orderId,
    original_product_id: originalProductId,
    options,
    expires_at: expiresAt,
    status: 'pending',
  });
  return pendingReplacements.get(orderId);
}

export function getReplacementRequest(orderId) {
  return pendingReplacements.get(orderId) ?? null;
}

export function resolveReplacement(orderId, selectedProductId, order, products) {
  const req = pendingReplacements.get(orderId);
  if (!req) return { ok: false, code: 'NOT_FOUND' };
  if (new Date(req.expires_at) < new Date()) {
    req.status = 'expired';
    return { ok: false, code: 'TIMEOUT' };
  }
  const alt = products.find((p) => p.id === selectedProductId);
  if (!alt) return { ok: false, code: 'INVALID_OPTION' };
  const item = order.items.find((i) => i.product_id === req.original_product_id);
  if (item) {
    item.product_id = alt.id;
    item.name = alt.name.ru;
    item.price = alt.price;
  }
  req.status = 'resolved';
  order.status = 'ASSEMBLY';
  pendingReplacements.delete(orderId);
  return { ok: true, item };
}

/** Push notification outbox (FCM stub). */
const pushOutbox = [];

export function enqueuePush(userId, payload) {
  const msg = { id: randomUUID(), user_id: userId, ...payload, created_at: new Date().toISOString(), delivered: false };
  pushOutbox.unshift(msg);
  if (pushOutbox.length > 200) pushOutbox.pop();
  return msg;
}

export function listPush(userId) {
  return pushOutbox.filter((m) => m.user_id === userId);
}
