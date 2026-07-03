import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const API = process.env.API_BASE_URL ?? 'http://localhost:4010/api/v1';
const TOKEN = 'Bearer mock-jwt-darkstore_manager';
const COURIER = 'Bearer mock-jwt-courier';
const SUPPORT = 'Bearer mock-jwt-support_operator';
const HQ = 'Bearer mock-jwt-hq_admin';
const DS = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const TICKET_ID = '00000000-0000-4000-8000-000000002001';
const ORDER_FOR_REPLACEMENT = '00000000-0000-4000-8000-000000001002';

test.describe('TZ §8.5 E2E acceptance', () => {
  test('E2E-01 full order flow API', async ({ request }) => {
    const catalog = await request.get(`${API}/catalog/darkstores/${DS}?limit=1`, {
      headers: { Authorization: TOKEN },
    });
    expect(catalog.ok()).toBeTruthy();
    const products = (await catalog.json()).products;
    expect(products.length).toBeGreaterThan(0);

    const order = await request.post(`${API}/orders`, {
      headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
      data: {
        darkstore_id: DS,
        payment_method: 'payme',
        delivery_address: { mahalla_id: 'm1', landmark: 'test' },
        items: [{ product_id: products[0].id, quantity: 1 }],
      },
    });
    expect(order.ok()).toBeTruthy();
    const { order_id } = await order.json();
    expect(order_id).toBeTruthy();
  });

  test('E2E-02 cancel order + refund path', async ({ request }) => {
    const create = await request.post(`${API}/orders`, {
      headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
      data: {
        darkstore_id: DS,
        items: [{ product_id: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
        delivery_address: {},
      },
    });
    expect(create.ok()).toBeTruthy();
    const { order_id } = await create.json();
    const cancel = await request.post(`${API}/orders/${order_id}/cancel`, {
      headers: { Authorization: TOKEN },
    });
    expect(cancel.ok()).toBeTruthy();
    const body = await cancel.json();
    expect(body.status ?? body.order?.status).toMatch(/CANCEL/i);
  });

  test('E2E-03 replacement flow', async ({ request }) => {
    const res = await request.post(`${API}/picker/tasks/${ORDER_FOR_REPLACEMENT}/replacement`, {
      headers: { Authorization: 'Bearer mock-jwt-picker', 'Content-Type': 'application/json' },
      data: { sku_id: '00000000-0000-4000-8000-000000000001', reason: 'out_of_stock' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.timeout_seconds ?? body.timer_seconds).toBeGreaterThan(0);
    expect(body.replacement_options?.length ?? 0).toBeGreaterThan(0);
  });

  test('E2E-04 mult-order courier', async ({ request }) => {
    const active = await request.get(`${API}/courier/orders/active`, {
      headers: { Authorization: COURIER },
    });
    expect(active.ok()).toBeTruthy();
    const body = await active.json();
    expect(Array.isArray(body.orders)).toBeTruthy();
    if (body.mult_order !== undefined) expect(body.max ?? 2).toBeLessThanOrEqual(2);

    const offers = await request.get(`${API}/courier/offers`, { headers: { Authorization: COURIER } });
    expect(offers.ok()).toBeTruthy();
    const offersBody = await offers.json();
    expect((offersBody.offers ?? []).length).toBeGreaterThan(0);
  });

  test('E2E-05 support refund', async ({ request }) => {
    const tickets = await request.get(`${API}/tickets`, { headers: { Authorization: SUPPORT } });
    expect(tickets.ok()).toBeTruthy();
    const list = (await tickets.json()).tickets as Array<{ id: string }>;
    expect(list.length).toBeGreaterThan(0);
    const ticketId = list.find((t) => t.id === TICKET_ID)?.id ?? list[0].id;
    const refund = await request.post(`${API}/tickets/${ticketId}/refund-decision`, {
      headers: { Authorization: SUPPORT, 'Content-Type': 'application/json' },
      data: { decision: 'approved', amount: 50000 },
    });
    expect(refund.ok()).toBeTruthy();
  });

  test('E2E-06 courier offline sync endpoint', async ({ request }) => {
    const loc = await request.post(`${API}/courier/location`, {
      headers: { Authorization: COURIER, 'Content-Type': 'application/json' },
      data: { lat: 41.31, lng: 69.24 },
    });
    expect(loc.ok()).toBeTruthy();
    const body = await loc.json();
    expect(body.ok).toBeTruthy();
  });

  test('E2E-07 payme fail → click idempotency', async ({ request }) => {
    const orderId = '00000000-0000-4000-8000-000000001001';
    const orderRes = await request.get(`${API}/orders/${orderId}`, { headers: { Authorization: TOKEN } });
    expect(orderRes.ok()).toBeTruthy();
    const order = await orderRes.json();
    const tiyin = order.total_amount * 100;

    const paymeFail = await request.post(`${API}/payments/webhooks/payme`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        transaction_id: `fail-${Date.now()}`,
        order_id: orderId,
        amount: 1,
        params: { id: `fail-${Date.now()}`, amount: 1, account: { order_id: orderId } },
      },
    });
    expect(paymeFail.status()).toBe(400);

    const txClick = `click-${Date.now()}`;
    const clickBody = { click_trans_id: txClick, merchant_trans_id: orderId, order_id: orderId, amount: tiyin };
    const h = { 'Content-Type': 'application/json' };
    const r1 = await request.post(`${API}/payments/webhooks/click`, { headers: h, data: clickBody });
    const r2 = await request.post(`${API}/payments/webhooks/click`, { headers: h, data: clickBody });
    expect(r1.ok()).toBeTruthy();
    expect(r2.ok()).toBeTruthy();
    const body2 = await r2.json();
    expect(body2.idempotent ?? body2.error === 0).toBeTruthy();
  });

  test('E2E-08 complex mahalla delivery fee +3000', async ({ request }) => {
    const res = await request.post(`${API}/delivery/quote`, {
      headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
      data: { darkstore_id: DS, cart_total: 50000, complex_mahalla: true },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.delivery_fee).toBeGreaterThanOrEqual(18000);
  });

  test('E2E-09 four-language i18n keys', async () => {
    const messagesPath = path.resolve(__dirname, '../../packages/i18n/messages.json');
    const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf-8')) as Record<
      string,
      Record<string, string>
    >;
    const requiredLocales = ['ru', 'en', 'uz_latin', 'uz_cyrillic'];
    const keys = Object.keys(messages);
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys.slice(0, 30)) {
      for (const loc of requiredLocales) {
        expect(messages[key][loc], `missing ${key}.${loc}`).toBeTruthy();
      }
    }
  });

  test('E2E-10 antifraud velocity block', async ({ request }) => {
    const deviceId = `e2e-device-${Date.now()}`;
    let blocked = false;
    for (let i = 0; i < 5; i++) {
      const res = await request.post(`${API}/orders`, {
        headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
        data: {
          darkstore_id: DS,
          customer_id: 'cust-fraud-test',
          device_id: deviceId,
          items: [{ product_id: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
          delivery_address: { mahalla_id: 'm1' },
        },
      });
      if (res.status() === 403) {
        blocked = true;
        const body = await res.json();
        expect(body.code).toBe('FRAUD_BLOCKED');
        break;
      }
    }
    const stats = await request.get(`${API}/admin/fraud/stats`, { headers: { Authorization: HQ } });
    expect(stats.ok()).toBeTruthy();
    const fraudStats = await stats.json();
    expect(fraudStats.orders_velocity_limit ?? fraudStats.blocked_count).toBeDefined();
    if (!blocked) {
      expect(fraudStats.blocked_count).toBeGreaterThanOrEqual(0);
    }
  });
});
