import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@jomboy/ui-web';
import { statusChipClass } from '../wms-utils';

interface InventoryCount {
  id: string;
  zone: string;
  status: string;
  items_total: number;
  items_counted: number;
  variance_pct?: number;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Запланирован',
  in_progress: 'В процессе',
  completed: 'Завершён',
};

export function InventoryPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState<{ variance_pct: number; passed: boolean } | null>(null);

  const { data } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: () => api<{ counts: InventoryCount[] }>('/admin/warehouse/inventory/counts'),
    refetchInterval: 5000,
  });

  const start = useMutation({
    mutationFn: (id: string) =>
      api(`/admin/warehouse/inventory/counts/${id}/start`, { method: 'POST' }),
    onSuccess: (_, id) => {
      setActiveId(id);
      setResult(null);
      qc.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  const scan = useMutation({
    mutationFn: () =>
      api(`/admin/warehouse/inventory/counts/${activeId}/scan`, {
        method: 'POST',
        body: JSON.stringify({ barcode, quantity: 1 }),
      }),
    onSuccess: () => {
      setBarcode('');
      qc.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  const complete = useMutation({
    mutationFn: () =>
      api<{ variance_pct: number; passed: boolean }>(
        `/admin/warehouse/inventory/counts/${activeId}/complete`,
        { method: 'POST' },
      ),
    onSuccess: (res) => {
      setResult(res);
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  const counts = data?.counts ?? [];
  const active = counts.find((c) => c.id === activeId);
  const progress = active && active.items_total > 0
    ? (active.items_counted / active.items_total) * 100
    : 0;

  return (
    <div className="wms-page">
      <h1>Инвентаризация</h1>
      <p className="wms-muted" style={{ marginBottom: 16 }}>
        Циклический пересчёт по зонам A–F. Допустимое расхождение &lt; 2%.
      </p>

      {result && (
        <div className={`card wms-alert ${result.passed ? 'wms-alert--ok' : ''}`}>
          Пересчёт завершён: расхождение <strong>{result.variance_pct.toFixed(1)}%</strong>
          {result.passed ? ' — в норме ✓' : ' — требуется проверка директора'}
        </div>
      )}

      <div className="card">
        <h3>Плановые пересчёты</h3>
        {counts.map((c) => (
          <div key={c.id} className="wms-item wms-row">
            <div>
              <span className={statusChipClass(c.status)}>{STATUS_LABEL[c.status] ?? c.status}</span>{' '}
              <strong>Зона {c.zone}</strong>
              <div className="wms-muted" style={{ fontSize: 14, marginTop: 4 }}>
                {c.items_counted}/{c.items_total} позиций
                {c.variance_pct != null && ` · расхождение ${c.variance_pct.toFixed(1)}%`}
              </div>
              {c.status === 'in_progress' && (
                <div className="wms-progress">
                  <div
                    className="wms-progress__bar"
                    style={{ width: `${(c.items_counted / c.items_total) * 100}%` }}
                  />
                </div>
              )}
            </div>
            {c.status === 'scheduled' && (
              <button type="button" onClick={() => start.mutate(c.id)}>Начать</button>
            )}
            {c.status === 'in_progress' && activeId !== c.id && (
              <button type="button" className="secondary" onClick={() => { setActiveId(c.id); setResult(null); }}>
                Продолжить
              </button>
            )}
          </div>
        ))}
      </div>

      {active && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Пересчёт зоны {active.zone}</h3>
          <p>{active.items_counted} / {active.items_total} позиций</p>
          <div className="wms-progress">
            <div className="wms-progress__bar" style={{ width: `${progress}%` }} />
          </div>
          <input
            className="wms-field wms-field--scan"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Скан штрихкода"
            onKeyDown={(e) => e.key === 'Enter' && barcode && scan.mutate()}
          />
          <button type="button" className="wms-btn-block" onClick={() => scan.mutate()} disabled={!barcode}>
            +1 позиция
          </button>
          <button
            type="button"
            className="wms-btn-block secondary"
            onClick={() => complete.mutate()}
            style={{ marginTop: 8 }}
          >
            Завершить пересчёт
          </button>
        </div>
      )}
    </div>
  );
}
