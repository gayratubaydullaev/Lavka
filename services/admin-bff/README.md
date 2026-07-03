# Go API — Phase 5

Production scaffold: PostgreSQL-backed API compatible with client OpenAPI contracts.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Phase 5 health + SKU counts |
| POST | `/api/v1/auth/otp/send` | OTP stub |
| POST | `/api/v1/auth/otp/verify` | OTP verify (code `1234`) |
| GET | `/api/v1/catalog/darkstores/:id` | Products from Postgres |
| GET | `/api/v1/catalog/categories` | Categories |
| GET | `/api/v1/orders` | Customer orders |
| POST | `/api/v1/orders` | Create order (transaction) |
| GET | `/api/v1/darkstores` | Multi-store list |
| GET | `/api/v1/admin/darkstores/:id/dashboard` | KPI dashboard |
| GET | `/api/v1/admin/orders` | Admin orders |
| POST | `/api/v1/admin/orders/:id/reassign` | Reassign picker/courier |
| GET | `/api/v1/admin/inventory` | Assortment / stock |
| PATCH | `/api/v1/admin/inventory/:sku_id` | Price, stock, active |
| GET | `/api/v1/admin/staff` | Pickers & couriers |
| PATCH | `/api/v1/admin/staff/:id/shift` | Start/stop shift |

Auth: Bearer token (same as mock). OTP code: `1234`.

Seed: **3900 SKU** Tashkent (Яблоко, Банан, Молоко, …), 2 Samarkand, 5 demo orders, 4 staff.

## Run with Docker Compose

```bash
npm run phase5:up
# GET http://localhost:4020/api/v1/health → { phase: 5, backend: "go", sku_tashkent: 3900 }
```

Fresh DB:

```bash
npm run phase5:reset
```

## Local dev (Go 1.22+)

```bash
cd services/api
cp .env.example .env
docker compose up -d postgres
go run ./cmd/server
```

## Client switch

Point admin apps to Go API instead of mock:

```bash
npm run phase5:up
npm run admin:director:go
# or: VITE_API_BASE_URL=http://localhost:4020/api/v1 npm run admin:director
```

Mock server (`:4010`) keeps full Phase 1–4 routes until ported.

## Migrations

SQL in `internal/migrate/migrations/` — applied once via `schema_migrations` table on startup.

## E2E

```bash
npm run phase5:up
npm run e2e:go
```
