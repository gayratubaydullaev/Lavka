import { useQuery } from '@tanstack/react-query';
import { api, DARKSTORE_ID, KpiCard, type DashboardData } from '@jomboy/ui-web';

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>(`/admin/darkstores/${DARKSTORE_ID}/dashboard`),
    refetchInterval: 5000,
  });

  if (isLoading) return <p>Загрузка...</p>;

  return (
    <div>
      <h1>Дашборд даркстора</h1>
      <div className="kpi-grid">
        <KpiCard label="Активные заказы" value={data?.active_orders ?? 0} />
        <KpiCard label="Сборщики online" value={data?.pickers_online ?? 0} />
        <KpiCard label="Курьеры на маршруте" value={data?.couriers_on_route ?? 0} />
        <KpiCard label="Заказов сегодня" value={data?.orders_today ?? 0} />
        <KpiCard label="Среднее время сборки" value={`${data?.avg_assembly_minutes ?? 0} мин`} />
      </div>
      <h2>Алерты</h2>
      <div className="card">
        {(data?.alerts ?? []).map((a) => (
          <div
            key={a.id}
            className={`wms-row${a.type === 'iot_temperature' ? ' wms-row--alert' : ''}`}
          >
            <strong className={`status-badge status-badge--${a.severity === 'critical' ? 'delivered' : 'assembly'}`}>
              {a.severity}
            </strong>{' '}
            {a.type === 'iot_temperature' && '🌡 '}
            {a.message}
          </div>
        ))}
      </div>
    </div>
  );
}
