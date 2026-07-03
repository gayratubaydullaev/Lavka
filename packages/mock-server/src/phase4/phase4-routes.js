import {
  DARKSTORES,
  filterByDarkstore,
  getDarkstore,
} from './darkstores.js';
import {
  buildGmvReport,
  buildCohortReport,
  buildFunnelReport,
  buildBiSummary,
} from './bi-reports.js';
import { previewTariffImpact, calculateDeliveryFee } from './tariffs.js';
import { appendAudit, listAudit, exportAuditCsv } from './audit-log.js';
import { getFraudStats, unblockOrder } from './fraud-hq.js';

export function registerPhase4Routes(app, phase4, state, hooks = {}) {
  const { onAudit } = hooks;

  // Darkstores
  app.get('/api/v1/darkstores', (req, res) => {
    const list = phase4.darkstores.map((ds) => {
      const storeOrders = state.orders.filter((o) => o.darkstore_id === ds.id);
      const today = new Date().toISOString().slice(0, 10);
      const todayOrders = storeOrders.filter((o) => o.created_at?.startsWith(today));
      return {
        ...ds,
        orders_today: todayOrders.length || storeOrders.length,
        gmv_today: todayOrders.reduce((s, o) => s + o.total_amount, 0) || storeOrders.reduce((s, o) => s + o.total_amount, 0),
        active_orders: storeOrders.filter((o) => !['DELIVERED', 'CANCELLED_BY_USER'].includes(o.status)).length,
      };
    });
    res.json({ darkstores: list });
  });

  app.get('/api/v1/darkstores/:id', (req, res) => {
    const ds = getDarkstore(req.params.id);
    if (!ds) return res.status(404).json({ code: 'NOT_FOUND' });
    res.json({
      ...ds,
      coverage: {
        type: 'circle',
        center: ds.coordinates,
        radius_km: ds.radius_km,
      },
    });
  });

  // BI reports
  app.get('/api/v1/admin/reports/gmv', (req, res) => {
    res.json(buildGmvReport(state, {
      darkstore_id: req.query.darkstore_id,
      from: req.query.from,
      to: req.query.to,
    }));
  });

  app.get('/api/v1/admin/reports/cohort', (req, res) => {
    res.json(buildCohortReport(req.query.darkstore_id));
  });

  app.get('/api/v1/admin/reports/funnel', (req, res) => {
    res.json(buildFunnelReport(req.query.darkstore_id));
  });

  app.get('/api/v1/admin/reports/bi-summary', (req, res) => {
    res.json(buildBiSummary(req.query.darkstore_id));
  });

  app.get('/api/v1/admin/reports/metabase-embed', (req, res) => {
    const ds = req.query.darkstore_id ?? 'all';
    res.json({
      embed_url: `https://mock-metabase.jomboy.uz/embed/dashboard/phase4?darkstore=${ds}&token=mock-jwt`,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });
  });

  // Tariffs
  app.get('/api/v1/admin/tariffs', (req, res) => {
    res.json({
      published: phase4.tariffs.published,
      draft: phase4.tariffs.draft,
    });
  });

  app.patch('/api/v1/admin/tariffs', (req, res) => {
    phase4.tariffs.draft = { ...phase4.tariffs.draft, ...req.body, status: 'draft' };
    res.json(phase4.tariffs.draft);
  });

  app.post('/api/v1/admin/tariffs/preview', (req, res) => {
    const draft = { ...phase4.tariffs.draft, ...req.body };
    res.json(previewTariffImpact(phase4.tariffs, draft));
  });

  app.post('/api/v1/admin/tariffs/publish', (req, res) => {
    phase4.tariffs.published = {
      ...phase4.tariffs.draft,
      status: 'published',
      published_at: new Date().toISOString(),
    };
    const entry = appendAudit(phase4.audit, {
      user_id: req.headers['x-user-id'] ?? 'hq_admin',
      action: 'tariff.publish',
      payload: phase4.tariffs.published,
    });
    onAudit?.(entry);
    res.json({ ok: true, tariffs: phase4.tariffs.published });
  });

  // Audit
  app.get('/api/v1/admin/audit', (req, res) => {
    res.json({
      entries: listAudit(phase4.audit, {
        from: req.query.from,
        to: req.query.to,
        action: req.query.action,
      }),
    });
  });

  app.get('/api/v1/admin/audit/export', (req, res) => {
    const { csv, hash } = exportAuditCsv(phase4.audit);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-worm.csv');
    res.setHeader('X-Audit-Hash', hash);
    res.send(csv);
  });

  // HQ Antifraud
  app.get('/api/v1/admin/fraud/stats', (req, res) => {
    res.json(getFraudStats(phase4.fraudHq));
  });

  app.get('/api/v1/admin/fraud/blocked-orders', (req, res) => {
    let list = phase4.fraudHq.blockedOrders;
    if (req.query.status) list = list.filter((b) => b.status === req.query.status);
    if (req.query.darkstore_id) list = list.filter((b) => b.darkstore_id === req.query.darkstore_id);
    res.json({ blocked_orders: list });
  });

  app.post('/api/v1/admin/fraud/blocked-orders/:id/unblock', (req, res) => {
    const item = unblockOrder(phase4.fraudHq, req.params.id);
    if (!item) return res.status(404).json({ code: 'NOT_FOUND' });
    const entry = appendAudit(phase4.audit, {
      user_id: req.headers['x-user-id'] ?? 'hq_admin',
      action: 'fraud.unblock',
      payload: { blocked_id: item.id, order_id: item.order_id },
    });
    onAudit?.(entry);
    res.json(item);
  });
}

export {
  filterByDarkstore,
  calculateDeliveryFee,
  appendAudit,
  DARKSTORES,
};
