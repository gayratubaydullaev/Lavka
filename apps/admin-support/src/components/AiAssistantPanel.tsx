import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, type AiSuggestion, type Ticket } from '@jomboy/ui-web';

interface Props {
  ticket: Ticket;
  onInsert: (text: string) => void;
}

export function AiAssistantPanel({ ticket, onInsert }: Props) {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [autoAvailable, setAutoAvailable] = useState(false);

  const suggest = useMutation({
    mutationFn: () =>
      api<{ suggestions: AiSuggestion[] }>('/support/ai/suggest', {
        method: 'POST',
        body: JSON.stringify({
          question: ticket.description,
          ticket_type: ticket.type,
        }),
      }),
    onSuccess: async (data) => {
      setSuggestions(data.suggestions);
      const auto = await api<{ available: boolean }>('/support/ai/auto-reply', {
        method: 'POST',
        body: JSON.stringify({ question: ticket.description, ticket_type: ticket.type }),
      });
      setAutoAvailable(auto.available);
    },
  });

  return (
    <div>
      <h3>AI Assistant (mock RAG)</h3>
      <button type="button" onClick={() => suggest.mutate()} disabled={suggest.isPending}>
        {suggest.isPending ? 'Анализ...' : 'Предложить ответ'}
      </button>
      {autoAvailable && (
        <span style={{ marginLeft: 8, fontSize: 11, background: '#E8F5E9', padding: '2px 8px', borderRadius: 4 }}>
          Auto-reply available
        </span>
      )}
      {suggestions.map((s, i) => (
        <div key={i} style={{ marginTop: 8, padding: 8, background: '#f9f9f9', borderRadius: 4 }}>
          <div style={{ fontSize: 11, color: '#757575' }}>
            confidence {Math.round(s.confidence * 100)}% • {s.source}
          </div>
          <p style={{ fontSize: 13, margin: '4px 0' }}>{s.text}</p>
          <button type="button" className="secondary" onClick={() => onInsert(s.text)}>Вставить в чат</button>
        </div>
      ))}
    </div>
  );
}
