import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DARKSTORE_ID, DataTable, formatUzs } from '@jomboy/ui-web';

interface InventoryItem {
  id: string;
  name: Record<string, string>;
  price: number;
  stock: number;
  active: boolean;
  zone: string;
  brand?: string;
}

export function AssortmentPage() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editStock, setEditStock] = useState(0);

  const { data } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api<{ items: InventoryItem[] }>(`/admin/inventory?darkstore_id=${DARKSTORE_ID}`),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api(`/admin/inventory/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const savePrice = useMutation({
    mutationFn: ({ id, price, stock }: { id: string; price: number; stock: number }) =>
      api(`/admin/inventory/${id}`, { method: 'PATCH', body: JSON.stringify({ price, stock }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setEditId(null);
    },
  });

  const exportCsv = () => {
    const items = data?.items ?? [];
    const csv = [
      'id,name_ru,price,stock,zone,brand,active',
      ...items.map((i) =>
        [i.id, i.name.ru ?? '', i.price, i.stock, i.zone, i.brand ?? '', i.active].join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'assortment.csv';
    a.click();
  };

  const importCsv = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.trim().split('\n').slice(1);
      for (const line of lines.slice(0, 20)) {
        const [id, , price, stock] = line.split(',');
        if (id && price) {
          await api(`/admin/inventory/${id}`, { method: 'PATCH', body: JSON.stringify({ price: Number(price), stock: Number(stock) || 0 }) });
        }
      }
      qc.invalidateQueries({ queryKey: ['inventory'] });
    };
    input.click();
  };

  return (
    <div>
      <h1>Ассортимент</h1>
      <div style={{ marginBottom: 16 }}>
        <button type="button" className="secondary" onClick={importCsv}>Импорт CSV</button>{' '}
        <button type="button" onClick={exportCsv}>Экспорт CSV</button>
      </div>
      <DataTable
        data={data?.items ?? []}
        columns={[
          { key: 'name', header: 'Название', render: (r) => r.name.ru ?? r.name.en },
          { key: 'price', header: 'Цена', render: (r) => formatUzs(r.price) },
          { key: 'stock', header: 'Остаток' },
          { key: 'zone', header: 'Зона' },
          {
            key: 'edit',
            header: 'Редакт.',
            render: (r) => (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setEditId(r.id);
                  setEditPrice(r.price);
                  setEditStock(r.stock);
                }}
              >
                ✎
              </button>
            ),
          },
          {
            key: 'active',
            header: 'Активен',
            render: (r) => (
              <button type="button" className="secondary" onClick={() => toggleActive.mutate({ id: r.id, active: !r.active })}>
                {r.active ? 'Деактивировать' : 'Активировать'}
              </button>
            ),
          },
        ]}
      />

      {editId && (
        <div className="card" style={{ marginTop: 16, maxWidth: 320 }}>
          <h3>Редактирование SKU</h3>
          <input type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} placeholder="Цена" style={{ width: '100%', marginBottom: 8 }} />
          <input type="number" value={editStock} onChange={(e) => setEditStock(Number(e.target.value))} placeholder="Остаток" style={{ width: '100%', marginBottom: 8 }} />
          <button type="button" onClick={() => savePrice.mutate({ id: editId, price: editPrice, stock: editStock })}>Сохранить</button>
        </div>
      )}
    </div>
  );
}
