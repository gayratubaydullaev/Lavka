import { randomUUID } from 'crypto';
import {
  verifyAsl,
  recommendCells,
  recordIotReading,
  iotAlerts,
} from './wms-data.js';

export function registerWmsRoutes(app, wms, state) {
  // Purchase orders
  app.get('/api/v1/wms/purchase-orders', (req, res) => {
    let list = wms.purchaseOrders;
    if (req.query.status) list = list.filter((po) => po.status === req.query.status);
    res.json({ purchase_orders: list });
  });

  // Storage cells
  app.get('/api/v1/wms/cells', (req, res) => {
    let cells = wms.cells;
    if (req.query.zone) cells = cells.filter((c) => c.zone === req.query.zone);
    res.json({ cells });
  });

  // ASL BELGI verify (Phase 2)
  app.post('/api/v1/catalog/asl-belgisi/verify', (req, res) => {
    const { code, product_id } = req.body;
    if (!code) return res.status(400).json({ code: 'INVALID', message: 'code required' });
    const result = verifyAsl(code, product_id);
    if (!result.valid && req.body.require_online !== false) {
      return res.status(422).json({ ...result, message: 'Маркировка не прошла проверку АСЛ БЕЛГИ' });
    }
    res.json(result);
  });

  // Enhanced receipt flow
  app.post('/api/v1/admin/warehouse/receipts', (req, res) => {
    const po = wms.purchaseOrders.find((p) => p.id === req.body.po_number);
    if (!po) {
      return res.status(404).json({ code: 'PO_NOT_FOUND', message: 'Purchase order not found' });
    }
    const id = randomUUID();
    const receipt = {
      id,
      po_number: po.id,
      supplier: po.supplier,
      status: 'in_progress',
      scanned: [],
      discrepancies: [],
      frozen_temp_c: null,
    };
    wms.receipts.set(id, receipt);
    res.status(201).json({
      receipt_id: id,
      po_number: po.id,
      supplier: po.supplier,
      expected_items: po.items,
    });
  });

  app.post('/api/v1/admin/warehouse/receipts/:receipt_id/scan', (req, res) => {
    const receipt = wms.receipts.get(req.params.receipt_id);
    if (!receipt) return res.status(404).json({ code: 'NOT_FOUND' });

    const { barcode, quantity, expiry_date, asl_code, damage, damage_photo_url } = req.body;
    const po = wms.purchaseOrders.find((p) => p.id === receipt.po_number);
    const expected = po?.items.find((i) => i.barcode === barcode);

    if (!expected) {
      return res.status(400).json({ code: 'BARCODE_NOT_IN_PO', message: 'Штрихкод не найден в PO' });
    }

    if (expected.is_marked && asl_code) {
      const asl = verifyAsl(asl_code, expected.sku_id);
      if (!asl.valid) {
        return res.status(422).json({ code: 'ASL_INVALID', message: 'АСЛ БЕЛГИ: код недействителен', asl });
      }
    } else if (expected.is_marked && !asl_code) {
      return res.status(422).json({ code: 'ASL_REQUIRED', message: 'Требуется скан маркировки АСЛ БЕЛГИ' });
    }

    if (expected.zone === 'A' && expiry_date) {
      const daysLeft = (new Date(expiry_date).getTime() - Date.now()) / 86400000;
      if (daysLeft < expected.min_expiry_days) {
        return res.status(422).json({
          code: 'EXPIRY_TOO_SHORT',
          message: `Срок годности < ${expected.min_expiry_days} дней для зоны A`,
        });
      }
    }

    const qty = quantity ?? expected.expected_qty;
    const discrepancyPct = Math.abs(qty - expected.expected_qty) / expected.expected_qty * 100;
    if (discrepancyPct > 5) {
      receipt.discrepancies.push({
        sku_id: expected.sku_id,
        expected: expected.expected_qty,
        received: qty,
        pct: discrepancyPct,
        escalated: true,
      });
    }

    receipt.scanned.push({
      barcode,
      sku_id: expected.sku_id,
      quantity: qty,
      expiry_date,
      asl_code,
      damage: damage ?? false,
      damage_photo_url,
    });

    res.json({
      ok: true,
      scanned_count: receipt.scanned.length,
      discrepancy: discrepancyPct > 5,
      escalate_to_director: discrepancyPct > 5,
    });
  });

  app.post('/api/v1/admin/warehouse/receipts/:receipt_id/frozen-temp', (req, res) => {
    const receipt = wms.receipts.get(req.params.receipt_id);
    if (!receipt) return res.status(404).json({ code: 'NOT_FOUND' });
    const temp = req.body.temperature_c;
    if (temp > -15) {
      return res.status(422).json({ code: 'TEMP_TOO_HIGH', message: 'Температура заморозки должна быть ≤ −15°C' });
    }
    receipt.frozen_temp_c = temp;
    res.json({ ok: true, frozen_temp_c: temp });
  });

  app.post('/api/v1/admin/warehouse/receipts/:receipt_id/complete', (req, res) => {
    const receipt = wms.receipts.get(req.params.receipt_id);
    if (!receipt) return res.status(404).json({ code: 'NOT_FOUND' });

    const hasFrozen = receipt.scanned.some((s) => {
      const po = wms.purchaseOrders.find((p) => p.id === receipt.po_number);
      const item = po?.items.find((i) => i.barcode === s.barcode);
      return item?.zone === 'C';
    });
    if (hasFrozen && receipt.frozen_temp_c === null) {
      return res.status(422).json({ code: 'FROZEN_TEMP_REQUIRED', message: 'Укажите температуру при приёмке заморозки' });
    }

    receipt.status = 'completed';
    const po = wms.purchaseOrders.find((p) => p.id === receipt.po_number);
    po.status = 'received';

    const recommendations = receipt.scanned.flatMap((s) => {
      const item = po?.items.find((i) => i.barcode === s.barcode);
      return recommendCells(wms.cells, item?.zone ?? 'B').map((r) => ({ ...r, sku_id: s.sku_id, barcode: s.barcode }));
    });

    for (const rec of recommendations) {
      if (!wms.pendingPlacements.some((p) => p.barcode === rec.barcode && p.cell_code === rec.cell_code)) {
        wms.pendingPlacements.push({ ...rec, receipt_id: receipt.id });
      }
    }

    // Update stock in catalog mock
    receipt.scanned.forEach((s) => {
      const product = state.products.find((p) => p.id === s.sku_id);
      if (product) product.stock += s.quantity;
    });

    res.json({ ok: true, status: 'completed', placement_recommendations: recommendations });
  });

  // Placement
  app.post('/api/v1/admin/warehouse/placement', (req, res) => {
    const { sku_id, cell_code, barcode } = req.body;
    const cell = wms.cells.find((c) => c.code === cell_code);
    if (!cell) return res.status(404).json({ code: 'CELL_NOT_FOUND' });

    wms.placements.push({
      id: randomUUID(),
      sku_id,
      barcode,
      cell_id: cell.id,
      cell_code,
      placed_at: new Date().toISOString(),
      confirmed: true,
    });
    cell.occupied_kg += 5;
    wms.pendingPlacements = wms.pendingPlacements.filter((p) => p.barcode !== barcode);
    res.json({ ok: true, cell_code, zone: cell.zone });
  });

  app.get('/api/v1/admin/warehouse/placement/pending', (req, res) => {
    res.json({ pending: wms.pendingPlacements });
  });

  // Inventory (cyclical counts)
  app.get('/api/v1/admin/warehouse/inventory/counts', (req, res) => {
    res.json({ counts: wms.inventoryCounts });
  });

  app.post('/api/v1/admin/warehouse/inventory/counts/:count_id/start', (req, res) => {
    const count = wms.inventoryCounts.find((c) => c.id === req.params.count_id);
    if (!count) return res.status(404).json({ code: 'NOT_FOUND' });
    count.status = 'in_progress';
    count.scans = count.scans ?? [];
    res.json(count);
  });

  app.post('/api/v1/admin/warehouse/inventory/counts/:count_id/scan', (req, res) => {
    const count = wms.inventoryCounts.find((c) => c.id === req.params.count_id);
    if (!count) return res.status(404).json({ code: 'NOT_FOUND' });
    count.scans = count.scans ?? [];
    count.scans.push({ barcode: req.body.barcode, quantity: req.body.quantity ?? 1 });
    count.items_counted = count.scans.length;
    res.json({ ok: true, items_counted: count.items_counted, items_total: count.items_total });
  });

  app.post('/api/v1/admin/warehouse/inventory/counts/:count_id/complete', (req, res) => {
    const count = wms.inventoryCounts.find((c) => c.id === req.params.count_id);
    if (!count) return res.status(404).json({ code: 'NOT_FOUND' });
    const variancePct = count.items_total > 0
      ? Math.abs(count.items_total - count.items_counted) / count.items_total * 100
      : 0;
    count.status = 'completed';
    count.variance_pct = variancePct;
    res.json({ ok: true, variance_pct: variancePct, passed: variancePct < 2 });
  });

  // Write-offs
  app.get('/api/v1/admin/warehouse/writeoffs', (req, res) => {
    res.json({ writeoffs: wms.writeoffs });
  });

  app.post('/api/v1/admin/warehouse/writeoffs', (req, res) => {
    const wo = {
      id: randomUUID(),
      sku_id: req.body.sku_id,
      quantity: req.body.quantity,
      reason: req.body.reason,
      photo_url: req.body.photo_url,
      status: 'pending_director',
      created_at: new Date().toISOString(),
    };
    wms.writeoffs.unshift(wo);
    res.status(201).json(wo);
  });

  app.post('/api/v1/admin/warehouse/writeoffs/:id/approve', (req, res) => {
    const wo = wms.writeoffs.find((w) => w.id === req.params.id);
    if (!wo) return res.status(404).json({ code: 'NOT_FOUND' });
    wo.status = 'approved';
    wo.director_signature = req.body.signature;
    wo.approved_at = new Date().toISOString();
    const product = state.products.find((p) => p.id === wo.sku_id);
    if (product) product.stock = Math.max(0, product.stock - wo.quantity);
    res.json(wo);
  });

  // IoT
  app.get('/api/v1/admin/warehouse/iot/alerts', (req, res) => {
    res.json({ alerts: iotAlerts });
  });

  app.post('/api/v1/admin/warehouse/iot/readings', (req, res) => {
    const readings = req.body.readings ?? [req.body];
    readings.forEach(recordIotReading);
    res.json({ ok: true, count: readings.length });
  });

  app.post('/api/v1/courier/iot/temperature', (req, res) => {
    recordIotReading({
      type: 'thermal_bag',
      device_id: req.body.device_id ?? 'TB-C-001',
      temperature_c: req.body.temperature_c,
      threshold_c: req.body.threshold_c ?? 8,
      duration_minutes: req.body.duration_minutes ?? 0,
      order_id: req.body.order_id,
    });
    res.json({ ok: true });
  });
}
