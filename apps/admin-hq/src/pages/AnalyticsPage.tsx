import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  api,
  KpiCard,
  formatUzs,
  type GmvReport,
  type CohortReport,
  type FunnelStep,
  type BiSummary,
  DARKSTORE_TASHKENT,
  DARKSTORE_SAMARKAND,
} from '@jomboy/ui-web';

const STORES = [
  { id: '', label: 'Все' },
  { id: DARKSTORE_TASHKENT, label: 'Ташкент' },
  { id: DARKSTORE_SAMARKAND, label: 'Самарканд' },
];

type Tab = 'gmv' | 'cohort' | 'funnel' | 'bi';

export function AnalyticsPage() {
  const [storeId, setStoreId] = useState('');
  const [tab, setTab] = useState<Tab>('gmv');
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const qs = storeId ? `&darkstore_id=${storeId}` : '';

  const { data: gmv } = useQuery({
    queryKey: ['gmv', from, to, storeId],
    queryFn: () => api<GmvReport>(`/admin/reports/gmv?from=${from}&to=${to}${qs}`),
  });

  const { data: cohort } = useQuery({
    queryKey: ['cohort', storeId],
    queryFn: () => api<CohortReport>(`/admin/reports/cohort?${storeId ? `darkstore_id=${storeId}` : ''}`),
    enabled: tab === 'cohort',
  });

  const { data: funnel } = useQuery({
    queryKey: ['funnel', storeId],
    queryFn: () => api<{ steps: FunnelStep[] }>(`/admin/reports/funnel?${storeId ? `darkstore_id=${storeId}` : ''}`),
    enabled: tab === 'funnel',
  });

  const { data: bi } = useQuery({
    queryKey: ['bi', storeId],
    queryFn: () => api<BiSummary>(`/admin/reports/bi-summary?${storeId ? `darkstore_id=${storeId}` : ''}`),
    enabled: tab === 'bi',
  });

  const { data: metabase } = useQuery({
    queryKey: ['metabase', storeId],
    queryFn: () => api<{ embed_url: string }>(`/admin/reports/metabase-embed?${storeId ? `darkstore_id=${storeId}` : ''}`),
    enabled: tab === 'bi',
  });

  const exportCsv = () => {
    if (!gmv?.daily) return;
    const csv = ['date,gmv,orders', ...gmv.daily.map((d) => `${d.date},${d.gmv},${d.orders}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gmv-${from}-${to}.csv`;
    a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1>Аналитика</h1>
        <button type="button" onClick={exportCsv}>Экспорт CSV</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {STORES.map((s) => (
          <button key={s.id || 'all'} type="button" className={storeId === s.id ? '' : 'secondary'} onClick={() => setStoreId(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['gmv', 'cohort', 'funnel', 'bi'] as Tab[]).map((t) => (
          <button key={t} type="button" className={tab === t ? '' : 'secondary'} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
        ))}
      </div>

      {tab === 'gmv' && (
        <>
          <div className="kpi-grid">
            <KpiCard label="GMV (7 дней)" value={formatUzs(gmv?.gmv ?? 0)} />
            <KpiCard label="Заказов" value={gmv?.orders_count ?? 0} />
            <KpiCard label="AOV" value={formatUzs(gmv?.avg_order_value ?? 0)} />
            <KpiCard label="OTD %" value={`${gmv?.otd_percent ?? 0}%`} alert={(gmv?.otd_percent ?? 0) < 85} />
          </div>
          <div className="card" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gmv?.daily ?? []}>
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatUzs(v)} />
                <Bar dataKey="gmv" fill="#2E7D32" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {tab === 'cohort' && cohort && (
        <div className="card">
          <h3>Cohort retention — {cohort.label}</h3>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Cohort</th><th>Size</th>
                {cohort.weeks.map((w) => <th key={w}>{w}</th>)}
              </tr>
            </thead>
            <tbody>
              {cohort.cohorts.map((c) => (
                <tr key={c.cohort}>
                  <td>{c.cohort}</td><td>{c.size}</td>
                  {c.retention.map((r, i) => (
                    <td key={i} style={{ background: r != null ? `rgba(46,125,50,${(r ?? 0) / 120})` : undefined }}>
                      {r != null ? `${r}%` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'funnel' && funnel && (
        <div className="card" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel.steps} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="label" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#1565C0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'bi' && bi && (
        <>
          <div className="kpi-grid">
            <KpiCard label="LTV" value={formatUzs(bi.ltv_uzs)} />
            <KpiCard label="CAC" value={formatUzs(bi.cac_uzs)} />
            <KpiCard label="Retention D30" value={`${Math.round(bi.retention_d30 * 100)}%`} />
            <KpiCard label="NPS" value={bi.nps} />
          </div>
          {metabase && (
            <div className="card" style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: '#757575' }}>Metabase embed (mock)</p>
              <iframe title="metabase" src={metabase.embed_url} style={{ width: '100%', height: 200, border: '1px solid #eee' }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
