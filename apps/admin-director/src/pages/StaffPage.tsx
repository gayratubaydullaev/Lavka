import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, DARKSTORE_ID, DataTable } from '@jomboy/ui-web';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  online: boolean;
  rating: number;
  zone_certifications: string[];
  shift_started_at?: string | null;
}

export function StaffPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api<{ staff: StaffMember[] }>(`/admin/staff?darkstore_id=${DARKSTORE_ID}`),
  });

  const shift = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' }) =>
      api(`/admin/staff/${id}/shift`, { method: 'PATCH', body: JSON.stringify({ action }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });

  return (
    <div>
      <h1>Персонал — смены</h1>
      <DataTable
        data={data?.staff ?? []}
        columns={[
          { key: 'name', header: 'Имя' },
          { key: 'role', header: 'Роль' },
          { key: 'online', header: 'Online', render: (r) => (r.online ? '🟢' : '⚫') },
          { key: 'rating', header: 'Рейтинг' },
          { key: 'zones', header: 'Сертификации', render: (r) => r.zone_certifications.join(', ') || '—' },
          {
            key: 'shift',
            header: 'Смена',
            render: (r) => (
              <button
                type="button"
                onClick={() => shift.mutate({ id: r.id, action: r.online ? 'stop' : 'start' })}
              >
                {r.online ? 'Завершить' : 'Начать'}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
