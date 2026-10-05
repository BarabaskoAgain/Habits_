// Логика v2 по SPEC.md §0: жизнь привычки, режимы расписания, план/факт, серии, итоги.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey, addDays, weekStart, weekdayIndex, daysBetween,
  isCounter, inLife, isAllowed, isArchived, isDone, contrib,
  periodStats, scheduledOnDay, dayProgress,
  currentStreak, bestStreak, allTime, sumRange
} from '../public/js/logic.js';

const H = (x = {}) => ({
  id: 1, type: 'boolean', target_value: null, schedule: 'daily', active_days: [0, 1, 2, 3, 4, 5, 6],
  days_per_week: 7, created_day: '2026-01-01', end_day: null, pauses: [], ...x
});
const NUM = (x = {}) => H({ type: 'number', target_value: 50, ...x });
const marks = (...days) => Object.fromEntries(days.map(d => [d, 1]));
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`);

// ---------- даты ----------
test('даты: dayKey локальный, addDays через DST, неделя с понедельника', () => {
  assert.equal(dayKey(new Date(2026, 9, 5, 0, 30)), '2026-10-05');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(weekStart('2026-03-01'), '2026-02-23'); // вс → пн
  assert.equal(weekdayIndex('2026-10-05'), 0);         // пн = 0
  assert.equal(daysBetween('2026-10-01', '2026-10-05'), 4);
});

// ---------- жизнь привычки ----------
test('жизнь: старт, срок включительно, паузы [from,to)', () => {
  const h = H({ created_day: '2026-10-01', end_day: '2026-10-20', pauses: [{ from_day: '2026-10-05', to_day: '2026-10-08' }] });
  assert.equal(inLife(h, '2026-09-30'), false);
  assert.equal(inLife(h, '2026-10-04'), true);
  assert.equal(inLife(h, '2026-10-05'), false);
  assert.equal(inLife(h, '2026-10-07'), false);
  assert.equal(inLife(h, '2026-10-08'), true);
  assert.equal(inLife(h, '2026-10-20'), true);
  assert.equal(inLife(h, '2026-10-21'), false);
});

test('архив: открытая пауза или истёкший срок', () => {
  assert.equal(isArchived(H({ pauses: [{ from_day: '2026-10-06', to_day: null }] }), '2026-10-05'), true);
  assert.equal(isArchived(H({ end_day: '2026-10-04' }), '2026-10-05'), true);
  assert.equal(isArchived(H({ end_day: '2026-10-05' }), '2026-10-05'), false);
  assert.equal(isArchived(H({ pauses: [{ from_day: '2026-09-01', to_day: '2026-09-10' }] }), '2026-10-05'), false);
});

test('допустимые дни: режим days по active_days (0 = пн)', () => {
  const h = H({ schedule: 'days', active_days: [0, 2, 4] });
  assert.equal(isAllowed(h, '2026-10-05'), true);  // пн
  assert.equal(isAllowed(h, '2026-10-06'), false); // вт
  assert.equal(isAllowed(h, '2026-10-09'), true);  // пт
});

test('isDone и вклад дня', () => {
  assert.equal(isDone(H(), 1), true);
  assert.equal(isDone(H(), undefined), false);
  assert.equal(isDone(H(), 0), false);   // строка с заметкой без отметки
  assert.equal(contrib(H(), 0), 0);
  assert.equal(isDone(NUM(), 50), true);
  assert.equal(isDone(NUM(), 49), false);
  const counter = NUM({ target_value: null });
  assert.equal(isCounter(counter), true);
  assert.equal(isDone(counter, 1), true);
  assert.equal(isDone(counter, 0), false);
  assert.equal(contrib(NUM(), 300), 50);   // перевыполнение не даёт > цели
  assert.equal(contrib(NUM(), 20), 20);
  assert.equal(contrib(H(), 1), 1);
});

// ---------- план и факт ----------
test('daily boolean: неделя 5 из 7', () => {
  const s = periodStats(H(), marks('2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'), '2026-10-05', '2026-10-11', '2026-10-11');
  assert.equal(s.plan, 7); assert.equal(s.fact, 5); assert.equal(s.sum, 5); assert.equal(s.doneDays, 5); assert.equal(s.pct, 71);
});

test('number: факт = реальная сумма, % по урезанному вкладу', () => {
  const s = periodStats(NUM(), { '2026-10-05': 300, '2026-10-06': 20 }, '2026-10-05', '2026-10-06', '2026-10-06');
  assert.equal(s.sum, 320);
  assert.equal(s.fact, 70);   // 50 + 20
  assert.equal(s.plan, 100);
  assert.equal(s.pct, 70);
});

test('план считается по сегодня включительно', () => {
  const s = periodStats(H(), marks('2026-10-05'), '2026-10-05', '2026-10-11', '2026-10-06');
  assert.equal(s.plan, 2); assert.equal(s.pct, 50);
});

test('days Пн/Ср/Пт: октябрь 2025 (начинается в среду) — план 14', () => {
  const h = H({ schedule: 'days', active_days: [0, 2, 4], created_day: '2025-01-01' });
  const s = periodStats(h, {}, '2025-10-01', '2025-10-31', '2026-01-01');
  assert.equal(s.plan, 14);
});

test('weekly N=3: неделя, разрезанная месяцем (март 2026 начинается в вс)', () => {
  const h = H({ schedule: 'weekly', days_per_week: 3, created_day: '2026-01-01' });
  const m = marks('2026-02-23', '2026-02-25', '2026-03-01'); // пн, ср, вс одной недели
  const feb = periodStats(h, m, '2026-02-01', '2026-02-28', '2026-12-31');
  const mar = periodStats(h, m, '2026-03-01', '2026-03-31', '2026-12-31');
  const febWeek = periodStats(h, m, '2026-02-23', '2026-02-28', '2026-12-31');
  const marWeek = periodStats(h, m, '2026-03-01', '2026-03-01', '2026-12-31');
  near(febWeek.plan, 3 * 6 / 7, 'план части недели в феврале');
  near(marWeek.plan, 3 * 1 / 7, 'план части недели в марте');
  assert.equal(febWeek.fact, 2);
  assert.equal(marWeek.fact, 1);
  assert.equal(marWeek.pct, 100); // 1 / 0.43 → 100 (с отсечкой)
  assert.ok(feb.plan > 0 && mar.plan > 0);
});

test('weekly: засчитываются первые weekPlan дней, остальное сверх плана', () => {
  const h = H({ schedule: 'weekly', days_per_week: 3 });
  const s = periodStats(h, marks('2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'), '2026-10-05', '2026-10-11', '2026-10-11');
  assert.equal(s.plan, 3); assert.equal(s.fact, 3); assert.equal(s.sum, 4); assert.equal(s.pct, 100);
});

test('weekly: неделя целиком в паузе — план 0, без NaN', () => {
  const h = H({ schedule: 'weekly', days_per_week: 3, pauses: [{ from_day: '2026-10-05', to_day: '2026-10-12' }] });
  const s = periodStats(h, {}, '2026-10-05', '2026-10-11', '2026-10-11');
  assert.equal(s.plan, 0); assert.equal(s.fact, 0); assert.equal(s.pct, null);
});

test('weekly: пауза съела дни — weekPlan = min(N, допустимых)', () => {
  // N=3, пауза вт–сб → допустимы пн и вс
  const h = H({ schedule: 'weekly', days_per_week: 3, pauses: [{ from_day: '2026-10-06', to_day: '2026-10-11' }] });
  const s = periodStats(h, marks('2026-10-05', '2026-10-11'), '2026-10-05', '2026-10-11', '2026-10-11');
  assert.equal(s.plan, 2); assert.equal(s.fact, 2); assert.equal(s.pct, 100);
});

test('инвариант: сумма планов месяцев = план года (weekly с паузой)', () => {
  const h = H({ schedule: 'weekly', days_per_week: 3, created_day: '2025-11-15', pauses: [{ from_day: '2026-04-08', to_day: '2026-05-20' }] });
  const year = periodStats(h, {}, '2026-01-01', '2026-12-31', '2026-12-31').plan;
  let sum = 0;
  for (let m = 1; m <= 12; m++) {
    const from = `2026-${String(m).padStart(2, '0')}-01`;
    const to = addDays(m === 12 ? '2027-01-01' : `2026-${String(m + 1).padStart(2, '0')}-01`, -1);
    sum += periodStats(h, {}, from, to, '2026-12-31').plan;
  }
  near(sum, year, 'Σ месяцев = год');
});

test('счётчик без цели: вне плана и %, только суммы', () => {
  const c = NUM({ target_value: null });
  const s = periodStats(c, { '2026-10-05': 3, '2026-10-06': 2 }, '2026-10-05', '2026-10-11', '2026-10-11');
  assert.equal(s.plan, 0); assert.equal(s.pct, null); assert.equal(s.sum, 5); assert.equal(s.doneDays, 2);
});

test('отметки вне жизни не идут в план и факт, но идут в сумму', () => {
  const h = H({ created_day: '2026-10-07' });
  const s = periodStats(h, marks('2026-10-05', '2026-10-07'), '2026-10-05', '2026-10-11', '2026-10-11');
  assert.equal(s.plan, 5); assert.equal(s.fact, 1); assert.equal(s.sum, 2);
});

// ---------- запланировано на день ----------
test('scheduledOnDay: weekly — пустой день в запасе не в плане, без запаса — в плане', () => {
  const h = H({ schedule: 'weekly', days_per_week: 3 });
  // пн 05.10 … вс 11.10; отметки ср, пт, вс — идеальная неделя: пн, вт, чт, сб «в запасе»
  const m = marks('2026-10-07', '2026-10-09', '2026-10-11');
  for (const d of ['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-10']) assert.equal(scheduledOnDay(h, m, d), false, d);
  for (const d of ['2026-10-07', '2026-10-09', '2026-10-11']) assert.equal(scheduledOnDay(h, m, d), true, d);
  // без отметок: с пт осталось 3 дня на 3 раза — запаса нет, дни обязательные
  assert.equal(scheduledOnDay(h, {}, '2026-10-08'), false); // чт: впереди 4 дня
  assert.equal(scheduledOnDay(h, {}, '2026-10-09'), true);  // пт: впереди ровно 3
});

test('scheduledOnDay: weekly N=2 — после двух отметок остальные дни не в плане', () => {
  const h = H({ schedule: 'weekly', days_per_week: 2 });
  const m = marks('2026-10-05', '2026-10-06');
  assert.equal(scheduledOnDay(h, m, '2026-10-05'), true);
  assert.equal(scheduledOnDay(h, m, '2026-10-06'), true);
  assert.equal(scheduledOnDay(h, m, '2026-10-07'), false);
});

test('scheduledOnDay: weekly сравнивается с weekPlan, а не с N', () => {
  // N=3, но в неделе всего 2 допустимых дня (пауза)
  const h = H({ schedule: 'weekly', days_per_week: 3, pauses: [{ from_day: '2026-10-06', to_day: '2026-10-11' }] });
  const m = marks('2026-10-05');
  assert.equal(scheduledOnDay(h, m, '2026-10-11'), true);
  const m2 = marks('2026-10-05', '2026-10-11');
  assert.equal(scheduledOnDay(h, m2, '2026-10-11'), true); // отмечен сам
});

test('dayProgress: счётчик и нерабочие дни не входят', () => {
  const habits = [
    H({ id: 1 }),
    H({ id: 2, schedule: 'days', active_days: [1] }), // только вт
    NUM({ id: 3, target_value: null })               // счётчик
  ];
  const comp = { 1: marks('2026-10-05'), 3: { '2026-10-05': 4 } };
  assert.deepEqual(dayProgress(habits, comp, '2026-10-05'), { done: 1, total: 1 });
  assert.deepEqual(dayProgress(habits, comp, '2026-10-06'), { done: 0, total: 2 });
});

// ---------- серии ----------
test('серия daily: сегодня не рвёт, пропуск вчера рвёт', () => {
  assert.deepEqual(currentStreak(H(), marks('2026-10-03', '2026-10-04'), '2026-10-05'), { value: 2, unit: 'day' });
  assert.deepEqual(currentStreak(H(), marks('2026-10-02', '2026-10-03'), '2026-10-05'), { value: 0, unit: 'day' });
});

test('серия days Пн/Ср/Пт: нерабочие дни не рвут', () => {
  const h = H({ schedule: 'days', active_days: [0, 2, 4] });
  const m = marks('2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05');
  assert.deepEqual(currentStreak(h, m, '2026-10-06'), { value: 4, unit: 'day' });
});

test('серия: пауза не рвёт', () => {
  const h = H({ pauses: [{ from_day: '2026-10-03', to_day: '2026-10-05' }] });
  assert.deepEqual(currentStreak(h, marks('2026-10-01', '2026-10-02', '2026-10-05'), '2026-10-05'), { value: 3, unit: 'day' });
});

test('серия не идёт раньше старта', () => {
  const h = H({ created_day: '2026-10-04' });
  assert.deepEqual(currentStreak(h, marks('2026-10-04', '2026-10-05'), '2026-10-05'), { value: 2, unit: 'day' });
});

test('серия weekly: недели с выполненным планом, текущая не рвёт, пустые недели нейтральны', () => {
  const h = H({ schedule: 'weekly', days_per_week: 2, created_day: '2026-09-01',
    pauses: [{ from_day: '2026-09-21', to_day: '2026-09-28' }] });
  const m = marks('2026-09-14', '2026-09-15', '2026-09-28', '2026-09-29', '2026-10-05');
  assert.deepEqual(currentStreak(h, m, '2026-10-06'), { value: 2, unit: 'week' });
});

test('лучшая серия по реальным датам', () => {
  const m = marks('2026-09-01', '2026-09-02', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-20');
  assert.deepEqual(bestStreak(H({ created_day: '2026-09-01' }), m, '2026-10-05'), { value: 3, unit: 'day' });
});

test('серия счётчика: нет', () => {
  assert.equal(currentStreak(NUM({ target_value: null }), { '2026-10-05': 2 }, '2026-10-05'), null);
});

// ---------- итоги ----------
test('allTime: сумма, дни, среднее по дням жизни, рекорд', () => {
  const h = NUM({ created_day: '2026-10-01', target_value: 50 });
  const m = { '2026-10-01': 20, '2026-10-02': 80, '2026-10-04': 50 };
  const t = allTime(h, m, '2026-10-05');
  assert.equal(t.sum, 150);
  assert.equal(t.days, 3);
  assert.equal(t.avg, 30); // 150 / 5 дней жизни
  assert.deepEqual(t.best, { day: '2026-10-02', value: 80 });
  assert.equal(t.first, '2026-10-01');
});

test('allTime: строка-заметка (0) не первая отметка и не рекорд; рекорд — самый ранний из равных', () => {
  const h = NUM({ created_day: '2026-10-01' });
  let t = allTime(h, { '2026-10-01': 0, '2026-10-03': 20, '2026-10-02': 20 }, '2026-10-05');
  assert.equal(t.first, '2026-10-02');
  assert.deepEqual(t.best, { day: '2026-10-02', value: 20 });
  assert.equal(t.days, 2);
  t = allTime(h, { '2026-10-01': 0 }, '2026-10-05');
  assert.equal(t.best, null); assert.equal(t.first, null);
});

test('allTime: среднее от первого допустимого дня; нет дней жизни — null; будущее не в сумме', () => {
  const h = NUM({ schedule: 'days', active_days: [0], created_day: '2026-10-01' }); // только пн; чт 01.10
  assert.equal(allTime(h, { '2026-10-05': 10 }, '2026-10-05').avg, 10); // с пн 05.10 — 1 день
  const later = NUM({ created_day: '2026-10-06' });
  assert.equal(allTime(later, { '2026-10-06': 5 }, '2026-10-05').avg, null);
  assert.equal(allTime(NUM(), { '2026-10-05': 5, '2026-10-06': 7 }, '2026-10-05').sum, 5);
});

test('pct: недобор не показывается как 100%, частичный прогресс — не 0%', () => {
  const h = NUM({ target_value: 200 });
  assert.equal(periodStats(h, { '2026-10-05': 199 }, '2026-10-05', '2026-10-05', '2026-10-05').pct, 99);
  const h3 = NUM({ target_value: 300 });
  assert.equal(periodStats(h3, { '2026-10-05': 1 }, '2026-10-05', '2026-10-05', '2026-10-05').pct, 1);
  assert.equal(periodStats(h3, { '2026-10-05': 300 }, '2026-10-05', '2026-10-05', '2026-10-05').pct, 100);
});

test('periodStats: будущие отметки (данные v1) не в суммах', () => {
  const s = periodStats(H(), marks('2026-10-05', '2026-10-07'), '2026-10-05', '2026-10-11', '2026-10-05');
  assert.equal(s.sum, 1); assert.equal(s.doneDays, 1);
});

test('sumRange: сумма за период', () => {
  assert.equal(sumRange({ '2026-10-01': 20, '2026-10-05': 30, '2026-10-09': 5 }, '2026-10-01', '2026-10-05'), 50);
});
