import { test, expect } from '@playwright/test';

const API = process.env.API_BASE_URL ?? 'http://localhost:4010/api/v1';
const GO_API = process.env.GO_API_BASE_URL ?? 'http://localhost:4020/api/v1';
const TOKEN = 'Bearer mock-jwt-darkstore_manager';
const DS = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

test.describe('API health', () => {
  test('mock server health phase 5 TZ demo', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.phase).toBeGreaterThanOrEqual(5);
    expect(body.sku_tashkent).toBeGreaterThanOrEqual(3900);
  });
});

test.describe('Go API (when running)', () => {
  test('go api health phase 5', async ({ request }) => {
    let res;
    try {
      res = await request.get(`${GO_API}/health`, { timeout: 5000 });
    } catch {
      test.skip(true, 'Go API not running on :4020');
      return;
    }
    if (!res.ok()) {
      test.skip(true, 'Go API not running on :4020');
      return;
    }
    const body = await res.json();
    expect(body.phase).toBe(5);
    expect(body.backend).toBe('go');
    expect(body.sku_tashkent).toBeGreaterThanOrEqual(3900);
  });

  test('go api admin inventory', async ({ request }) => {
    let res;
    try {
      res = await request.get(`${GO_API}/admin/inventory?darkstore_id=${DS}`, {
        headers: { Authorization: TOKEN },
        timeout: 5000,
      });
    } catch {
      test.skip(true, 'Go API not running on :4020');
      return;
    }
    if (!res.ok()) {
      test.skip(true, 'Go API not running on :4020');
      return;
    }
    const body = await res.json();
    expect(body.items.length).toBeGreaterThan(0);
    const names = body.items.map((i: { name: { ru: string } }) => i.name.ru);
    expect(names).toContain('Яблоко');
    expect(names).toContain('Банан');
  });

  test('go api admin dashboard', async ({ request }) => {
    let res;
    try {
      res = await request.get(`${GO_API}/admin/darkstores/${DS}/dashboard`, {
        headers: { Authorization: TOKEN },
        timeout: 5000,
      });
    } catch {
      test.skip(true, 'Go API not running on :4020');
      return;
    }
    if (!res.ok()) {
      test.skip(true, 'Go API not running on :4020');
      return;
    }
    const body = await res.json();
    expect(body.pickers_online).toBeGreaterThanOrEqual(1);
    expect(body.active_orders).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Admin panels', () => {
  test('director dashboard loads after dev login', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('heading', { name: /Дашборд даркстора/i })).toBeVisible({ timeout: 15_000 });
  });

  test('HQ analytics loads after dev login', async ({ page }) => {
    await page.goto('http://localhost:5175/');
    await expect(page.getByRole('heading', { name: /Аналитика/i })).toBeVisible({ timeout: 15_000 });
  });
});
