import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DARKSTORE_ID, DataTable, OrderStatusBadge, type Order } from '@jomboy/ui-web';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  online: boolean;
}

export function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [reassignOrderId, setReassignOrderId] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState('p1');
  const [courierId, setCourierId] = useState('c1');
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () =>
      api<{ orders: Order[] }>(`/admin/orders${statusFilter ? `?status=${statusFilter}` : ''}`),
    refetchInterval: 3000,
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff-reassign'],
    queryFn: () => api<{ staff: StaffMember[] }>(`/admin/staff?darkstore_id=${DARKSTORE_ID}`),
  });

  const reassign = useMutation({
    mutationFn: ({ orderId, picker_id, courier_id }: { orderId: string; picker_id: string; courier_id: string }) =>
      api(`/admin/orders/${orderId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ picker_id, courier_id }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setReassignOrderId(null);
    },
  });

  const pickers = (staffData?.staff ?? []).filter((s) => s.role === 'picker');
  const couriers = (staffData?.staff ?? []).filter((s) => s.role === 'courier');
  const orders = data?.orders ?? [];

  return (
    <div>
      <h1>Заказы</h1>
      <div style={{ marginBottom: 16 }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Все статусы</option>
          {['NEW', 'ACCEPTED', 'ASSEMBLY', 'READY', 'IN_DELIVERY', 'DELIVERED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <DataTable
        data={orders}
        columns={[
          { key: 'id', header: 'ID', render: (r) => r.id.slice(0, 8) },
          { key: 'status', header: 'Статус', render: (r) => <OrderStatusBadge status={r.status} /> },
          { key: 'total_amount', header: 'Сумма', render: (r) => `${r.total_amount.toLocaleString()} сум` },
          { key: 'eta', header: 'ETA', render: (r) => (r.eta_minutes ? `${r.eta_minutes} мин` : '—') },
          {
            key: 'actions',
            header: 'Действия',
            render: (r) => (
              <button type="button" onClick={() => setReassignOrderId(r.id)}>
                Назначить
              </button>
            ),
          },
        ]}
      />

      {reassignOrderId && (
        <div className="card" style={{ marginTop: 16, maxWidth: 400 }}>
          <h3>Назначение — {reassignOrderId.slice(0, 8)}</h3>
          <label>
            Сборщик
            <select value={pickerId} onChange={(e) => setPickerId(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8 }}>
              {pickers.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.online ? '🟢' : ''}</option>
              ))}
            </select>
          </label>
          <label>
            Курьер
            <select value={courierId} onChange={(e) => setCourierId(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8 }}>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.online ? '🟢' : ''}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => reassign.mutate({ orderId: reassignOrderId, picker_id: pickerId, courier_id: courierId })}>
            Сохранить
          </button>
          <button type="button" className="secondary" onClick={() => setReassignOrderId(null)} style={{ marginLeft: 8 }}>
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}
