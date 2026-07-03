import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@jomboy/ui-web';
import { loadPlacementsLocal, savePlacementsLocal, type PlacementRec } from '../wms-utils';

interface Cell {
  id: string;
  code: string;
  zone: string;
  occupied_kg: number;
  capacity_kg: number;
}

export function PlacementPage() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PlacementRec[]>([]);
  const [selected, setSelected] = useState<PlacementRec | null>(null);
  const [cellScan, setCellScan] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: pendingData, refetch } = useQuery({
    queryKey: ['placement-pending'],
    queryFn: () => api<{ pending: PlacementRec[] }>('/admin/warehouse/placement/pending'),
    refetchInterval: 8000,
  });

  const { data: cellsData } = useQuery({
    queryKey: ['wms-cells', selected?.zone],
    queryFn: () =>
      api<{ cells: Cell[] }>(
        selected ? `/wms/cells?zone=${selected.zone}` : '/wms/cells',
      ),
    enabled: !!selected,
  });

  useEffect(() => {
    const fromApi = pendingData?.pending ?? [];
    const fromLocal = loadPlacementsLocal();
    const merged = [...fromApi];
    for (const p of fromLocal) {
      if (!merged.some((m) => m.barcode === p.barcode)) merged.push(p);
    }
    setPending(merged);
  }, [pendingData]);

  const cells = cellsData?.cells ?? [];

  const confirmPlacement = async () => {
    if (!selected || !cellScan) return;
    setError('');
    try {
      await api('/admin/warehouse/placement', {
        method: 'POST',
        body: JSON.stringify({
          sku_id: selected.sku_id,
          barcode: selected.barcode,
          cell_code: cellScan,
        }),
      });
      const next = pending.filter((x) => x.barcode !== selected.barcode);
      setPending(next);
      savePlacementsLocal(next);
      setMessage(`✓ ${selected.barcode} → ${cellScan}`);
      setSelected(null);
      setCellScan('');
      refetch();
      qc.invalidateQueries({ queryKey: ['placement-pending'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ячейка не найдена');
    }
  };

  const recommended = selected
    ? cells.filter((c) => c.zone === selected.zone).slice(0, 5)
    : [];

  return (
    <div className="wms-page">
      <h1>Размещение на склад</h1>
      <p className="wms-muted" style={{ marginBottom: 16 }}>
        Сканируйте ячейку зоны A–F. Рекомендации формируются после приёмки PO.
      </p>

      {message && <div className="card wms-alert wms-alert--ok">{message}</div>}
      {error && <div className="card wms-alert">{error}</div>}

      <div className="card">
        <h3>Очередь размещения ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="wms-muted">
            Нет позиций. Завершите{' '}
            <Link to="/">приёмку PO</Link> или дождитесь поставки.
          </p>
        ) : (
          pending.map((p) => (
            <button
              key={`${p.barcode}-${p.cell_code}`}
              type="button"
              className={`wms-btn-block secondary${selected?.barcode === p.barcode ? '' : ''}`}
              onClick={() => {
                setSelected(p);
                setCellScan(p.cell_code);
                setError('');
              }}
              style={{
                textAlign: 'left',
                marginBottom: 8,
                border: selected?.barcode === p.barcode ? '2px solid var(--color-primary)' : undefined,
              }}
            >
              <strong>{p.barcode}</strong>
              <span className="wms-muted"> → рекомендуется {p.cell_code} (зона {p.zone})</span>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Разместить: {selected.barcode}</h3>
          <p>Зона <strong>{selected.zone}</strong> · рекомендуемая ячейка <strong>{selected.cell_code}</strong></p>

          {recommended.length > 0 && (
            <>
              <p className="wms-muted">Свободные ячейки:</p>
              <div className="wms-btn-row">
                {recommended.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="secondary"
                    onClick={() => setCellScan(c.code)}
                  >
                    {c.code} ({c.occupied_kg}/{c.capacity_kg} кг)
                  </button>
                ))}
              </div>
            </>
          )}

          <input
            className="wms-field wms-field--scan"
            value={cellScan}
            onChange={(e) => setCellScan(e.target.value.toUpperCase())}
            placeholder="Скан ячейки (напр. B-01)"
            onKeyDown={(e) => e.key === 'Enter' && confirmPlacement()}
          />
          <button type="button" className="wms-btn-block" onClick={confirmPlacement}>
            Подтвердить размещение
          </button>
        </div>
      )}

      {pending.length === 0 && message && (
        <div className="card wms-alert wms-alert--ok" style={{ marginTop: 16 }}>
          Все позиции размещены. Можно перейти к{' '}
          <Link to="/inventory">инвентаризации</Link>.
        </div>
      )}
    </div>
  );
}
