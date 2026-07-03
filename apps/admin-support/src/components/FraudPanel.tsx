import { useQuery } from '@tanstack/react-query';
import { api, type FraudProfile, type Ticket } from '@jomboy/ui-web';

const REC_LABELS: Record<string, string> = {
  approve_refund: 'Рекомендация: одобрить возврат',
  escalate: 'Рекомендация: эскалация',
  block: 'Рекомендация: блокировка',
};

export function FraudPanel({ ticket }: { ticket: Ticket }) {
  const customerId = ticket.customer_id ?? 'cust-dilshod';

  const { data: profile } = useQuery({
    queryKey: ['fraud', customerId],
    queryFn: () => api<FraudProfile>(`/customers/${customerId}/fraud-profile`),
    enabled: !!customerId,
  });

  const risk = ticket.risk_score ?? profile?.risk_score ?? 0;
  const flags = ticket.fraud_flags ?? profile?.flags ?? [];
  const recommendation = ticket.fraud_recommendation ?? profile?.recommendation ?? 'approve_refund';

  const color = risk >= 70 ? '#D32F2F' : risk >= 45 ? '#F57C00' : '#2E7D32';

  return (
    <div>
      <h3>Антифрод</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', border: `4px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
        }}>
          {risk}
        </div>
        <div>
          <div>Risk score / 100</div>
          <div style={{ fontSize: 13, color: '#757575' }}>Trust: {(ticket.trust_score ?? profile?.trust_score ?? 0).toFixed(2)}</div>
        </div>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600 }}>{REC_LABELS[recommendation] ?? recommendation}</p>
      {profile && (
        <p style={{ fontSize: 12, color: '#757575' }}>
          Заказов: {profile.orders_count} • Возвратов: {profile.refunds_count} • Аккаунт: {profile.account_age_days} дн.
        </p>
      )}
      {flags.length > 0 ? (
        <ul style={{ fontSize: 12, paddingLeft: 16 }}>
          {flags.map((f) => (
            <li key={f.code} style={{ color: f.severity === 'critical' ? '#D32F2F' : undefined }}>
              {f.message}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 12, color: '#757575' }}>Флагов нет</p>
      )}
    </div>
  );
}
