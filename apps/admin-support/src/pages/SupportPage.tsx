import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  SlaTimer,
  formatUzs,
  t,
  type Ticket,
  type Order,
  type AutoRefundEligibility,
  API_BASE,
} from '@jomboy/ui-web';
import { OrderTimeline } from '../components/OrderTimeline';
import { FraudPanel } from '../components/FraudPanel';
import { AiAssistantPanel } from '../components/AiAssistantPanel';

const templates = {
  ru: ['Здравствуйте! Чем могу помочь?', 'Проверяю ваш заказ...', 'Возврат будет обработан в течение 24 часов.'],
  uz: ['Assalomu alaykum!', 'Buyurtmangizni tekshiryapman...', 'Qaytarish 24 soat ichida.'],
};

const STATUS_FILTERS = [
  { id: '', label: 'Все' },
  { id: 'new', label: 'New' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'auto_resolved', label: 'Auto-resolved' },
  { id: 'resolved', label: 'Resolved' },
];

export function SupportPage() {
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [chat, setChat] = useState<Array<{ from: string; text: string }>>([]);
  const [input, setInput] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const qc = useQueryClient();

  const ticketsPath = statusFilter ? `/tickets?status=${statusFilter}` : '/tickets';

  const { data } = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () => api<{ tickets: Ticket[] }>(ticketsPath),
    refetchInterval: 5000,
  });

  const { data: order } = useQuery({
    queryKey: ['order', selected?.order_id],
    queryFn: () => api<Order>(`/orders/${selected!.order_id}`),
    enabled: !!selected?.order_id,
  });

  const { data: payment } = useQuery({
    queryKey: ['payment', selected?.order_id],
    queryFn: () => api<{ status: string; amount: number; provider: string; fiscal_receipt?: { soliq_ref: string } }>(
      `/orders/${selected!.order_id}/payment`,
    ),
    enabled: !!selected?.order_id,
  });

  const { data: autoRefund } = useQuery({
    queryKey: ['auto-refund', selected?.id],
    queryFn: () => api<AutoRefundEligibility>(`/tickets/${selected!.id}/auto-refund-eligibility`),
    enabled: !!selected?.id,
  });

  const refundDecision = useMutation({
    mutationFn: ({ ticketId, decision, amount, auto }: { ticketId: string; decision: string; amount?: number; auto?: boolean }) =>
      api(`/tickets/${ticketId}/refund-decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, amount, comment: '', auto }),
      }).then((res) => {
        if (auto) return res;
        return decision !== 'reject'
          ? api('/refunds', {
              method: 'POST',
              body: JSON.stringify({
                order_id: selected?.order_id,
                amount: amount ?? order?.total_amount,
                reason: selected?.description,
                ticket_id: ticketId,
                type: decision === 'partial' ? 'partial' : 'full',
              }),
            })
          : undefined;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setSelected(null);
    },
  });

  useEffect(() => {
    if (!selected) return;
    wsRef.current?.close();
    wsRef.current = new WebSocket(`${API_BASE.replace('http', 'ws').replace('/api/v1', '/api/v1/ws')}?channel=support`);
    wsRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'chat_message') setChat((c) => [...c, { from: 'operator', text: msg.text }]);
    };
    setChat([{ from: 'system', text: `Тикет: ${selected.description}` }]);
    return () => wsRef.current?.close();
  }, [selected]);

  const sendChat = () => {
    if (!input.trim()) return;
    setChat((c) => [...c, { from: 'agent', text: input }]);
    wsRef.current?.send(JSON.stringify({ type: 'chat_message', text: input }));
    setInput('');
  };

  const tickets = data?.tickets ?? [];
  const newCount = tickets.filter((tk) => tk.status === 'new').length;
  const criticalCount = tickets.filter((tk) => tk.priority === 'critical' || tk.priority === 'high').length;

  return (
    <div>
      <div
        className="support-summary"
        style={{
          marginBottom: 16,
          padding: '16px 20px',
          borderRadius: 8,
          background: 'linear-gradient(135deg, #E3F2FD 0%, #fff 100%)',
          border: '1px solid #BBDEFB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <strong style={{ fontSize: 18, color: '#0D47A1' }}>Рабочая очередь</strong>
          <p style={{ margin: '4px 0 0', color: '#546E7A', fontSize: 13 }}>
            Чат в реальном времени · AI-подсказки · авто-возвраты · антифрод
          </p>
        </div>
        <div style={{ display: 'flex', gap: 24, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1565C0' }}>{tickets.length}</div>
            <div style={{ fontSize: 12, color: '#757575' }}>всего</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1565C0' }}>{newCount}</div>
            <div style={{ fontSize: 12, color: '#757575' }}>новых</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: criticalCount > 0 ? '#C62828' : '#1565C0' }}>{criticalCount}</div>
            <div style={{ fontSize: 12, color: '#757575' }}>приоритет</div>
          </div>
        </div>
      </div>

      <div className="split-pane">
        <div className="card">
          <h2>Очередь тикетов</h2>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={statusFilter === f.id ? '' : 'secondary'}
                onClick={() => setStatusFilter(f.id)}
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                {f.label}
              </button>
            ))}
          </div>
          {tickets.map((tk) => (
            <div
              key={tk.id}
              onClick={() => setSelected(tk)}
              style={{
                padding: 12,
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                background: selected?.id === tk.id ? 'rgba(46,125,50,0.08)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{tk.customer_name}</strong>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {tk.auto_refund && <span style={{ fontSize: 10, background: '#E3F2FD', padding: '2px 6px', borderRadius: 4 }}>AUTO</span>}
                  {tk.risk_score != null && tk.risk_score >= 45 && (
                    <span style={{ fontSize: 10, background: '#FFEBEE', padding: '2px 6px', borderRadius: 4 }}>risk {tk.risk_score}</span>
                  )}
                  <SlaTimer deadline={tk.sla_deadline} priority={tk.priority} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#757575' }}>{tk.type} • {tk.status}</div>
              <div>{tk.description}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Чат</h2>
          {selected ? (
            <>
              <AiAssistantPanel ticket={selected} onInsert={(text) => setInput(text)} />
              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #eee' }} />
              <div style={{ height: 220, overflow: 'auto', marginBottom: 12 }}>
                {chat.map((m, i) => (
                  <div key={i} style={{ textAlign: m.from === 'agent' ? 'right' : 'left', marginBottom: 8 }}>
                    <span style={{ background: m.from === 'agent' ? '#2E7D32' : '#f5f5f5', color: m.from === 'agent' ? '#fff' : '#000', padding: '6px 10px', borderRadius: 8 }}>
                      {m.text}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {[...templates.ru, ...templates.uz].map((tpl) => (
                  <button key={tpl} type="button" className="secondary" onClick={() => setInput(tpl)}>{tpl.slice(0, 22)}...</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} style={{ flex: 1 }} placeholder="Сообщение..." />
                <button type="button" onClick={sendChat}>Отправить</button>
              </div>
            </>
          ) : (
            <p>Выберите тикет</p>
          )}
        </div>

        <div className="card">
          <h2>Заказ и возврат</h2>
          {order && selected ? (
            <>
              <FraudPanel ticket={selected} />
              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #eee' }} />
              <OrderTimeline orderId={order.id} />
              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #eee' }} />
              <p><strong>#{order.id.slice(0, 8)}</strong> — <span>{order.status}</span></p>
              <p>Итого: {formatUzs(order.total_amount)}</p>
              {payment && (
                <div style={{ padding: 8, background: '#F5F5F5', borderRadius: 4, marginBottom: 12, fontSize: 13 }}>
                  <strong>Оплата</strong>: {payment.status} • {payment.provider?.toUpperCase()} • {formatUzs(payment.amount)}
                  {payment.fiscal_receipt && (
                    <div style={{ marginTop: 4, color: '#757575' }}>OFD: {payment.fiscal_receipt.soliq_ref}</div>
                  )}
                </div>
              )}
              <ul>{order.items.map((i, idx) => <li key={idx}>{i.name} × {i.quantity}</li>)}</ul>

              {autoRefund && (
                <div style={{ padding: 8, background: autoRefund.eligible ? '#E8F5E9' : '#FFF3E0', borderRadius: 4, marginBottom: 12, fontSize: 13 }}>
                  {autoRefund.eligible ? (
                    <>
                      <strong>Auto-refund eligible</strong> (trust {(autoRefund.trust_score * 100).toFixed(0)}%)
                      <button
                        type="button"
                        style={{ display: 'block', marginTop: 8 }}
                        onClick={() => refundDecision.mutate({ ticketId: selected.id, decision: 'approve', auto: true })}
                      >
                        Auto-approve
                      </button>
                    </>
                  ) : (
                    <>
                      <strong>Auto-refund недоступен</strong>
                      <ul style={{ margin: '4px 0', paddingLeft: 16 }}>{autoRefund.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                    </>
                  )}
                </div>
              )}

              <input
                type="number"
                placeholder="Сумма частичного возврата"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                style={{ width: '100%', marginBottom: 8, padding: 8 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" onClick={() => refundDecision.mutate({ ticketId: selected.id, decision: 'approve' })}>
                  {t('support.refund.approve')} (полный)
                </button>
                <button type="button" className="secondary" onClick={() => refundDecision.mutate({ ticketId: selected.id, decision: 'partial', amount: Number(refundAmount) })}>
                  Частичный возврат
                </button>
                <button type="button" className="secondary" onClick={() => refundDecision.mutate({ ticketId: selected.id, decision: 'reject' })}>
                  Отклонить
                </button>
              </div>
            </>
          ) : (
            <p>Нет выбранного заказа</p>
          )}
        </div>
      </div>
    </div>
  );
}
