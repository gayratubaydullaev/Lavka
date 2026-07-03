import { useQuery } from '@tanstack/react-query';
import { api, KpiCard, formatUzs, type Darkstore } from '@jomboy/ui-web';

export function DarkstoresPage() {
  const { data } = useQuery({
    queryKey: ['darkstores'],
    queryFn: () => api<{ darkstores: Darkstore[] }>('/darkstores'),
    refetchInterval: 15000,
  });

  const stores = data?.darkstores ?? [];

  return (
    <div>
      <h1>Дарксторы</h1>
      <p style={{ color: '#757575', marginBottom: 16 }}>Ташкент + Самарканд (2 города)</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {stores.map((ds) => (
          <div key={ds.id} className="card">
            <h3>{ds.city_ru ?? ds.city}</h3>
            <p style={{ fontSize: 13, color: '#757575' }}>{ds.name} • радиус {ds.radius_km} км</p>
            <div className="kpi-grid" style={{ marginTop: 12 }}>
              <KpiCard label="SKU" value={ds.sku_count} />
              <KpiCard label="Заказов сегодня" value={ds.orders_today ?? 0} />
              <KpiCard label="GMV сегодня" value={formatUzs(ds.gmv_today ?? 0)} />
              <KpiCard label="Активные" value={ds.active_orders ?? 0} />
            </div>
            <p style={{ fontSize: 11, color: '#757575', marginTop: 8 }}>ID: {ds.id.slice(0, 8)}…</p>
          </div>
        ))}
      </div>
    </div>
  );
}
