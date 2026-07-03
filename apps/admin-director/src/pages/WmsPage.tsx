import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@jomboy/ui-web';

interface Writeoff {
  id: string;
  sku_id: string;
  quantity: number;
  reason: string;
  status: string;
  created_at: string;
}

interface IotAlert {
  id: string;
  device_id: string;
  temperature_c: number;
  threshold_c: number;
  duration_minutes: number;
  severity: string;
  order_id?: string;
}

export function WmsPage() {
  const qc = useQueryClient();

  const { data: writeoffs, isError: writeoffsError } = useQuery({
    queryKey: ['director-writeoffs'],
    queryFn: () => api<{ writeoffs: Writeoff[] }>('/admin/warehouse/writeoffs'),
    refetchInterval: 5000,
  });

  const { data: iot, isError: iotError } = useQuery({
    queryKey: ['iot-alerts'],
    queryFn: () => api<{ alerts: IotAlert[] }>('/admin/warehouse/iot/alerts'),
    refetchInterval: 10000,
  });

  const approve = useMutation({
    mutationFn: (id: string) =>
      api(`/admin/warehouse/writeoffs/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ signature: `director-${Date.now()}` }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director-writeoffs'] }),
  });

  const pending = (writeoffs?.writeoffs ?? []).filter((w) => w.status === 'pending_director');
  const apiUnavailable = writeoffsError || iotError;

  return (
    <div>
      <h1>WMS / IoT</h1>

      {apiUnavailable && (
        <div className="card wms-notice wms-notice--warn" style={{ marginBottom: 16 }}>
          <strong>API недоступен</strong>
          <p style={{ margin: '8px 0 0' }}>
            WMS-эндпоинты работают на mock-сервере (<code>:4010</code>). Запустите{' '}
            <code>npm run dev</code> или переключите <code>VITE_API_BASE_URL</code> на mock.
          </p>
        </div>
      )}

      <div className="card wms-notice" style={{ marginBottom: 24 }}>
        <strong>Приёмка, размещение, инвентаризация</strong>
        <p style={{ margin: '8px 0 0' }}>
          Операции кладовщика — в{' '}
          <a href="http://localhost:5176" target="_blank" rel="noreferrer">
            панели кладовщика
          </a>
          . Здесь: мониторинг термосумок и подпись списаний директором.
        </p>
      </div>

      <h2>IoT: термосумки</h2>
      <div className="card" style={{ marginBottom: 24 }}>
        {(iot?.alerts ?? []).length === 0 ? (
          <p className="wms-muted">Нет активных температурных алертов</p>
        ) : (
          iot?.alerts.map((a) => (
            <div
              key={a.id}
              className={`wms-row${a.severity === 'critical' ? ' wms-row--alert' : ''}`}
            >
              <div>
                <span className={`status-badge status-badge--${a.severity === 'critical' ? 'delivered' : 'assembly'}`}>
                  {a.severity}
                </span>{' '}
                <strong>{a.device_id}</strong>
                <span className="wms-muted"> — {a.temperature_c}°C (порог {a.threshold_c}°C, {a.duration_minutes} мин)</span>
              </div>
              {a.order_id && (
                <span className="wms-muted">Заказ #{a.order_id.slice(0, 8)}</span>
              )}
            </div>
          ))
        )}
        <p className="wms-hint">
          Порог: &gt;8°C заморозка, &gt;12°C охлаждёнка, &gt;15 мин → эскалация директору
        </p>
      </div>

      <h2>Списания — подпись директора</h2>
      <div className="card">
        {pending.length === 0 ? (
          <p className="wms-muted">Нет списаний на подпись</p>
        ) : (
          pending.map((w) => (
            <div key={w.id} className="wms-row wms-row--action">
              <div>
                <strong>{w.reason}</strong>
                <span className="wms-muted"> × {w.quantity}</span>
                <div className="wms-muted" style={{ fontSize: 13, marginTop: 4 }}>
                  SKU {w.sku_id.slice(0, 8)}… · {new Date(w.created_at).toLocaleString('ru-RU')}
                </div>
              </div>
              <button type="button" onClick={() => approve.mutate(w.id)}>
                Подписать
              </button>
            </div>
          ))
        )}
      </div>

      <p className="wms-hint" style={{ marginTop: 16 }}>
        Создать списание: панель кладовщика → «Списание» → после создания появится здесь на подпись.
      </p>
    </div>
  );
}
