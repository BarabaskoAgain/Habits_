// Планировщик (раз в минуту из server.js): автоархив по сроку, напоминания, сводки.
// Каждое действие «забирается» атомарно (claim), поэтому повторный тик или вторая копия сервера не шлют дублей.
import { addDays, weekStart, weekdayIndex } from '../public/js/logic.js';
import { kyivNow, inWindow, dueReminders, morningDigest, eveningDigest, weekDigest } from './reminders.js';
import { loadAll } from './store.js';

export const DIGESTS = {
  digest_morning: { def: { on: true, time: '08:00' }, build: morningDigest },
  digest_evening: { def: { on: true, time: '21:00' }, build: eveningDigest },
  digest_week: { def: { on: true, time: '20:00' }, build: weekDigest, sundayOnly: true }
};

async function getSetting(db, key, def) {
  const q = await db.query(`SELECT value FROM settings WHERE key=$1`, [key]);
  return q.rows[0] ? q.rows[0].value : def; // JSONB драйвер уже разобрал
}

// Истёкший срок → пауза «ended» с дня после срока (открытая пауза уже есть — ничего не делаем)
async function archiveEnded(db, day) {
  // без коррелированного подзапроса: pg-mem в тестах его не поддерживает
  const q = await db.query(`SELECT id, end_day FROM habits WHERE end_day IS NOT NULL AND end_day < $1`, [day]);
  const open = new Set((await db.query(`SELECT habit_id FROM habit_pauses WHERE to_day IS NULL`)).rows.map(r => r.habit_id));
  const todo = q.rows.filter(h => !open.has(h.id));
  for (const h of todo) {
    try {
      await db.query(`INSERT INTO habit_pauses (habit_id, from_day, reason) VALUES ($1,$2,'ended')`, [h.id, addDays(h.end_day, 1)]);
    } catch (e) {
      if (e.code !== '23505' && !/duplicate|unique/i.test(e.message)) throw e;
    }
  }
  return todo.length;
}

// Забрать ключ «отправлено сегодня»: true, если этот тик первый
async function claimSetting(db, key, day) {
  const cur = await getSetting(db, key, null);
  if (cur === day) return false;
  await db.query(`INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [key, JSON.stringify(day)]);
  return true;
}

export async function tick(db, pusher, now = kyivNow()) {
  const { day, hm } = now;
  const result = { archived: await archiveEnded(db, day), reminders: 0, digests: 0 };
  if (!pusher.enabled() || !(await getSetting(db, 'push_enabled', true))) return result;

  // для напоминаний и сводок хватает текущей недели
  const { habits, comp } = await loadAll(db, { since: weekStart(day) });

  for (const h of dueReminders(habits, comp, now)) {
    const claim = await db.query(
      `UPDATE habits SET last_reminded_day=$1 WHERE id=$2 AND (last_reminded_day IS NULL OR last_reminded_day <> $1) RETURNING id`,
      [day, h.id]);
    if (!claim.rows[0]) continue;
    await pusher.sendAll({ title: '🎯 Время для привычки!', body: `Пора выполнить: ${h.name}`, tag: `habit-${h.id}`, url: '/' });
    result.reminders++;
  }

  for (const [key, { def, build, sundayOnly }] of Object.entries(DIGESTS)) {
    const cfg = { ...def, ...(await getSetting(db, key, def)) };
    if (!cfg.on || !inWindow(hm, cfg.time) || (sundayOnly && weekdayIndex(day) !== 6)) continue;
    const msg = build(habits, comp, day);
    if (!msg || !(await claimSetting(db, 'sent_' + key, day))) continue;
    await pusher.sendAll({ ...msg, url: '/' });
    result.digests++;
  }
  return result;
}
