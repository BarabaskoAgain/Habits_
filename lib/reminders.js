// Напоминания и сводки (SPEC §7) — чистые функции; отправку и cron делает lib/scheduler.js.
import {
  addDays, weekStart, isCounter, isArchived, isAllowed, isDone, weekInfo, plural
} from '../public/js/logic.js';
import { fmtValue } from '../public/js/fmt.js';

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

// «Сейчас» по Киеву: { day: 'YYYY-MM-DD', hm: 'HH:MM' } — сервер живёт в UTC
export function kyivNow(date = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(date).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}

const toMin = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

// Окно отправки: от заданного времени и 15 минут после (переживёт пропущенный тик cron / рестарт)
export const inWindow = (hm, time, windowMin = 15) => {
  const d = toMin(hm) - toMin(time);
  return d >= 0 && d < windowMin;
};

// Нужна ли сегодня привычка: допустимый день, не архив, не учёт; weekly — пока план недели не выполнен
function plannedToday(h, marks, day) {
  if (isCounter(h) || isArchived(h, day) || !isAllowed(h, day)) return false;
  if (h.schedule === 'weekly') {
    const w = weekInfo(h, marks, weekStart(day));
    return w.doneCount < w.wp || isDone(h, marks[day]);
  }
  return true;
}

export function dueReminders(habits, comp, { day, hm }) {
  return habits.filter(h => {
    if (!h.reminder_enabled || !h.reminder_time || h.last_reminded_day === day) return false;
    if (!inWindow(hm, h.reminder_time)) return false;
    const marks = comp[h.id] || {};
    return plannedToday(h, marks, day) && !isDone(h, marks[day]);
  });
}

const names = (list) => list.map(h => h.name).join(', ');

export function morningDigest(habits, comp, day) {
  const list = habits.filter(h => plannedToday(h, comp[h.id] || {}, day));
  if (!list.length) return null;
  return {
    title: `☀️ Сегодня ${list.length} ${plural(list.length, ['привычка', 'привычки', 'привычек'])}`,
    body: names(list), tag: 'digest-morning'
  };
}

export function eveningDigest(habits, comp, day) {
  const list = habits.filter(h => plannedToday(h, comp[h.id] || {}, day));
  const left = list.filter(h => !isDone(h, (comp[h.id] || {})[day]));
  if (!left.length) return null;
  return { title: `🌙 Осталось ${left.length} из ${list.length}`, body: names(left), tag: 'digest-evening' };
}

// Итог недели (в воскресенье): выполненные дни из плана + объёмы количественных привычек
export function weekDigest(habits, comp, day) {
  const ws = weekStart(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i)).filter(d => d <= day);
  let done = 0, plan = 0;
  const volumes = [];
  for (const h of habits) {
    const marks = comp[h.id] || {};
    if (!days.some(d => isAllowed(h, d))) continue;
    if (h.type === 'number') {
      const sum = days.reduce((s, d) => s + (Number(marks[d]) || 0), 0);
      if (sum > 0) volumes.push(`${h.name}: ${fmtValue(h, sum)}`);
    }
    if (isCounter(h)) continue;
    const allowed = days.filter(d => isAllowed(h, d));
    const p = h.schedule === 'weekly' ? weekInfo(h, marks, ws).wp : allowed.length;
    plan += p;
    done += Math.min(p, allowed.filter(d => isDone(h, marks[d])).length);
  }
  if (!plan && !volumes.length) return null;
  return {
    title: `📊 Итог недели: ${done} из ${plan}`,
    body: volumes.length ? volumes.join(' · ') : 'Отличная работа — так держать!',
    tag: 'digest-week'
  };
}
