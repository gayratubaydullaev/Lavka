# Jomboy Lavka — Client Applications Monorepo

7 клиентских приложений по [docs/TZ-v1.0.md](docs/TZ-v1.0.md) + shared packages + mock API.

## Структура

| # | Приложение | Путь | Стек | Порт dev |
|---|-----------|------|------|----------|
| 1 | Jomboy Lavka (покупатели) | `apps/customer-flutter` | Flutter 3.22+, Riverpod | — |
| 2 | Курьер | `apps/courier-android` | Kotlin, Compose | — |
| 3 | Сборщик | `apps/picker-android` | Kotlin, Compose | — |
| 4 | Панель директора | `apps/admin-director` | React 18, Vite | 5173 |
| 5 | Панель кладовщика | `apps/admin-warehouse` | React 18, Vite | 5176 |
| 6 | Панель поддержки | `apps/admin-support` | React 18, Vite | 5174 |
| 7 | HQ-панель | `apps/admin-hq` | React 18, Vite | 5175 |

## Shared packages

- `packages/api-contracts` — OpenAPI 3.0
- `packages/mock-server` — Express mock API + WebSocket
- `packages/design-tokens` — цвета, spacing (#2E7D32)
- `packages/i18n` — 4 языка (uz кирилл./лат., ru, en)
- `packages/ui-web` — React components для админок
- `packages/android-core` — shared Kotlin modules (network, database, sync)

## Быстрый старт

### Требования

- Node.js 20+
- pnpm 9+
- Flutter 3.22+ (для customer app)
- Android Studio / JDK 17 (для Kotlin apps)

### Одной командой (mock + все веб-админки)

```bash
npm install
npm run dev
```

Запускает сразу:
- Mock API → http://localhost:4010/api/v1
- Директор → http://localhost:5173
- Поддержка → http://localhost:5174
- HQ → http://localhost:5175
- Кладовщик → http://localhost:5176

С pnpm: `pnpm install && pnpm dev` (если установлен).

Альтернатива: `bash scripts/dev-all.sh`

`Ctrl+C` останавливает все процессы.

### По отдельности

#### Mock API

```bash
pnpm install
pnpm mock:dev
```

Mock API: `http://localhost:4010/api/v1`  
OTP demo code: `1234`  
Darkstore ID: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### 2. Web admin panels

```bash
pnpm admin:director    # :5173
pnpm admin:support     # :5174
pnpm admin:hq          # :5175
pnpm admin:warehouse   # :5176
```

Dev login: кнопка «Dev Login» на экране авторизации (mock JWT).

### Flutter customer app

```bash
cd apps/customer-flutter
flutter pub get
flutter run
# Android emulator uses 10.0.2.2:4010 for mock API
```

### Android field apps

```bash
cd apps/picker-android && ./gradlew assembleDebug
cd apps/courier-android && ./gradlew assembleDebug
```

## Environment

Copy `.env.example` in each app. Key variable:

```
API_BASE_URL=http://localhost:4010/api/v1
```

## Scope notes

- **Backend не включён** — только mock server
- **iOS/Android stores** — не настроены (Flutter dual-platform code ready)
- **Phase 2 (WMS)** — полная приёмка, размещение, инвентаризация, списания, АСЛ БЕЛГИ, IoT
- **Phase 3 (AI, loyalty, antifraud)** — mock RAG, тайм-машина, авто-возвраты, промокоды, heatmap
- **Phase 4 (scale)** — Самарканд darkstore, HQ BI/cohort/funnel, тарифы, WORM audit, antifraud HQ, city switch, k6
- **Phase 5 (production scaffold)** — Go API + Postgres, Docker Compose, Playwright E2E, CI, TZ §8 demo completion
- **TZ compliance** — см. [docs/TZ-COMPLIANCE.md](docs/TZ-COMPLIANCE.md) (demo vs production sign-off)
- **HQ** — GMV/OTD, cohort, funnel, tariffs, audit, darkstores overview
- **iOS TestFlight** — не включён (Flutter dual-platform ready)

## Phase 2 — WMS, ASL BELGI, IoT

По [TZ §6.3](docs/TZ-v1.0.md): полный WMS в mock API и панели кладовщика.

### Панель кладовщика (`:5176`)

| Раздел | Описание |
|--------|----------|
| Приёмка | PO → скан штрихкода → АСЛ БЕЛГИ (маркированные SKU) → срок годности → t° заморозки → эскалация >5% |
| Размещение | Рекомендация ячеек по зоне |
| Инвентаризация | Циклический пересчёт, допуск расхождения &lt;2% |
| Списания | Фото обязательно → подпись директора |

### Панель директора

- Баннер миграции приёмки в WMS
- Раздел **WMS / IoT** — температурные алерты термосумок, подпись списаний

### Полевые приложения

- **Сборщик** — проверка АСЛ БЕЛГИ при сборке маркированных SKU; ручной ввод t° термосумки
- **Курьер** — отправка показаний IoT (`POST /courier/iot/temperature`) в пути к клиенту

### Demo-коды АСЛ БЕЛГИ

`0104600123456789`, `0104600987654321` — валидные в mock (72h offline cache).

### IoT пороги (mock)

- Заморозка: &gt;8°C, охлаждёнка: &gt;12°C, длительность &gt;15 мин → алерт на дашборде директора

## Phase 3 — AI, лояльность, антифрод

По [TZ §6.4](docs/TZ-v1.0.md): mock RAG (без OpenAI), тайм-машина, авто-возвраты, лояльность, heatmap курьера.

### Панель поддержки (`:5174`)

| Функция | Описание |
|---------|----------|
| AI Assistant | Mock RAG по FAQ → «Предложить ответ», auto-reply при confidence &gt;85% |
| Тайм-машина | Timeline заказа: статусы, geo, фото, сканы, t° |
| Антифрод | Risk score, flags, recommendation |
| Авто-возврат | Rules: сумма &lt;50k, первый refund, trust &gt;0.9 |
| Фильтры | New / In Progress / Auto-resolved / Resolved |

### Customer app (Flutter)

- Промокод в корзине: `WELCOME10`, `FRIEND5000`, `HALAL15`
- Бонусы 1% — профиль + списание до 50% заказа
- Реферальный код `JOMBOY-XXXX` в профиле

### Courier app

- **Тепловая карта** — зоны A–F, surge multiplier, прогноз заказов

### Demo auto-refund

Тикет #2003 (заказ &lt;50k, cust-dilshod, 0 refunds) → кнопка **Auto-approve** в support.

### Health check

`GET /api/v1/health` → `{ phase: 3, wms: true, ai: true }`

## Phase 4 — Масштабирование (clients-only)

По [TZ §6.5](docs/TZ-v1.0.md): второй даркстор (Самарканд), HQ BI/тарифы/аудит/антифрод, выбор города в customer app, k6 load test, iOS scaffold.

### Darkstore IDs

| Город | ID |
|-------|-----|
| Ташкент | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| Самарканд | `b2c3d4e5-f6a7-8901-bcde-f12345678901` |

### HQ-панель (`:5175`)

| Раздел | Описание |
|--------|----------|
| Аналитика | GMV, cohort retention, funnel, BI summary (LTV/CAC/NPS), Metabase embed stub |
| Дарксторы | Обзор Ташкент + Самарканд (orders, GMV, SKU) |
| Антифрод | KPI + заблокированные заказы + unblock |
| Тарифы | Edit draft → preview impact → publish (audit log) |
| Аудит | WORM CSV export с `X-Audit-Hash` |

Фильтр по даркстору: query `darkstore_id` на dashboard/orders/inventory/staff.

### Customer app — выбор города

- Тап по заголовку на главной → Ташкент / Самарканд
- Каталог и доставка переключаются по `darkstore_id`
- «Скоро в вашем городе» — waitlist stub для неподдерживаемых махаллей

### Load test (k6)

```bash
npm run mock:dev   # terminal 1
npm run loadtest   # terminal 2 (k6 must be installed)
```

См. [scripts/load-test/README.md](scripts/load-test/README.md). Demo: ~50 VUs; production target 500 RPS — вне scope mock.

### iOS build (без Fastlane)

```bash
cd apps/customer-flutter
flutter pub get
flutter create . --platforms=ios   # если ios/ неполный
open ios/Runner.xcworkspace      # macOS + Xcode
flutter run -d ios               # simulator
```

**App Store checklist (external):** bundle ID, ATS для dev API, privacy manifest, screenshots — без автоматизации в репо.

### Health check

`GET /api/v1/health` → `{ phase: 4, darkstores: 2, wms: true, ai: true }`

### PCI DSS / 99.7% uptime

Вне scope кода — см. [TZ §6.5](docs/TZ-v1.0.md) как external checklist для production.

## Phase 5 — Production scaffold

Go API + PostgreSQL, Docker Compose, Playwright E2E, GitHub Actions CI.

### Quick start

```bash
npm run phase5:up          # postgres + Go API on :4020
npm run admin:director:go  # director UI → Go API (not mock)
npm run e2e:go             # Playwright smoke against Go API
```

Fresh database:

```bash
npm run phase5:reset
```

### Go API (`:4020`)

| Service | Port |
|---------|------|
| postgres | 5432 |
| api (Go) | 4020 |
| mock-server | 4010 (profile `mock`) |

`GET http://localhost:4020/api/v1/health` → `{ phase: 5, backend: "go", sku_tashkent: 3900 }`

Admin routes ported: dashboard, inventory, staff, orders. See [services/api/README.md](services/api/README.md).

Mock server (`:4010`) keeps full Phase 1–4 feature parity for mobile/WMS/support.

### Docker Compose

```bash
npm run docker:up      # alias phase5:up
npm run docker:down
npm run docker:build
```

### E2E (Playwright)

```bash
npm run mock:dev       # mock API tests
npm run e2e:api
npm run phase5:up && npm run e2e:go
npm run e2e          # all tests
```

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml): web build, Go API Docker build, mock E2E, **Go API E2E**, admin UI smoke.

## Order flow (E2E demo)

1. Customer app → catalog → cart → Payme mock → tracking WS
2. Picker app → wave A→F → scan → pack → READY
3. Courier app → offer 30s → pickup → deliver + photo
4. Director panel → live dashboard + manual reassign
5. Support panel → ticket → refund approve → Billing mock
6. Warehouse panel → PO receipt → placement → inventory / writeoff
7. Director → WMS/IoT alerts + approve writeoffs
8. Support → AI suggest + timeline + fraud panel → auto-refund or manual
9. Customer → promo `WELCOME10` + bonus wallet
10. Courier → demand heatmap zones A–F
11. HQ → cohort/funnel by darkstore, publish tariffs, fraud unblock
12. Customer → switch Tashkent ↔ Samarkand, catalog changes
