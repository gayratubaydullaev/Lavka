import { test, expect } from '@playwright/test';

/**
 * TZ §8.5 acceptance against Go stack via Kong (prod-local).
 * Run: API_BASE_URL=http://localhost:8000/api/v1 npm run e2e -- --grep "Go TZ"
 */
const API = process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1';
const DS = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const TOKEN = 'Bearer mock-jwt-customer';

test.describe('Go TZ acceptance via Kong', () => {
  async function goStackUp(request: import('@playwright/test').APIRequestContext) {
    try {
      const ping = await request.get(`${API}/loyalty/wallet`, {
        headers: { Authorization: TOKEN },
        failOnStatusCode: false,
        timeout: 3000,
      });
      return ping.ok();
    } catch {
      return false;
    }
  }

  test.beforeEach(async ({ request }) => {
    test.skip(!(await goStackUp(request)), 'Kong/Go stack not running — start with npm run prod-local:up');
  });

  test('Go TZ-01 loyalty + timeline + fraud profile', async ({ request }) => {
    const wallet = await request.get(`${API}/loyalty/wallet`, { headers: { Authorization: TOKEN } });
    expect(wallet.ok()).toBeTruthy();

    const order = await request.post(`${API}/orders`, {
      headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
      data: {
        darkstore_id: DS,
        items: [{ product_id: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
        delivery_address: {},
      },
    });
    expect(order.ok()).toBeTruthy();
    const { order_id } = await order.json();

    const timeline = await request.get(`${API}/orders/${order_id}/timeline`, {
      headers: { Authorization: TOKEN },
    });
    expect(timeline.ok()).toBeTruthy();
    const events = (await timeline.json()).events;
    expect(events.length).toBeGreaterThan(0);

    const fraud = await request.get(`${API}/customers/cust-dilshod/fraud-profile`, {
      headers: { Authorization: TOKEN },
    });
    expect(fraud.ok()).toBeTruthy();
  });

  test('Go TZ-02 HQ reports + WMS receipt', async ({ request }) => {
    const HQ = 'Bearer mock-jwt-hq_admin';
    const gmv = await request.get(`${API}/admin/reports/gmv`, { headers: { Authorization: HQ } });
    expect(gmv.ok()).toBeTruthy();

    const po = await request.get(`${API}/wms/purchase-orders`, { headers: { Authorization: HQ } });
    expect(po.ok()).toBeTruthy();
    const orders = (await po.json()).purchase_orders;
    expect(orders.length).toBeGreaterThan(0);

    const receipt = await request.post(`${API}/admin/warehouse/receipts`, {
      headers: { Authorization: HQ, 'Content-Type': 'application/json' },
      data: { po_number: orders[0].id },
    });
    expect(receipt.ok()).toBeTruthy();
  });

  test('Go TZ-03 support AI + ASL verify', async ({ request }) => {
    const SUPPORT = 'Bearer mock-jwt-support_operator';
    const ai = await request.post(`${API}/support/ai/suggest`, {
      headers: { Authorization: SUPPORT, 'Content-Type': 'application/json' },
      data: { description: 'wrong item delivered' },
    });
    expect(ai.ok()).toBeTruthy();

    const asl = await request.post(`${API}/catalog/asl-belgisi/verify`, {
      headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
      data: { code: '0104600123456789' },
    });
    expect(asl.ok()).toBeTruthy();
    expect((await asl.json()).valid).toBe(true);
  });
});
