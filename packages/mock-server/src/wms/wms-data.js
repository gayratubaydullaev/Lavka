import { randomUUID } from 'crypto';
import { DARKSTORE_ID, products } from '../data/seed.js';

export const WMS_ZONES = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Storage cells: zone + shelf index */
export function buildCells() {
  const cells = [];
  for (const zone of WMS_ZONES) {
    const count = zone === 'A' ? 40 : zone === 'B' ? 60 : 20;
    for (let i = 1; i <= count; i++) {
      cells.push({
        id: `cell-${zone}-${i}`,
        zone,
        code: `${zone}-${String(i).padStart(2, '0')}`,
        capacity_kg: zone === 'C' ? 50 : 100,
        occupied_kg: Math.floor(Math.random() * 30),
        temperature_zone: zone === 'C' ? 'frozen' : zone === 'A' ? 'chilled' : 'ambient',
      });
    }
  }
  return cells;
}

export const purchaseOrders = [
  {
    id: 'PO-2026-001',
    supplier: 'Korzinka Supply',
    status: 'open',
    items: products.slice(0, 5).map((p, i) => ({
      sku_id: p.id,
      name: p.name.ru,
      barcode: p.barcode,
      expected_qty: 10 + i * 2,
      zone: p.zone,
      is_marked: i < 2,
      min_expiry_days: p.zone === 'A' ? 7 : 3,
    })),
  },
  {
    id: 'PO-2026-002',
    supplier: 'UzAgro Fresh',
    status: 'open',
    items: [
      ...products.slice(5, 8).map((p, i) => ({
        sku_id: p.id,
        name: p.name.ru,
        barcode: p.barcode,
        expected_qty: 15,
        zone: p.zone,
        is_marked: false,
        min_expiry_days: 7,
      })),
      {
        sku_id: products[8].id,
        name: products[8].name.ru,
        barcode: products[8].barcode,
        expected_qty: 20,
        zone: 'C',
        is_marked: false,
        min_expiry_days: 30,
      },
    ],
  },
];

/** ASL BELGI offline cache (72h TTL) */
export const aslCache = new Map([
  ['0104600123456789', { valid: true, product_id: products[0]?.id, cached_at: new Date().toISOString(), offline: false }],
  ['0104600987654321', { valid: true, product_id: products[1]?.id, cached_at: new Date().toISOString(), offline: false }],
]);

export const iotReadings = [];
export const iotAlerts = [
  {
    id: 'iot-1',
    type: 'thermal_bag',
    device_id: 'TB-C-001',
    temperature_c: 9.2,
    threshold_c: 8,
    duration_minutes: 18,
    severity: 'critical',
    order_id: '00000000-0000-4000-8000-000000001004',
    created_at: new Date().toISOString(),
  },
  {
    id: 'iot-2',
    type: 'thermal_bag',
    device_id: 'TB-A-014',
    temperature_c: 13.1,
    threshold_c: 12,
    duration_minutes: 22,
    severity: 'warning',
    order_id: '00000000-0000-4000-8000-000000001003',
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
];

export const inventoryCounts = [
  {
    id: 'inv-001',
    zone: 'B',
    status: 'scheduled',
    scheduled_at: new Date().toISOString(),
    items_total: 120,
    items_counted: 0,
  },
  {
    id: 'inv-002',
    zone: 'A',
    status: 'in_progress',
    scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    items_total: 80,
    items_counted: 45,
  },
];

export const writeoffs = [
  {
    id: 'wo-demo-1',
    sku_id: '00000000-0000-4000-8000-000000000003',
    quantity: 2,
    reason: 'Бой при транспортировке — Молоко',
    status: 'pending_director',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'wo-demo-2',
    sku_id: '00000000-0000-4000-8000-000000000012',
    quantity: 1,
    reason: 'Истёк срок годности — Яблоко',
    status: 'pending_director',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export function createWmsState() {
  return {
    cells: buildCells(),
    receipts: new Map(),
    placements: [],
    pendingPlacements: [],
    inventoryCounts: [...inventoryCounts],
    writeoffs: [...writeoffs],
    purchaseOrders: [...purchaseOrders],
  };
}

export function recommendCells(cells, zone, weightKg = 5) {
  return cells
    .filter((c) => c.zone === zone && c.occupied_kg + weightKg <= c.capacity_kg)
    .sort((a, b) => a.occupied_kg - b.occupied_kg)
    .slice(0, 3)
    .map((c) => ({ cell_id: c.id, cell_code: c.code, zone: c.zone }));
}

export function verifyAsl(code, productId) {
  const cached = aslCache.get(code);
  if (cached) {
    const ageHours = (Date.now() - new Date(cached.cached_at).getTime()) / 3600000;
    if (ageHours <= 72) {
      return {
        valid: cached.valid && (!productId || cached.product_id === productId),
        offline: true,
        cached_at: cached.cached_at,
      };
    }
  }
  // Mock online verify
  const valid = code.startsWith('0104600') && code.length >= 13;
  if (valid) {
    aslCache.set(code, { valid: true, product_id: productId, cached_at: new Date().toISOString(), offline: false });
  }
  return { valid, offline: false, cached_at: new Date().toISOString() };
}

export function recordIotReading(reading) {
  iotReadings.push({ ...reading, id: randomUUID(), received_at: new Date().toISOString() });
  if (reading.temperature_c > reading.threshold_c && reading.duration_minutes >= 15) {
    iotAlerts.unshift({
      id: randomUUID(),
      type: reading.type || 'thermal_bag',
      device_id: reading.device_id,
      temperature_c: reading.temperature_c,
      threshold_c: reading.threshold_c,
      duration_minutes: reading.duration_minutes,
      severity: 'critical',
      order_id: reading.order_id,
      created_at: new Date().toISOString(),
    });
  }
}

export { DARKSTORE_ID };
