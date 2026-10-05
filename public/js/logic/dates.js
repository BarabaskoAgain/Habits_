// Даты — локальные строки 'YYYY-MM-DD'. Лист графа модулей: ничего не импортирует.
// Арифметика по UTC-полудню: переход на летнее время не съедает и не дублирует день.

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const toUtc = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};
const fromUtc = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;

export function addDays(key, n) {
  const dt = toUtc(key);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUtc(dt);
}

export const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);

// 0 = понедельник … 6 = воскресенье
export const weekdayIndex = (key) => (toUtc(key).getUTCDay() + 6) % 7;
export const weekStart = (key) => addDays(key, -weekdayIndex(key));

export const monthStart = (key) => key.slice(0, 8) + '01';
export function monthEnd(key) {
  const [y, m] = key.split('-').map(Number);
  return fromUtc(new Date(Date.UTC(y, m, 0, 12)));
}
export function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1, 12));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function plural(n, [one, few, many]) {
  const a = Math.abs(Math.trunc(n)) % 100, b = a % 10;
  if (!Number.isInteger(n)) return few;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}
