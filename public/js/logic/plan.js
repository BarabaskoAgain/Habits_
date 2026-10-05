// План, факт и % за любой период по единой формуле (SPEC §0).
import { addDays, weekStart } from './dates.js';
import { isCounter, isAllowed, isDone, contrib, unitPlan, weeklyN } from './life.js';

const weekDays = (ws) => Array.from({ length: 7 }, (_, i) => addDays(ws, i));

// Неделя weekly-привычки: допустимые дни (≤ limit), weekPlan, засчитанные дни (первые weekPlan с isDone)
export function weekInfo(h, marks, ws, limit = '9999-12-31') {
  const allowed = weekDays(ws).filter(d => d <= limit && isAllowed(h, d));
  const wp = Math.min(weeklyN(h), allowed.length);
  const doneList = allowed.filter(d => isDone(h, marks[d]));
  return { allowed, wp, counted: doneList.slice(0, wp), doneCount: doneList.length };
}

// Сумма реальных значений за период (для boolean — число отметок)
export function sumRange(marks = {}, from, to) {
  let sum = 0;
  for (const d in marks) if (d >= from && d <= to) sum += Number(marks[d]) || 0;
  return sum;
}

// { plan, fact, sum, doneDays, pct } — план только по сегодня включительно
export function periodStats(h, marks = {}, from, to, today) {
  let sum = 0, doneDays = 0;
  for (const d in marks) {
    if (d < from || d > to || d > today) continue; // будущие отметки (данные v1) не считаем
    sum += Number(marks[d]) || 0;
    if (isDone(h, marks[d])) doneDays++;
  }
  if (isCounter(h)) return { plan: 0, fact: 0, sum, doneDays, pct: null };

  const limit = to < today ? to : today;
  const u = unitPlan(h);
  let plan = 0, fact = 0;
  if (h.schedule !== 'weekly') {
    for (let d = from; d <= limit; d = addDays(d, 1)) {
      if (!isAllowed(h, d)) continue;
      plan += u;
      fact += contrib(h, marks[d]);
    }
  } else {
    for (let ws = weekStart(from); ws <= limit; ws = addDays(ws, 7)) {
      const { allowed, wp, counted } = weekInfo(h, marks, ws, today);
      if (!allowed.length) continue;
      const inPeriod = allowed.filter(d => d >= from && d <= to).length;
      plan += (wp * u * inPeriod) / allowed.length;
      for (const d of counted) if (d >= from && d <= to) fact += contrib(h, marks[d]);
    }
  }
  return { plan, fact, sum, doneDays, pct: percent(fact, plan) };
}

// 100% — только при выполненном плане; недобор не больше 99%, любой прогресс не меньше 1%
export function percent(fact, plan) {
  if (!(plan > 0)) return null;
  if (fact >= plan - 1e-9) return 100;
  return Math.min(99, Math.max(fact > 0 ? 1 : 0, Math.round((fact / plan) * 100)));
}

// Запланировано ли на день (Сегодня X/Y, календарь, напоминания).
// weekly: отмеченный день — в плане; пустой — только когда запаса не осталось: дней до конца недели
// (включая этот) не больше, чем ещё нужно сделать. Пока запас есть, день «в запасе» и не красный.
export function scheduledOnDay(h, marks = {}, day) {
  if (isCounter(h) || !isAllowed(h, day)) return false;
  if (h.schedule !== 'weekly') return true;
  if (isDone(h, marks[day])) return true;
  const { allowed, wp } = weekInfo(h, marks, weekStart(day));
  const needed = wp - allowed.filter(d => d < day && isDone(h, marks[d])).length;
  if (needed <= 0) return false;
  return allowed.filter(d => d >= day).length <= needed;
}

// completions: { [habitId]: { day: value } }
export function dayProgress(habits, completions, day) {
  let done = 0, total = 0;
  for (const h of habits) {
    const marks = completions[h.id] || {};
    if (!scheduledOnDay(h, marks, day)) continue;
    total++;
    if (isDone(h, marks[day])) done++;
  }
  return { done, total };
}
