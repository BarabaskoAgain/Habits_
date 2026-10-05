// Жизнь привычки и выполнение дня (SPEC §0).
// Жизнь = [created_day … end_day] минус паузы [from_day, to_day).
import { weekdayIndex } from './dates.js';

export const isCounter = (h) => h.type === 'number' && !(Number(h.target_value) > 0);

export function inLife(h, day) {
  if (day < h.created_day) return false;
  if (h.end_day && day > h.end_day) return false;
  for (const p of h.pauses || []) {
    if (day >= p.from_day && (p.to_day == null || day < p.to_day)) return false;
  }
  return true;
}

// Допустимый день: в жизни и, в режиме «по дням недели», в выбранный день
export function isAllowed(h, day) {
  if (!inLife(h, day)) return false;
  return h.schedule !== 'days' || h.active_days.includes(weekdayIndex(day));
}

export function isArchived(h, today) {
  if ((h.pauses || []).some(p => p.to_day == null)) return true;
  return !!h.end_day && h.end_day < today;
}

// value 0 — строка с заметкой без отметки: не выполнено
export function isDone(h, value) {
  if (value === undefined || value === null) return false;
  if (h.type !== 'number') return Number(value) > 0;
  const target = Number(h.target_value);
  return target > 0 ? Number(value) >= target : Number(value) > 0;
}

// Вклад дня в план/%: не больше цели (перевыполнение не даёт > 100%)
export function contrib(h, value) {
  if (value === undefined || value === null) return 0;
  if (h.type !== 'number') return Number(value) > 0 ? 1 : 0;
  const target = Number(h.target_value);
  return target > 0 ? Math.min(Number(value), target) : 0;
}

// Единица плана за день: 1 день или цель
export const unitPlan = (h) => (h.type === 'number' ? Number(h.target_value) || 0 : 1);

export const weeklyN = (h) => Math.min(7, Math.max(1, Number(h.days_per_week) || 7));
