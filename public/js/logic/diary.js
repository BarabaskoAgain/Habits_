// Дневник (SPEC §9a): типы событий и сводка за период. Общий для клиента и сервера.
import { addDays } from './dates.js';

export const DIARY_KINDS = [
  { code: 'work', name: 'Работа', icon: '💼' },
  { code: 'sport', name: 'Спорт', icon: '🏃' },
  { code: 'meet', name: 'Встреча', icon: '👥' },
  { code: 'rest', name: 'Отдых', icon: '🌴' },
  { code: 'study', name: 'Учёба', icon: '📚' },
  { code: 'health', name: 'Здоровье', icon: '💊' },
  { code: 'family', name: 'Семья', icon: '👨‍👩‍👧' },
  { code: 'food', name: 'Еда/Кафе', icon: '🍽️' },
  { code: 'media', name: 'Кино/Книги', icon: '🎬' },
  { code: 'other', name: 'Другое', icon: '✨' }
];
export const KIND_CODES = new Set(DIARY_KINDS.map(k => k.code));

const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length * 10) / 10 : null);

// days: [{day, text}], events: [{id, day, kind, title, rating, note}] — уже за период [from, to].
// last — последний учитываемый день (обычно сегодня): будущее не считается «днём без записей».
export function diarySummary(days, events, from, to, last = to) {
  const end = last < to ? last : to;
  const byDay = new Map();
  for (const e of events) (byDay.get(e.day) || byDay.set(e.day, []).get(e.day)).push(e.rating);
  const texts = new Set(days.filter(d => d.text).map(d => d.day));

  const series = [];
  let empty = 0;
  for (let d = from; d <= end; d = addDays(d, 1)) {
    const r = byDay.get(d) || [];
    series.push({ day: d, avg: avg(r) });
    if (!r.length && !texts.has(d)) empty++;
  }

  const kinds = new Map();
  for (const e of events) (kinds.get(e.kind) || kinds.set(e.kind, []).get(e.kind)).push(e.rating);
  const byKind = [...kinds].map(([kind, rs]) => ({ kind, count: rs.length, avg: avg(rs) }))
    .sort((a, b) => b.count - a.count || b.avg - a.avg);

  const sorted = [...events].sort((a, b) => b.rating - a.rating || (a.day < b.day ? 1 : -1));
  // Худшие — только если событий больше, чем влезает в топ (иначе это те же самые)
  const worst = events.length > 5 ? [...events].sort((a, b) => a.rating - b.rating || (a.day < b.day ? 1 : -1)).slice(0, 5) : [];

  return {
    count: events.length,
    avg: avg(events.map(e => e.rating)),
    byKind,
    top: sorted.slice(0, 5),
    worst,
    series,
    emptyDays: empty,
    feed: days.filter(d => d.text).sort((a, b) => (a.day < b.day ? 1 : -1))
  };
}
