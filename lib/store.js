// Загрузка всех привычек (с паузами) и отметок — для достижений и планировщика.
const toArray = (v) => (Array.isArray(v) ? v : String(v ?? '').replace(/[{}]/g, '').split(',').filter(Boolean)).map(Number);

export async function loadAll(db, { since = null } = {}) {
  const h = await db.query(`SELECT * FROM habits ORDER BY sort, id`);
  const p = await db.query(`SELECT habit_id, from_day, to_day, reason FROM habit_pauses`);
  const c = since
    ? await db.query(`SELECT habit_id, day, value FROM completions WHERE day >= $1`, [since])
    : await db.query(`SELECT habit_id, day, value FROM completions`);
  const pausesBy = {};
  for (const x of p.rows) (pausesBy[x.habit_id] ||= []).push({ from_day: x.from_day, to_day: x.to_day, reason: x.reason });
  const habits = h.rows.map(x => ({
    ...x,
    target_value: x.target_value === null ? null : Number(x.target_value),
    active_days: toArray(x.active_days),
    pauses: pausesBy[x.id] || []
  }));
  const comp = {};
  for (const x of c.rows) (comp[x.habit_id] ||= {})[x.day] = x.value;
  return { habits, comp };
}
