import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type TimelineEvent } from '@jomboy/ui-web';

const TYPE_LABELS: Record<string, string> = {
  status_change: 'Статус',
  geo: 'Геолокация',
  photo: 'Фото',
  barcode_scan: 'Скан',
  temperature: 'Температура',
  payment: 'Оплата',
  refund: 'Возврат',
};

export function OrderTimeline({ orderId }: { orderId: string }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['timeline', orderId],
    queryFn: () => api<{ events: TimelineEvent[] }>(`/orders/${orderId}/timeline`),
    enabled: !!orderId,
  });

  if (isLoading) return <p>Загрузка timeline...</p>;

  const events = data?.events ?? [];

  return (
    <div>
      <h3>Тайм-машина заказа</h3>
      <div style={{ borderLeft: '2px solid #2E7D32', marginLeft: 8, paddingLeft: 16 }}>
        {events.map((ev, i) => (
          <div key={i} style={{ marginBottom: 12, position: 'relative' }}>
            <div style={{ fontSize: 11, color: '#757575' }}>
              {new Date(ev.timestamp).toLocaleString()} • {ev.actor}
            </div>
            <strong>{TYPE_LABELS[ev.type] ?? ev.type}</strong>
            <div style={{ fontSize: 13 }}>
              {(ev.payload.message as string) ?? (ev.payload.status as string) ?? (ev.payload.label as string) ?? ''}
            </div>
            {Object.keys(ev.payload).length > 1 && (
              <button type="button" className="secondary" style={{ fontSize: 11, marginTop: 4 }} onClick={() => setExpanded(expanded === i ? null : i)}>
                {expanded === i ? 'Скрыть' : 'Детали'}
              </button>
            )}
            {expanded === i && (
              <pre style={{ fontSize: 10, background: '#f5f5f5', padding: 8, borderRadius: 4, overflow: 'auto' }}>
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
