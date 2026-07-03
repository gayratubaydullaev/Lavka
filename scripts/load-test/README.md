# k6 load test — Jomboy Lavka mock API

Smoke/load script for Phase 4 demo against the local mock server.

## Requirements

Install [k6](https://k6.io/docs/get-started/installation/) locally (not bundled in the monorepo).

## Run

Start mock API first:

```bash
npm run mock:dev
```

Then:

```bash
npm run loadtest
# or
k6 run scripts/load-test/k6-smoke.js
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE` | `http://localhost:4010/api/v1` | Mock API base URL |
| `DARKSTORE_ID` | Tashkent UUID | Catalog/order darkstore |

Example:

```bash
API_BASE=http://localhost:4010/api/v1 DARKSTORE_ID=b2c3d4e5-f6a7-8901-bcde-f12345678901 k6 run scripts/load-test/k6-smoke.js
```

## Scenarios

| Scenario | VUs | Notes |
|----------|-----|-------|
| `catalog` | 20 sustained | `GET /catalog/darkstores/:id` |
| `dashboard` | 10 sustained | Director dashboard |
| `order_burst` | ramp 0→50 | `POST /orders` with idempotency key |

**Demo target:** ~50 VUs sustained; README notes that production target is **500 RPS peak burst** (requires distributed k6 + real backend — out of scope for clients-only mock).

## Thresholds

- `http_req_failed` &lt; 5%
- `p(95)` latency &lt; 800 ms (mock on localhost)

Adjust `options.scenarios` in `k6-smoke.js` for heavier runs.
