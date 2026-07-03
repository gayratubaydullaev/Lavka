interface KpiCardProps {
  label: string;
  value: string | number;
  alert?: boolean;
}

export function KpiCard({ label, value, alert }: KpiCardProps) {
  return (
    <div className={`kpi-card${alert ? ' kpi-card--alert' : ''}`}>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
    </div>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const cls = `status-badge status-badge--${status.toLowerCase().replace(/_/g, '-')}`;
  return <span className={cls}>{status}</span>;
}

export function SlaTimer({ deadline, priority }: { deadline: string; priority: string }) {
  const remaining = new Date(deadline).getTime() - Date.now();
  const mins = Math.max(0, Math.floor(remaining / 60000));
  const breached = remaining <= 0;
  return (
    <span className={`sla-timer sla-timer--${priority}${breached ? ' sla-timer--breach' : ''}`}>
      {breached ? 'SLA breach' : `${mins}m`}
    </span>
  );
}

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
}: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} onClick={() => onRowClick?.(row)} className={onRowClick ? 'clickable' : ''}>
            {columns.map((c) => (
              <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
