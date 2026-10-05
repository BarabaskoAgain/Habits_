// Перенос данных v1 → v2:
// - schedule: days_per_week < 7 → weekly, иначе daily (как isWeekly в v1);
// - created_day = min(created_day, самая ранняя отметка): v1 сдвигал старт по отметкам задним числом;
// - sort = id;
// - архивные v1 получают открытую паузу с from_day = (день архивации по Киеву) + 1.
import { kyivDay } from '../lib/time.js';
import { addDays } from '../public/js/logic/dates.js';

export async function up(client) {
  const habits = await client.query(`SELECT id, days_per_week, created_day, archived_at FROM habits`);
  for (const h of habits.rows) {
    const first = await client.query(`SELECT MIN(day) AS d FROM completions WHERE habit_id=$1`, [h.id]);
    const firstDay = first.rows[0]?.d;
    const created = firstDay && firstDay < h.created_day ? firstDay : h.created_day;
    const schedule = Number(h.days_per_week) < 7 ? 'weekly' : 'daily';
    await client.query(`UPDATE habits SET schedule=$1, created_day=$2, sort=$3 WHERE id=$3`,
      [schedule, created, h.id]);
    if (h.archived_at) {
      await client.query(`INSERT INTO habit_pauses (habit_id, from_day, to_day, reason) VALUES ($1,$2,NULL,'paused')`,
        [h.id, addDays(kyivDay(new Date(h.archived_at)), 1)]);
    }
  }
}
