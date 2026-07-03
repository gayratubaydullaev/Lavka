import { randomUUID } from 'crypto';
import { suggestAnswers, autoReply } from './faq-rag.js';
import {
  computeFraudProfile,
  checkOrderFraud,
  recordRefund,
  recordPaymentAttempt,
} from './fraud-engine.js';
import {
  getWallet,
  getReferral,
  validatePromocode,
  applyOrderLoyalty,
  accrueBonus,
  getLoyaltyHistory,
} from './loyalty.js';
import { buildOrderTimeline } from './timeline-builder.js';

function enrichTicket(ticket, state, phase3) {
  const order = state.orders.find((o) => o.id === ticket.order_id);
  const customerId = ticket.customer_id ?? order?.customer_id ?? 'cust-dilshod';
  const fraud = computeFraudProfile(phase3.fraud, customerId, state);
  return {
    ...ticket,
    customer_id: customerId,
    risk_score: fraud.risk_score,
    trust_score: fraud.trust_score,
    fraud_flags: fraud.flags,
    fraud_recommendation: fraud.recommendation,
  };
}

function checkAutoRefundEligibility(ticket, state, phase3) {
  const order = state.orders.find((o) => o.id === ticket.order_id);
  const customerId = ticket.customer_id ?? order?.customer_id ?? 'cust-dilshod';
  const fraud = computeFraudProfile(phase3.fraud, customerId, state);
  const amount = order?.total_amount ?? 0;
  const reasons = [];

  const amountOk = amount < 50000;
  const firstRefund = fraud.refunds_count === 0;
  const trustOk = fraud.trust_score >= 0.9;

  if (!amountOk) reasons.push(`Сумма ${amount} >= 50 000 UZS`);
  if (!firstRefund) reasons.push(`У клиента ${fraud.refunds_count} возврат(ов) за 30 дней`);
  if (!trustOk) reasons.push(`Trust score ${fraud.trust_score} < 0.9 (risk ${fraud.risk_score})`);

  return {
    eligible: amountOk && firstRefund && trustOk,
    trust_score: fraud.trust_score,
    risk_score: fraud.risk_score,
    amount,
    reasons,
  };
}

function processAutoRefund(ticket, state, phase3) {
  const order = state.orders.find((o) => o.id === ticket.order_id);
  const customerId = ticket.customer_id ?? order?.customer_id ?? 'cust-dilshod';
  recordRefund(phase3.fraud, customerId);
  ticket.status = 'auto_resolved';
  ticket.resolved_at = new Date().toISOString();
  ticket.auto_refund = true;
  return {
    refund_id: randomUUID(),
    status: 'completed',
    amount: order?.total_amount ?? 0,
    auto: true,
  };
}

export function registerPhase3Routes(app, phase3, state) {
  // AI support
  app.post('/api/v1/support/ai/suggest', (req, res) => {
    const suggestions = suggestAnswers({
      question: req.body.question ?? req.body.description ?? '',
      ticket_type: req.body.ticket_type,
      lang: req.body.lang ?? 'ru',
    });
    res.json({ suggestions });
  });

  app.post('/api/v1/support/ai/auto-reply', (req, res) => {
    const result = autoReply({
      question: req.body.question ?? req.body.description ?? '',
      ticket_type: req.body.ticket_type,
      lang: req.body.lang ?? 'ru',
    });
    res.json(result);
  });

  // Timeline
  app.get('/api/v1/orders/:order_id/timeline', (req, res) => {
    const order = state.orders.find((o) => o.id === req.params.order_id);
    if (!order) return res.status(404).json({ code: 'NOT_FOUND' });
    const ticket = state.tickets.find((t) => t.order_id === order.id);
    res.json(buildOrderTimeline(order, ticket));
  });

  // Fraud profile
  app.get('/api/v1/customers/:customer_id/fraud-profile', (req, res) => {
    res.json(computeFraudProfile(phase3.fraud, req.params.customer_id, state));
  });

  // Auto-refund eligibility
  app.get('/api/v1/tickets/:ticket_id/auto-refund-eligibility', (req, res) => {
    const ticket = state.tickets.find((t) => t.id === req.params.ticket_id);
    if (!ticket) return res.status(404).json({ code: 'NOT_FOUND' });
    res.json(checkAutoRefundEligibility(ticket, state, phase3));
  });

  // Loyalty
  app.get('/api/v1/loyalty/wallet', (req, res) => {
    const userId = req.query.user_id ?? req.headers['x-user-id'] ?? 'cust-dilshod';
    res.json(getWallet(phase3.loyalty, userId));
  });

  app.get('/api/v1/loyalty/referral', (req, res) => {
    const userId = req.query.user_id ?? req.headers['x-user-id'] ?? 'cust-dilshod';
    res.json(getReferral(phase3.loyalty, userId));
  });

  app.get('/api/v1/loyalty/history', (req, res) => {
    const userId = req.query.user_id ?? req.headers['x-user-id'] ?? 'cust-dilshod';
    res.json({ history: getLoyaltyHistory(phase3.loyalty, userId) });
  });

  app.post('/api/v1/loyalty/promocode/validate', (req, res) => {
    const { code, subtotal, halal_only } = req.body;
    res.json(validatePromocode(code, subtotal ?? 0, halal_only));
  });

  // Courier heatmap
  app.get('/api/v1/courier/demand-heatmap', (req, res) => {
    res.json({ zones: phase3.heatmap, updated_at: new Date().toISOString() });
  });

  // Enriched tickets list (override handled in server via helper export)
  app.get('/api/v1/tickets/enriched', (req, res) => {
    let list = state.tickets.map((t) => enrichTicket(t, state, phase3));
    if (req.query.status) list = list.filter((t) => t.status === req.query.status);
    res.json({ tickets: list });
  });
}

export {
  enrichTicket,
  checkAutoRefundEligibility,
  processAutoRefund,
  checkOrderFraud,
  recordRefund,
  recordPaymentAttempt,
  applyOrderLoyalty,
  accrueBonus,
};
