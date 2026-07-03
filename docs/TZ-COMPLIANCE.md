# TZ §8.1–§8.5 Compliance Matrix — Jomboy Lavka

Legend: **Done** | **Partial** | **Documented** | **Out** (production ops / legal / external contracts)

Last updated: full in-repo hardening pass (MinIO, BLE, billing parity, metrics, bootstrap).

## §8.1 Functional

| Area | Item | Status | Evidence |
|------|------|--------|----------|
| Customer | OTP auth | Partial | notification OTP + Eskiz hook; prod SMS Out |
| Customer | 4 languages | Done | `packages/i18n/messages.json` |
| Customer | Search + products | Done | catalog `/search` returns `products` + ES/PG |
| Customer | WS tracking | Done | support WS `courier_location` stream |
| Customer | Push register | Done | Flutter `main.dart` + notification inbox |
| Customer | Loyalty | Done | order `/loyalty/*` with `history` key |
| Picker | Wave + scan + BLE | Done | picker tasks `items[]`, weight validation, `BleScaleManager` |
| Picker | Replacement 60s | Done | picker + push outbox stub |
| Courier | MinIO photo | Done | `POST /courier/uploads` + Android upload |
| Courier | Stats/heatmap | Done | full stats fields + demand-heatmap |
| Director/WMS | Full WMS | Done | receipt/placement/IoT |
| Support | AI + enriched | Done | support service |
| HQ | Reports/fraud/audit | Done | admin-bff |
| Backend | 8 Go services | Done | Kong routes |
| Backend | Antifraud | Done | order velocity + billing amount check |
| Backend | Billing parity | Done | Payme 400 mismatch, Click idempotent, fiscal on paid |

## §8.2 Non-functional

| Metric | Status | Evidence |
|--------|--------|----------|
| 200 RPS | Partial | `K6_RATE=200 k6 run scripts/load-test/k6-mvp.js` |
| Prometheus HTTP metrics | Done | `services/pkg/metrics` + `/metrics` all services |
| Grafana | Done | provisioning + `deploy/grafana/jomboy-tz-dashboard.json` |
| K8s HPA 8 svc | Done | `deploy/k8s/microservices.yaml` |
| Go tests | Partial | billing, order, pkg; `scripts/go-test-coverage.sh` |
| 99.5% uptime prod | Out | Uztelecom |

## §8.3–§8.5

| Item | Status | Evidence |
|------|------|--------|----------|
| E2E mock 10/10 | Done | `e2e/tests/tz-acceptance.spec.ts` |
| E2E Go Kong | Partial | `e2e/tests/tz-go-acceptance.spec.ts` |
| Compliance docs | Documented | `docs/compliance/` |
| Soft launch / signatures | Out | ops + Appendix D |

## Verification

```bash
npm run mock:dev
npm run e2e -- --grep "TZ"

npm run prod-local:up
npm run prod-local:bootstrap
API_BASE_URL=http://localhost:8000/api/v1 npm run e2e -- --grep "Go TZ"

# Android prod-local flavor
cd apps/courier-android && ./gradlew assembleMockDebug assembleProdLocalDebug
cd apps/picker-android && ./gradlew assembleMockDebug assembleProdLocalDebug
```

## Still Out (cannot complete in repo)

Payme/Click merchant contracts, Eskiz/FCM prod credentials, Uztelecom deploy, 7-day soft launch, CEO signatures, real BLE hardware pairing in field.
