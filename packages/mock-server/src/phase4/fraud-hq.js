import { randomUUID } from 'crypto';

export function createFraudHqState() {
  return {
    blockedOrders: [
      {
        id: 'blk-001',
        order_id: '00000000-0000-4000-8000-000000000999',
        customer_id: 'cust-new-high',
        reason: 'NEW_ACCOUNT_HIGH_VALUE',
        amount: 620000,
        darkstore_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        status: 'blocked',
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'blk-002',
        order_id: '00000000-0000-4000-8000-000000000998',
        customer_id: 'cust-madina',
        reason: 'PAYMENT_VELOCITY',
        amount: 89000,
        darkstore_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        status: 'blocked',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    stats: {
      blocked_count: 2,
      flagged_count: 5,
      false_positive_rate: 0.08,
      fraud_loss_gmv_pct: 0.32,
      confirmed_fraud_count: 1,
    },
  };
}

export function getFraudStats(fraudHq) {
  return {
    ...fraudHq.stats,
    blocked_count: fraudHq.blockedOrders.filter((b) => b.status === 'blocked').length,
  };
}

export function unblockOrder(fraudHq, id) {
  const item = fraudHq.blockedOrders.find((b) => b.id === id);
  if (!item) return null;
  item.status = 'unblocked';
  item.unblocked_at = new Date().toISOString();
  return item;
}

export function recordBlock(fraudHq, order) {
  const entry = {
    id: randomUUID(),
    order_id: order.id,
    customer_id: order.customer_id,
    reason: 'FRAUD_BLOCKED',
    amount: order.total_amount,
    darkstore_id: order.darkstore_id,
    status: 'blocked',
    created_at: new Date().toISOString(),
  };
  fraudHq.blockedOrders.unshift(entry);
  fraudHq.stats.blocked_count += 1;
  return entry;
}
