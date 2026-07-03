# Jomboy Lavka — Go microservices (TZ §8.1)

Eight services behind Kong (`deploy/kong/kong.yml`), profile `prod-local` in root `docker-compose.yml`.

| Service | Port | Path |
|---------|------|------|
| catalog | 8101 | `/api/v1/catalog` |
| order | 8102 | `/api/v1/orders`, `/api/v1/delivery` |
| picker | 8103 | `/api/v1/picker` |
| courier | 8104 | `/api/v1/courier` |
| billing | 8105 | `/api/v1/payments`, `/api/v1/refunds` |
| support | 8106 | `/api/v1/tickets`, `/api/v1/support/ws` |
| notification | 8107 | `/api/v1/push`, `/api/v1/auth/otp` |
| admin-bff | 8108 | `/api/v1/admin`, `/api/v1/wms`, migrations |

## Quick start

```bash
npm run prod-local:up
npm run prod-local:health
```

Gateway: `http://localhost:8000/api/v1/health` (via Kong → mock fallback or services).

## Build one service

```bash
docker compose --profile prod-local build order
```

## Tests

```bash
cd services/pkg && go test ./...
cd services/billing/cmd/server && go test .
```
