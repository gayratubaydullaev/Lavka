import { filterByDarkstore } from './darkstores.js';

export function buildGmvReport(state, { darkstore_id, from, to } = {}) {
  const orders = filterByDarkstore(state.orders, darkstore_id);
  const days = 7;
  const daily = Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    const base = darkstore_id?.endsWith('78901') ? 2800000 : 4500000;
    return {
      date,
      gmv: base + i * (darkstore_id ? 180000 : 320000) + Math.floor(Math.random() * 100000),
      orders: (darkstore_id ? 95 : 180) + i * (darkstore_id ? 8 : 15),
    };
  });
  return {
    darkstore_id: darkstore_id ?? 'all',
    gmv: daily.reduce((s, d) => s + d.gmv, 0),
    orders_count: daily.reduce((s, d) => s + d.orders, 0),
    avg_order_value: darkstore_id?.endsWith('78901') ? 98000 : 125000,
    otd_percent: darkstore_id?.endsWith('78901') ? 84.2 : 87.5,
    daily,
  };
}

export function buildCohortReport(darkstore_id) {
  const label = darkstore_id?.endsWith('78901') ? 'Samarkand' : darkstore_id ? 'Tashkent' : 'All';
  return {
    darkstore_id: darkstore_id ?? 'all',
    label,
    weeks: ['W0', 'W1', 'W2', 'W3', 'W4'],
    cohorts: [
      { cohort: '2026-W01', size: 420, retention: [100, 68, 52, 41, 35] },
      { cohort: '2026-W02', size: 380, retention: [100, 71, 55, 44, null] },
      { cohort: '2026-W03', size: 410, retention: [100, 65, 50, null, null] },
    ],
  };
}

export function buildFunnelReport(darkstore_id) {
  const mult = darkstore_id?.endsWith('78901') ? 0.55 : darkstore_id ? 1 : 1.55;
  const steps = [
    { step: 'catalog_view', count: Math.floor(12000 * mult), label: 'Каталог' },
    { step: 'add_to_cart', count: Math.floor(4800 * mult), label: 'В корзину' },
    { step: 'checkout_start', count: Math.floor(3200 * mult), label: 'Checkout' },
    { step: 'payment_success', count: Math.floor(2800 * mult), label: 'Оплата' },
    { step: 'delivered', count: Math.floor(2650 * mult), label: 'Доставлено' },
  ];
  return { darkstore_id: darkstore_id ?? 'all', steps };
}

export function buildBiSummary(darkstore_id) {
  const isSm = darkstore_id?.endsWith('78901');
  return {
    darkstore_id: darkstore_id ?? 'all',
    ltv_uzs: isSm ? 890000 : 1250000,
    cac_uzs: isSm ? 42000 : 38000,
    retention_d30: isSm ? 0.32 : 0.36,
    nps: isSm ? 44 : 47,
    orders_per_day: isSm ? 320 : 480,
  };
}
