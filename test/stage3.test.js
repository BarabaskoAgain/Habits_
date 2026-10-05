// Этап 3 — логика: сводка дневника и анализ выполнения.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diarySummary, insights, periodStats, currentStreak, addDays } from '../public/js/logic.js';

const ev = (day, kind, rating, title = 'x') => ({ day, kind, rating, title, note: '' });

test('сводка дневника: счётчики, средняя, по типам, топ/худшие, дни без записей', () => {
  const days = [{ day: '2026-10-01', text: 'Начало' }, { day: '2026-10-03', text: 'Отпуск' }];
  const events = [
    ev('2026-10-01', 'work', 4), ev('2026-10-01', 'sport', 9), ev('2026-10-02', 'work', 6),
    ev('2026-10-04', 'family', 10), ev('2026-10-04', 'work', 2), ev('2026-10-05', 'food', 7)
  ];
  const s = diarySummary(days, events, '2026-10-01', '2026-10-07', '2026-10-06');
  assert.equal(s.count, 6);
  assert.equal(s.avg, 6.3); // 38 / 6
  assert.deepEqual(s.byKind[0], { kind: 'work', count: 3, avg: 4 });
  assert.equal(s.top[0].rating, 10);
  assert.equal(s.worst[0].rating, 2);
  assert.equal(s.series.length, 6, 'будущий 7-й день не в графике');
  assert.equal(s.series[0].avg, 6.5);
  assert.equal(s.series[2].avg, null);
  assert.equal(s.emptyDays, 1, 'пустой только 6-й: у 3-го есть описание');
  assert.deepEqual(s.feed.map(d => d.day), ['2026-10-03', '2026-10-01']);
});

test('сводка дневника: до 6 событий худших нет, пусто — без падений', () => {
  const s = diarySummary([], [ev('2026-10-01', 'rest', 5)], '2026-10-01', '2026-10-01');
  assert.equal(s.worst.length, 0);
  const z = diarySummary([], [], '2026-10-01', '2026-10-03');
  assert.equal(z.avg, null); assert.equal(z.count, 0); assert.equal(z.emptyDays, 3);
});

const TODAY = '2026-10-05';
const H = (x) => ({ id: 1, type: 'boolean', schedule: 'daily', active_days: [0, 1, 2, 3, 4, 5, 6], days_per_week: 7, created_day: '2026-01-01', pauses: [], reminder_enabled: true, ...x });
const run = (h, marks) => insights(h, periodStats(h, marks, addDays(TODAY, -29), TODAY, TODAY), currentStreak(h, marks, TODAY));
const fill = (n, v = 1, step = 1) => Object.fromEntries(Array.from({ length: n }, (_, i) => [addDays(TODAY, -i * step), v]));

test('анализ: уровни ≥90 / 70–89 / <70 и рекомендация', () => {
  assert.equal(run(H(), fill(30)).items[0].icon, '🎉');
  assert.match(run(H(), fill(30)).tip, /Держите темп/);
  assert.equal(run(H(), fill(23)).items[0].icon, '👍'); // 23 из 30 = 77%
  assert.equal(run(H(), fill(10, 1, 3)).items[0].icon, '💪');
  assert.match(run(H(), fill(10, 1, 3)).tip, /меньше дней/);
  assert.match(run(H({ reminder_enabled: false }), fill(20)).tip, /Включите напоминание/);
});

test('анализ: серия, перевыполнение, счётчик и мало данных', () => {
  const r = run(H(), fill(30));
  assert.ok(r.items.some(i => /серия 30 дней подряд/.test(i.text)), JSON.stringify(r.items));
  assert.ok(r.items.some(i => /стабильно/.test(i.text)));
  const num = H({ type: 'number', target_value: 50, unit: 'раз' });
  const over = run(num, fill(30, 60));
  assert.ok(over.items.some(i => i.text === 'Цель перевыполнена на 20%!'), JSON.stringify(over.items));
  assert.match(over.tip, /увеличить цель/);
  assert.deepEqual(run(H({ type: 'number', target_value: null }), fill(30, 5)), { items: [], tip: null });
  const fresh = run(H({ created_day: addDays(TODAY, -1) }), fill(2));
  assert.equal(fresh.items[0].icon, '🌱'); assert.equal(fresh.tip, null);
});
