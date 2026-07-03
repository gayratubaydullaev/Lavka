import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, KpiCard, formatUzs, type FraudStats, type BlockedOrder } from '@jomboy/ui-web';

export function AntifraudPage() {
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['fraud-stats'],
    queryFn: () => api<FraudStats>('/admin/fraud/stats'),
    refetchInterval: 10000,
  });

  const { data: blocked } = useQuery({
    queryKey: ['fraud-blocked'],
    queryFn: () => api<{ blocked_orders: BlockedOrder[] }>('/admin/fraud/blocked-orders?status=blocked'),
    refetchInterval: 10000,
  });

  const unblock = useMutation({
    mutationFn: (id: string) => api(`/admin/fraud/blocked-orders/${id}/unblock`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fraud-blocked'] });
      qc.invalidateQueries({ queryKey: ['fraud-stats'] });
    },
  });

  return (
    <div>
      <h1>Антифрод</h1>
      <div className="kpi-grid">
        <KpiCard label="Blocked" value={stats?.blocked_count ?? 0} alert={(stats?.blocked_count ?? 0) > 0} />
        <KpiCard label="Flagged" value={stats?.flagged_count ?? 0} />
        <KpiCard label="False positive" value={`${Math.round((stats?.false_positive_rate ?? 0) * 100)}%`} />
        <KpiCard label="Fraud loss GMV" value={`${stats?.fraud_loss_gmv_pct ?? 0}%`} />
      </div>

      <h2>Заблокированные заказы</h2>
      <div className="card">
        {(blocked?.blocked_orders ?? []).length === 0 ? (
          <p>Нет блокировок</p>
        ) : (
          blocked?.blocked_orders.map((b) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{b.reason}</strong> — {formatUzs(b.amount)}
                <div style={{ fontSize: 12, color: '#757575' }}>{b.customer_id} • {new Date(b.created_at).toLocaleString()}</div>
              </div>
              <button type="button" onClick={() => unblock.mutate(b.id)}>Разблокировать</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
