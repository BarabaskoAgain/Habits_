// Достижения (SPEC §8): чистая функция по данным. Сервер записывает новые, клиент показывает.
import { isCounter, isDone } from './life.js';
import { bestStreak } from './streaks.js';
import { allTime } from './totals.js';

export const ACHIEVEMENTS = [
  { code: 'first_step', icon: '🌱', name: 'Первый шаг', desc: 'Первая выполненная отметка', goal: 1 },
  { code: 'streak_7', icon: '🔥', name: 'Неделя силы', desc: 'Серия 7 дней подряд', goal: 7 },
  { code: 'streak_30', icon: '🌟', name: 'Месячный марафон', desc: 'Серия 30 дней подряд', goal: 30 },
  { code: 'fifty', icon: '⭐', name: 'Полсотни', desc: '50 выполненных дней по всем привычкам', goal: 50 },
  { code: 'thousand', icon: '📊', name: 'Тысячник', desc: '1000 единиц в одной количественной привычке', goal: 1000 }
];

// [{ ...достижение, value, done }] — value для полоски прогресса
export function achievementProgress(habits, comp, today) {
  let doneDays = 0, bestDays = 0, maxSum = 0;
  for (const h of habits) {
    const marks = comp[h.id] || {};
    for (const d in marks) if (d <= today && isDone(h, marks[d])) doneDays++;
    if (!isCounter(h)) {
      const b = bestStreak(h, marks, today);
      const days = b ? b.value * (b.unit === 'week' ? 7 : 1) : 0;
      if (days > bestDays) bestDays = days;
    }
    if (h.type === 'number') maxSum = Math.max(maxSum, allTime(h, marks, today).sum);
  }
  const value = { first_step: Math.min(doneDays, 1), streak_7: bestDays, streak_30: bestDays, fifty: doneDays, thousand: maxSum };
  return ACHIEVEMENTS.map(a => ({ ...a, value: value[a.code], done: value[a.code] >= a.goal }));
}
