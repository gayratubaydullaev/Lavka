import { createHash, randomUUID } from 'crypto';

export function createAuditLog() {
  return { entries: [] };
}

export function appendAudit(audit, { user_id, action, payload, ip = '127.0.0.1' }) {
  const entry = {
    id: randomUUID(),
    user_id: user_id ?? 'system',
    action,
    payload: payload ?? {},
    ip,
    timestamp: new Date().toISOString(),
  };
  audit.entries.unshift(entry);
  if (audit.entries.length > 500) audit.entries.pop();
  return entry;
}

export function listAudit(audit, { from, to, action } = {}) {
  let list = [...audit.entries];
  if (from) list = list.filter((e) => e.timestamp >= from);
  if (to) list = list.filter((e) => e.timestamp <= `${to}T23:59:59.999Z`);
  if (action) list = list.filter((e) => e.action === action);
  return list;
}

export function exportAuditCsv(audit) {
  const rows = listAudit(audit);
  const header = 'id,timestamp,user_id,action,ip,payload';
  const lines = rows.map((e) =>
    [e.id, e.timestamp, e.user_id, e.action, e.ip, JSON.stringify(e.payload).replace(/"/g, '""')]
      .map((c) => `"${c}"`)
      .join(','),
  );
  const csv = [header, ...lines].join('\n');
  const hash = createHash('sha256').update(csv).digest('hex');
  return { csv, hash };
}
