// Форматирование и экранирование для innerHTML-шаблонов.
import { addDays, weekdayIndex, plural } from './logic.js';
import { unitOf } from './consts.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

export const WD_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_LONG = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const DAY_WORDS = ['день', 'дня', 'дней'];
export const WEEK_WORDS = ['неделя', 'недели', 'недель'];

const parts = (key) => key.split('-').map(Number);

export function dayLong(key) {
  const [, m, d] = parts(key);
  return `${WD_LONG[weekdayIndex(key)]}, ${d} ${MONTHS_GEN[m - 1]}`;
}
export function dayShort(key, withYear = false) {
  const [y, m, d] = parts(key);
  return `${d} ${MONTHS_GEN[m - 1]}${withYear ? ' ' + y : ''}`;
}
export const dayWd = (key) => `${WD_SHORT[weekdayIndex(key)].toLowerCase()}, ${dayShort(key)}`;
export function weekRange(start) {
  const end = addDays(start, 6);
  const [, m1, d1] = parts(start);
  const [, m2, d2] = parts(end);
  return m1 === m2 ? `${d1}–${d2} ${MONTHS_GEN[m2 - 1]}` : `${d1} ${MONTHS_GEN[m1 - 1]} – ${d2} ${MONTHS_GEN[m2 - 1]}`;
}
export function dateRange(a, b) {
  if (a === b) return dayShort(a, true);
  const [y1, m1, d1] = parts(a), [y2, m2, d2] = parts(b);
  if (y1 !== y2) return `${dayShort(a, true)} – ${dayShort(b, true)}`;
  if (m1 !== m2) return `${d1} ${MONTHS_GEN[m1 - 1]} – ${d2} ${MONTHS_GEN[m2 - 1]} ${y2}`;
  return `${d1}–${d2} ${MONTHS_GEN[m2 - 1]} ${y2}`;
}

export const num = (v, digits = 2) => Number(v).toLocaleString('ru-RU', { maximumFractionDigits: digits });

// Полупрозрачный цвет привычки: '#RRGGBB' + альфа
export const tint = (hex, alpha) => hex + Math.round(alpha * 255).toString(16).padStart(2, '0');

const unitForms = (h) => h.unit_forms || unitOf(h.unit)?.forms || null;

// Слово единицы под число: «1 партия», «2 партии», «5 партий»
export function unitWord(h, v) {
  const forms = unitForms(h);
  return forms ? plural(Number(v), forms) : (h.unit || '');
}

// Значение привычки: минуты → «1 ч 30 мин», часы дробные, склонения; short — для узких ячеек
export function fmtValue(h, v, { short = false } = {}) {
  const n = Number(v) || 0;
  if (h.type !== 'number') return short ? (n ? '✓' : '') : `${n} ${plural(n, DAY_WORDS)}`;
  if (h.unit === 'мин') {
    const t = Math.round(n); // сначала округлить, иначе 119,5 → «1 ч 60 мин»
    const hh = Math.floor(t / 60), mm = t % 60;
    if (short) return hh ? `${hh}ч${mm ? String(mm).padStart(2, '0') : ''}` : String(mm);
    if (!hh) return `${mm} мин`;
    return mm ? `${hh} ч ${mm} мин` : `${hh} ч`;
  }
  if (h.unit === 'ч') return short ? num(n, 1) : `${num(n, 1)} ч`;
  if (short) return n > 999 ? (n >= 10000 ? `${Math.floor(n / 1000)}к` : '999+') : num(n, 1);
  const word = unitWord(h, n);
  return word ? `${num(n)} ${word}` : num(n);
}

// Цель коротко: «50 раз», «20 мин», «без цели»
export const fmtTarget = (h) => (Number(h.target_value) > 0 ? fmtValue(h, h.target_value) : 'без цели');

export function fmtStreak(s) {
  if (!s) return '';
  return `${s.value} ${plural(s.value, s.unit === 'week' ? WEEK_WORDS : DAY_WORDS)}`;
}

export function scheduleText(h) {
  if (h.type === 'number' && !(Number(h.target_value) > 0)) return 'Учёт без плана';
  if (h.schedule === 'weekly') return `${h.days_per_week} ${plural(h.days_per_week, ['раз', 'раза', 'раз'])} в неделю`;
  if (h.schedule === 'days') return h.active_days.map(d => WD_SHORT[d]).join(', ');
  return 'Каждый день';
}

// Цвет процента (пороги Core2): 100 / ≥75 / ≥50 / ≥25 / ниже
export function pctClass(p) {
  if (p === null || p === undefined) return '';
  if (p >= 100) return 'p100';
  if (p >= 75) return 'p75';
  if (p >= 50) return 'p50';
  if (p >= 25) return 'p25';
  return 'p0';
}
