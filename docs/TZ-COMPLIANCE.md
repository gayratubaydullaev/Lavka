# TZ §8.1–§8.5 Compliance Matrix — Jomboy Lavka

Legend: **Done** | **Partial** | **Documented** | **Out** (production ops / legal / external contracts)

Last updated: guest mode (no registration required), public catalog API, E2E-11.

## §8.1 Functional

| Area | Item | Status | Evidence |
|------|------|--------|----------|
| Customer | OTP auth | Partial | Optional; `POST /auth/otp/*` + Eskiz hook |
| Customer | **Guest / no registration** | **Done** | Flutter auto-guest after onboarding; `POST /auth/guest`; public catalog |
| Customer | 4 languages | Done | `packages/i18n/messages.json` |
| Customer | Search + products | Done | catalog `/search` returns `products` + ES/PG |
| Customer | WS tracking | Done | support WS `courier_location` stream |
| Customer | Push register | Done | Flutter `main.dart` + notification inbox |
| Customer | Loyalty | Done | order `/loyalty/*` (registered users) |
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
| Go tests | Partial | pkg/billing/order; expand with `scripts/go-test-coverage.sh` |
| 99.5% uptime prod | Out | Uztelecom |

## §8.3–§8.5

| Item | Status | Evidence |
|------|------|--------|
| E2E mock 10/10 | Done | `e2e/tests/tz-acceptance.spec.ts` |
| E2E mock guest (E2E-11) | Done | catalog without token + guest order |
| E2E Go Kong | Partial | `e2e/tests/tz-go-acceptance.spec.ts` (3 scenarios) |
| Compliance docs | Documented | `docs/compliance/` |
| Soft launch / signatures | Out | ops + Appendix D |

## Guest mode (customer app)

After onboarding the app **automatically enters guest session** (`mock-jwt-guest`). Users can:

- Browse catalog, search, cart, checkout **without phone registration**
- Optionally sign in via OTP from Profile or Auth screen
- Catalog read APIs are **public** (no Authorization header required)

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

Payme/Click merchant contracts, Eskiz/FCM prod credentials, Uztelecom deploy, 7-day soft launch, CEO signatures (Appendix D), 500 RPS / 2000 WS load proof in production, real BLE hardware pairing in field.

## Formal sign-off (§8.4)

| Criterion | Status |
|-----------|--------|
| 100% §8.1 functional | **Not met** — prod SMS, field BLE, full mobile offline |
| 100% §8.2 NFR | **Not met** — prod load/uptime/DR |
| 100% §8.3 compliance | **Documented only** — legal/contracts pending |
| PM/TL/QA/CEO signatures | **Pending** |
| Soft launch 7 days | **Pending** |

**In-repo MVP readiness: ~90%. Formal TZ v1.0 acceptance: pending ops/legal sign-off.**
