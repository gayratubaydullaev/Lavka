import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuth, type TariffConfig } from '@jomboy/ui-web';

export function TariffsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('hq_admin');
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<TariffConfig>>({});
  const [preview, setPreview] = useState<{ orders_affected_percent: number; message: string } | null>(null);

  const { data } = useQuery({
    queryKey: ['tariffs'],
    queryFn: () => api<{ published: TariffConfig; draft: TariffConfig }>('/admin/tariffs'),
  });

  const saveDraft = useMutation({
    mutationFn: (body: Partial<TariffConfig>) =>
      api('/admin/tariffs', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tariffs'] }),
  });

  const publish = useMutation({
    mutationFn: () => api('/admin/tariffs/publish', { method: 'POST', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tariffs'] }),
  });

  const t = { ...data?.published, ...data?.draft, ...draft };

  const fields: Array<{ key: keyof TariffConfig; label: string }> = [
    { key: 'free_delivery_threshold', label: 'Порог бесплатной доставки (UZS)' },
    { key: 'base_delivery_fee', label: 'Базовая доставка (UZS)' },
    { key: 'peak_surcharge_percent', label: 'Пик +%' },
    { key: 'complex_mahalla_surcharge', label: 'Сложная махалля (UZS)' },
  ];

  return (
    <div>
      <h1>Тарифы доставки</h1>
      {!canEdit && <p style={{ color: '#757575' }}>Read-only (роль finance/analyst)</p>}

      <div className="card">
        <table style={{ width: '100%' }}>
          <tbody>
            {fields.map(({ key, label }) => (
              <tr key={key}>
                <td>{label}</td>
                <td>
                  {canEdit ? (
                    <input
                      type="number"
                      value={t[key] as number ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
                      style={{ width: 120 }}
                    />
                  ) : (
                    t[key]
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {canEdit && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => saveDraft.mutate(draft)}>Сохранить draft</button>
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                const res = await api<{ orders_affected_percent: number; message: string }>('/admin/tariffs/preview', {
                  method: 'POST',
                  body: JSON.stringify(draft),
                });
                setPreview(res);
              }}
            >
              Preview impact
            </button>
            <button type="button" onClick={() => publish.mutate()}>Publish</button>
          </div>
        )}

        {preview && (
          <p style={{ marginTop: 12, fontSize: 13, background: '#E3F2FD', padding: 8, borderRadius: 4 }}>
            {preview.message} ({preview.orders_affected_percent}%)
          </p>
        )}

        <p style={{ marginTop: 12, fontSize: 12, color: '#757575' }}>
          Status: {data?.published?.status} • Published: {data?.published?.published_at?.slice(0, 10)}
        </p>
      </div>
    </div>
  );
}
