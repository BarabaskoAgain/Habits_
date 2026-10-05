// Серии (SPEC §0): недопустимые дни и паузы серию не рвут; «сегодня» не рвёт до конца дня.
// weekly — в неделях с выполненным weekPlan, недели с weekPlan = 0 нейтральны. Счётчик — без серий.
import { addDays, weekStart } from './dates.js';
import { isCounter, isAllowed, isDone } from './life.js';
import { weekInfo } from './plan.js';

const weekDone = (h, marks, ws) => {
  const w = weekInfo(h, marks, ws);
  return w.wp === 0 ? null : w.doneCount >= w.wp;
};

export function currentStreak(h, marks = {}, today) {
  if (isCounter(h)) return null;
  if (h.schedule === 'weekly') {
    let ws = weekStart(today);
    let value = weekDone(h, marks, ws) ? 1 : 0;
    const first = weekStart(h.created_day);
    for (ws = addDays(ws, -7); ws >= first; ws = addDays(ws, -7)) {
      const ok = weekDone(h, marks, ws);
      if (ok === null) continue;
      if (!ok) break;
      value++;
    }
    return { value, unit: 'week' };
  }
  let d = isAllowed(h, today) && !isDone(h, marks[today]) ? addDays(today, -1) : today;
  let value = 0;
  for (; d >= h.created_day; d = addDays(d, -1)) {
    if (!isAllowed(h, d)) continue;
    if (!isDone(h, marks[d])) break;
    value++;
  }
  return { value, unit: 'day' };
}

export function bestStreak(h, marks = {}, today) {
  if (isCounter(h)) return null;
  let best = 0, run = 0;
  if (h.schedule === 'weekly') {
    const last = weekStart(today);
    for (let ws = weekStart(h.created_day); ws <= last; ws = addDays(ws, 7)) {
      const ok = weekDone(h, marks, ws);
      if (ok === null) continue;
      run = ok ? run + 1 : (ws === last ? run : 0); // текущая неделя ещё не провалена
      if (run > best) best = run;
    }
    return { value: best, unit: 'week' };
  }
  for (let d = h.created_day; d <= today; d = addDays(d, 1)) {
    if (!isAllowed(h, d)) continue;
    if (isDone(h, marks[d])) { run++; if (run > best) best = run; } else if (d !== today) run = 0;
  }
  return { value: best, unit: 'day' };
}
