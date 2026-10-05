// «💡 Анализ выполнения» и рекомендация на экране привычки (SPEC §4, тексты Core2).
// s — periodStats за последние 30 дней, streak — currentStreak. Счётчику без цели анализ не нужен.
import { plural } from './dates.js';
import { isCounter, unitPlan } from './life.js';

const DAYS = ['день', 'дня', 'дней'];
const WEEKS = ['неделю', 'недели', 'недель'];

export function insights(h, s, streak) {
  if (isCounter(h) || s.pct === null) return { items: [], tip: null };
  // Меньше трёх дней плана — рано судить
  if (s.plan < 3 * unitPlan(h)) {
    return { items: [{ icon: '🌱', tone: 'info', text: 'Пока мало данных для анализа. Отмечайте выполнение ещё несколько дней.' }], tip: null };
  }
  const items = [];
  const pct = s.pct;
  if (pct >= 90) items.push({ icon: '🎉', tone: 'good', text: 'Отличный результат! Вы почти идеально следуете этой привычке.' });
  else if (pct >= 70) items.push({ icon: '👍', tone: 'mid', text: 'Хороший прогресс! Немного больше последовательности, и результат будет отличным.' });
  else items.push({ icon: '💪', tone: 'low', text: 'Есть потенциал для улучшения. Попробуйте начать с малого и постепенно увеличивать нагрузку.' });

  const v = streak?.value || 0;
  if (streak?.unit === 'week' ? v >= 4 : v >= 7) {
    const w = streak.unit === 'week' ? WEEKS : DAYS;
    items.push({ icon: '🔥', tone: 'info', text: `У вас серия ${v} ${plural(v, w)} подряд! Продолжайте в том же духе.` });
  }
  // Перевыполнение — только когда план почти сделан, иначе «перевыполнено» рядом с «💪» сбивает с толку
  if (h.type === 'number' && pct >= 90 && s.sum > s.plan) {
    const over = Math.round(((s.sum - s.plan) / s.plan) * 100);
    if (over >= 1) items.push({ icon: '🚀', tone: 'good', text: `Цель перевыполнена на ${over}%!` });
  } else if (h.type !== 'number' && pct === 100) {
    items.push({ icon: '🚀', tone: 'good', text: 'Вы выполняете эту привычку стабильно!' });
  }

  const num = h.type === 'number';
  const tip = pct < 50
    ? (num ? 'Попробуйте уменьшить цель или выполнять привычку в одно и то же время каждый день.'
      : 'Попробуйте выполнять привычку в одно и то же время каждый день или выбрать меньше дней в неделю.')
    : pct < 80
      ? (h.reminder_enabled ? 'Вы на правильном пути! Посмотрите в календаре, в какие дни чаще пропускаете, и начните с них.'
        : 'Вы на правильном пути! Включите напоминание для дней, когда забываете о привычке.')
      : (num ? 'Отличная работа! Можете увеличить цель для большего прогресса.' : 'Отличная работа! Держите темп.');
  return { items, tip };
}
