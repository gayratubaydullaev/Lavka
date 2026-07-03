import faqData from './faq-data.json' with { type: 'json' };

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreMatch(queryTokens, entry) {
  const haystack = [
    ...entry.keywords,
    entry.question_ru,
    entry.answer_ru,
    entry.answer_uz ?? '',
  ]
    .join(' ')
    .toLowerCase();

  let hits = 0;
  for (const t of queryTokens) {
    if (haystack.includes(t)) hits += 1;
  }
  const keywordBonus = entry.keywords.filter((k) =>
    queryTokens.some((t) => k.includes(t) || t.includes(k)),
  ).length;
  const total = queryTokens.length || 1;
  return Math.min(0.99, (hits + keywordBonus * 0.5) / total);
}

export function suggestAnswers({ question, ticket_type, lang = 'ru' }) {
  const queryTokens = tokenize(`${question} ${ticket_type ?? ''}`);
  const ranked = faqData
    .map((entry) => ({
      entry,
      confidence: scoreMatch(queryTokens, entry),
    }))
    .filter((r) => r.confidence > 0.15)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  if (ranked.length === 0) {
    const fallback = faqData.find((e) => e.id === 'support-1');
    return [
      {
        text: lang === 'uz' ? fallback.answer_uz : fallback.answer_ru,
        confidence: 0.5,
        source: fallback.id,
      },
    ];
  }

  return ranked.map(({ entry, confidence }) => ({
    text: lang === 'uz' ? entry.answer_uz : entry.answer_ru,
    confidence: Math.round(confidence * 100) / 100,
    source: entry.id,
    question: entry.question_ru,
  }));
}

export function autoReply({ question, ticket_type, lang = 'ru' }) {
  const suggestions = suggestAnswers({ question, ticket_type, lang });
  const best = suggestions[0];
  if (!best || best.confidence < 0.85) {
    return { available: false, confidence: best?.confidence ?? 0 };
  }
  return {
    available: true,
    text: best.text,
    confidence: best.confidence,
    source: best.source,
  };
}
