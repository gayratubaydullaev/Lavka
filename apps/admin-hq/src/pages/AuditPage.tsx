import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, API_BASE, type AuditEntry } from '@jomboy/ui-web';

export function AuditPage() {
  const [action, setAction] = useState('');

  const { data } = useQuery({
    queryKey: ['audit', action],
    queryFn: () => api<{ entries: AuditEntry[] }>(`/admin/audit${action ? `?action=${action}` : ''}`),
  });

  const exportWorm = () => {
    const token = localStorage.getItem('jomboy_token');
    fetch(`${API_BASE}/admin/audit/export?format=csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        const hash = r.headers.get('X-Audit-Hash');
        return r.text().then((csv) => ({ csv, hash }));
      })
      .then(({ csv, hash }) => {
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `audit-worm-${hash?.slice(0, 8) ?? 'export'}.csv`;
        a.click();
      });
  };

  const entries = data?.entries ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Аудит — WORM export</h1>
        <button type="button" onClick={exportWorm}>Export CSV (WORM)</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Все действия</option>
          <option value="tariff.publish">tariff.publish</option>
          <option value="refund.approve">refund.approve</option>
          <option value="fraud.unblock">fraud.unblock</option>
          <option value="inventory.patch">inventory.patch</option>
          <option value="fraud.block">fraud.block</option>
        </select>
      </div>

      <div className="card">
        {entries.length === 0 ? (
          <p>Нет записей</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
              <strong>{e.action}</strong> — {e.user_id}
              <div style={{ color: '#757575' }}>{new Date(e.timestamp).toLocaleString()} • {e.ip}</div>
              <code style={{ fontSize: 11 }}>{JSON.stringify(e.payload)}</code>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
