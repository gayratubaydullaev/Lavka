import { createFraudState, seedFraudProfiles } from './fraud-engine.js';
import { createLoyaltyState, getWallet, getReferral } from './loyalty.js';

export const DEMO_CUSTOMERS = [
  {
    id: 'cust-dilshod',
    account_created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    orders_count: 24,
    refunds_count: 0,
    refund_dates: [],
    flags: [],
    device_id: 'device-dilshod',
  },
  {
    id: 'cust-madina',
    account_created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
    orders_count: 56,
    refunds_count: 3,
    refund_dates: [
      new Date(Date.now() - 60 * 86400000).toISOString(),
      new Date(Date.now() - 45 * 86400000).toISOString(),
      new Date(Date.now() - 20 * 86400000).toISOString(),
    ],
    flags: [],
    device_id: 'device-madina',
  },
  {
    id: 'cust-new-high',
    account_created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    orders_count: 1,
    refunds_count: 0,
    refund_dates: [],
    flags: [],
    device_id: 'device-new-001',
  },
];

export const DEMAND_HEATMAP = ['A', 'B', 'C', 'D', 'E', 'F'].map((zone, i) => ({
  zone,
  demand_coeff: 0.4 + (i % 3) * 0.25 + Math.random() * 0.2,
  surge_multiplier: zone === 'A' || zone === 'F' ? 1.3 : zone === 'C' ? 1.0 : 1.1,
  forecast_orders: Math.floor(8 + i * 3 + Math.random() * 5),
  active_pickers: zone === 'B' ? 2 : 1,
}));

export function createPhase3State() {
  const fraud = createFraudState();
  seedFraudProfiles(fraud, DEMO_CUSTOMERS);

  const loyalty = createLoyaltyState();
  getWallet(loyalty, 'cust-dilshod');
  getReferral(loyalty, 'cust-dilshod');

  return { fraud, loyalty, heatmap: DEMAND_HEATMAP };
}
