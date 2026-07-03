import http from 'k6/http';
import { check, sleep } from 'k6';

// TZ §8.2 — MVP load targets (staging). Set K6_RATE=200 for TZ peak target.
const RATE = Number(__ENV.K6_RATE || 50);

export const options = {
  scenarios: {
    sustained: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: __ENV.K6_DURATION || '2m',
      preAllocatedVUs: Math.max(RATE, 50),
      maxVUs: Math.max(RATE * 2, 100),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(99)<500'],
  },
};

const BASE = __ENV.API_BASE || 'http://localhost:4010/api/v1';
const DS = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export default function () {
  const headers = { Authorization: 'Bearer mock-jwt-customer' };
  check(http.get(`${BASE}/health`, { headers }), { health: (r) => r.status === 200 });
  check(http.get(`${BASE}/catalog/darkstores/${DS}?limit=20`, { headers }), {
    catalog: (r) => r.status === 200,
  });
  sleep(0.1);
}
