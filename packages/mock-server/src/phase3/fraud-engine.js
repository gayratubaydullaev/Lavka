/** Antifraud v2 — rule-based risk score (Phase 3 mock) */

export function createFraudState() {
  return {
    customerProfiles: new Map(),
    deviceOrders: new Map(),
    paymentAttempts: [],
    blocks: new Map(),
  };
}

function getProfile(fraud, customerId) {
  if (!fraud.customerProfiles.has(customerId)) {
    fraud.customerProfiles.set(customerId, {
      customer_id: customerId,
      account_created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      orders_count: 0,
      refunds_count: 0,
      refund_dates: [],
      flags: [],
      device_id: 'device-demo-001',
    });
  }
  return fraud.customerProfiles.get(customerId);
}

export function computeFraudProfile(fraud, customerId, state) {
  const profile = getProfile(fraud, customerId);
  const flags = [];
  let riskScore = 10;

  const hourAgo = Date.now() - 3600000;
  const deviceKey = profile.device_id;
  const recentDeviceOrders = (fraud.deviceOrders.get(deviceKey) ?? []).filter(
    (ts) => ts > hourAgo,
  );
  if (recentDeviceOrders.length > 3) {
    flags.push({ code: 'ORDERS_VELOCITY', message: '>3 заказа/час с одного device_id', severity: 'high' });
    riskScore += 35;
  }

  const refunds30d = profile.refund_dates.filter((d) => Date.now() - new Date(d).getTime() < 30 * 86400000);
  if (refunds30d.length > 2) {
    flags.push({ code: 'REFUND_ABUSE', message: '>2 возврата за 30 дней', severity: 'medium' });
    riskScore += 25;
  }

  const accountAgeDays = (Date.now() - new Date(profile.account_created_at).getTime()) / 86400000;
  const lastOrder = state.orders.find((o) => o.customer_id === customerId);
  if (accountAgeDays < 7 && lastOrder && lastOrder.total_amount > 500000) {
    flags.push({ code: 'NEW_ACCOUNT_HIGH_VALUE', message: 'Новый аккаунт + заказ >500k', severity: 'critical' });
    riskScore += 50;
  }

  const tenMinAgo = Date.now() - 600000;
  const recentPayments = fraud.paymentAttempts.filter(
    (p) => p.customer_id === customerId && p.ts > tenMinAgo,
  );
  if (recentPayments.length > 5) {
    flags.push({ code: 'PAYMENT_VELOCITY', message: '>5 оплат за 10 мин', severity: 'critical' });
    riskScore += 40;
  }

  if (fraud.blocks.has(customerId)) {
    const block = fraud.blocks.get(customerId);
    if (block.until > Date.now()) {
      flags.push({ code: 'BLOCKED', message: block.reason, severity: 'critical' });
      riskScore = 95;
    }
  }

  riskScore = Math.min(100, Math.max(0, riskScore));
  const trustScore = Math.round((1 - riskScore / 100) * 100) / 100;

  let recommendation = 'approve_refund';
  if (riskScore >= 70) recommendation = 'block';
  else if (riskScore >= 45) recommendation = 'escalate';

  return {
    customer_id: customerId,
    risk_score: riskScore,
    trust_score: trustScore,
    flags,
    orders_count: profile.orders_count,
    refunds_count: profile.refunds_count,
    account_age_days: Math.floor(accountAgeDays),
    recommendation,
  };
}

export function checkOrderFraud(fraud, { customer_id, device_id, total_amount }) {
  if (device_id) {
    const list = fraud.deviceOrders.get(device_id) ?? [];
    list.push(Date.now());
    fraud.deviceOrders.set(device_id, list.slice(-20));
  }

  const profile = getProfile(fraud, customer_id ?? 'guest');
  if (device_id) profile.device_id = device_id;
  profile.orders_count += 1;

  const fp = computeFraudProfile(fraud, customer_id ?? 'guest', { orders: [{ customer_id, total_amount }] });

  if (fp.flags.some((f) => f.code === 'NEW_ACCOUNT_HIGH_VALUE' || f.code === 'PAYMENT_VELOCITY')) {
    fraud.blocks.set(customer_id ?? 'guest', {
      until: Date.now() + 15 * 60000,
      reason: 'Antifraud block — manual review required',
    });
    return { blocked: true, profile: fp };
  }

  return { blocked: false, profile: fp };
}

export function recordRefund(fraud, customerId) {
  const profile = getProfile(fraud, customerId);
  profile.refunds_count += 1;
  profile.refund_dates.push(new Date().toISOString());
}

export function recordPaymentAttempt(fraud, customerId) {
  fraud.paymentAttempts.push({ customer_id: customerId, ts: Date.now() });
  fraud.paymentAttempts = fraud.paymentAttempts.slice(-500);
}

export function seedFraudProfiles(fraud, customers) {
  for (const c of customers) {
    fraud.customerProfiles.set(c.id, { ...c });
  }
}
