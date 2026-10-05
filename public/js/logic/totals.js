// Итоги «Всё время»: реальная сумма, дни с отметкой, среднее по дням жизни, рекорд дня.
import { addDays } from './dates.js';
import { inLife, isAllowed } from './life.js';

// Дни жизни для среднего: от первого допустимого дня (в режиме «по дням» — от первого выбранного) по сегодня
export function lifeDays(h, today) {
  let n = 0, started = false;
  for (let d = h.created_day; d <= today; d = addDays(d, 1)) {
    if (!started) started = isAllowed(h, d);
    if (started && inLife(h, d)) n++;
  }
  return n;
}

// Строка «заметка без отметки» (value 0) не считается ни первой отметкой, ни рекордом.
// Будущие отметки (данные v1) в итоги не идут. Из равных рекордов — самый ранний день.
export function allTime(h, marks = {}, today) {
  let sum = 0, days = 0, best = null, first = null;
  for (const d of Object.keys(marks).sort()) {
    if (d > today) continue;
    const v = Number(marks[d]) || 0;
    if (v <= 0) continue;
    sum += v;
    days++;
    if (!first) first = d;
    if (!best || v > best.value) best = { day: d, value: v };
  }
  const life = lifeDays(h, today);
  return { sum, days, avg: life ? sum / life : null, best, first };
}
