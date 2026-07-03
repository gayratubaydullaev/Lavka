import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DARKSTORE_ID } from '@jomboy/ui-web';
import { statusChipClass } from '../wms-utils';

interface Writeoff {
  id: string;
  sku_id: string;
  quantity: number;
  reason: string;
  photo_url?: string;
  status: string;
  created_at: string;
}

interface InventoryItem {
  id: string;
  name: Record<string, string>;
  stock: number;
  barcode?: string;
}

const REASONS = ['Брак', 'Просрочка', 'Порча', 'Недостача при инвентаризации'];

const STATUS_LABEL: Record<string, string> = {
  pending_director: 'Ожидает директора',
  approved: 'Подписано',
};

export function WriteoffPage() {
  const qc = useQueryClient();
  const [skuId, setSkuId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(REASONS[0]);
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');

  const { data: inventory } = useQuery({
    queryKey: ['inventory-writeoff'],
    queryFn: () => api<{ items: InventoryItem[] }>(`/admin/inventory?darkstore_id=${DARKSTORE_ID}`),
  });

  const { data: writeoffs } = useQuery({
    queryKey: ['writeoffs'],
    queryFn: () => api<{ writeoffs: Writeoff[] }>('/admin/warehouse/writeoffs'),
    refetchInterval: 5000,
  });

  const create = useMutation({
    mutationFn: () =>
      api('/admin/warehouse/writeoffs', {
        method: 'POST',
        body: JSON.stringify({
          sku_id: skuId,
          quantity,
          reason: `${reason}${selectedItem ? ` — ${selectedItem.name.ru}` : ''}`,
          photo_url: `mock://photo/writeoff-${Date.now()}.jpg`,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['writeoffs'] });
      setSkuId('');
      setSuccess('Списание создано — отправлено директору на подпись');
      setTimeout(() => setSuccess(''), 5000);
    },
  });

  const items = (inventory?.items ?? []).filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.name.ru?.toLowerCase().includes(q) || i.id.includes(q);
  });

  const selectedItem = items.find((i) => i.id === skuId);
  const list = writeoffs?.writeoffs ?? [];

  return (
    <div className="wms-page">
      <h1>Списания</h1>
      <p className="wms-muted" style={{ marginBottom: 16 }}>
        Фото брака фиксируется автоматически (demo). Подпись — в{' '}
        <a href="http://localhost:5173/wms" target="_blank" rel="noreferrer">
          панели директора → WMS / IoT
        </a>
        .
      </p>

      {success && <div className="card wms-alert wms-alert--ok">{success}</div>}

      <div className="card">
        <h3>Новое списание</h3>
        <input
          className="wms-field"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск SKU по названию…"
        />
        <select
          className="wms-field"
          value={skuId}
          onChange={(e) => setSkuId(e.target.value)}
        >
          <option value="">Выберите SKU</option>
          {items.slice(0, 100).map((i) => (
            <option key={i.id} value={i.id}>
              {i.name.ru} (остаток {i.stock})
            </option>
          ))}
        </select>
        <input
          type="number"
          className="wms-field"
          min={1}
          max={selectedItem?.stock ?? 999}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
        <select className="wms-field" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          type="button"
          className="wms-btn-block"
          disabled={!skuId || quantity < 1}
          onClick={() => create.mutate()}
        >
          Создать списание
        </button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>История списаний ({list.length})</h3>
        {list.length === 0 ? (
          <p className="wms-muted">Пока нет списаний</p>
        ) : (
          list.map((w) => (
            <div key={w.id} className="wms-item">
              <span className={statusChipClass(w.status)}>{STATUS_LABEL[w.status] ?? w.status}</span>{' '}
              <strong>{w.reason}</strong> × {w.quantity}
              <div className="wms-muted" style={{ fontSize: 13, marginTop: 4 }}>
                {new Date(w.created_at).toLocaleString('ru-RU')}
                {w.photo_url && ' · 📷 фото приложено'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
