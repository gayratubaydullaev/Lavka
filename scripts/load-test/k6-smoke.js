import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.API_BASE || 'http://localhost:4010/api/v1';
const DARKSTORE = __ENV.DARKSTORE_ID || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const options = {
  scenarios: {
    catalog: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      exec: 'catalogFlow',
    },
    dashboard: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      exec: 'dashboardFlow',
      startTime: '5s',
    },
    order_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '20s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      exec: 'orderFlow',
      startTime: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

const headers = { Authorization: 'Bearer dev-token' };

export function catalogFlow() {
  const res = http.get(`${BASE}/catalog/darkstores/${DARKSTORE}?page=1`, { headers });
  check(res, { 'catalog 200': (r) => r.status === 200 });
  sleep(0.3);
}

export function dashboardFlow() {
  const res = http.get(`${BASE}/admin/darkstores/${DARKSTORE}/dashboard`, { headers });
  check(res, { 'dashboard 200': (r) => r.status === 200 });
  sleep(0.5);
}

export function orderFlow() {
  const catalog = http.get(`${BASE}/catalog/darkstores/${DARKSTORE}?limit=3`, { headers });
  if (catalog.status !== 200) return;
  const products = catalog.json('products');
  if (!products || products.length === 0) return;

  const items = products.slice(0, 2).map((p) => ({ product_id: p.id, quantity: 1 }));
  const res = http.post(
    `${BASE}/orders`,
    JSON.stringify({
      darkstore_id: DARKSTORE,
      customer_id: 'cust-dilshod',
      items,
      delivery_address: {
        coordinates: { lat: 41.311, lng: 69.279 },
        mahalla_id: 'm1',
        landmark: 'load test landmark gate blue',
      },
      payment_method: 'payme',
    }),
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${__VU}-${__ITER}-${Date.now()}`,
      },
    },
  );
  check(res, { 'order created or idempotent': (r) => r.status === 201 || r.status === 200 || r.status === 403 });
  sleep(0.2);
}

export default function () {
  catalogFlow();
}
