// Дневник (SPEC §9a): описание дня и события дня. Парсеры общие с импортом (routes/data.js).
import express from 'express';
import { kyivDay } from '../lib/time.js';
import { addDays, daysBetween } from '../public/js/logic/dates.js';
import { KIND_CODES } from '../public/js/logic/diary.js';
import { isValidDay, str, toId } from './habits.js';

const MAX_PAST_DAYS = 3650;
const MAX_SPAN = 400; // за раз — не больше года с запасом

// День дневника: не древнее 10 лет и не дальше завтрашнего (как отметки)
const dayOk = (d, today) => isValidDay(d) && d >= addDays(today, -MAX_PAST_DAYS) && d <= addDays(today, 1);

export function parseDiaryDay(b, today = kyivDay()) {
  if (!dayOk(b?.day, today)) return { error: 'bad day' };
  if (b.text !== undefined && typeof b.text !== 'string') return { error: 'bad text' };
  return { entry: { day: b.day, text: str(b.text, 500, true) } };
}

export function parseEvent(b, today = kyivDay()) {
  if (!dayOk(b?.day, today)) return { error: 'bad day' };
  if (!KIND_CODES.has(b.kind)) return { error: 'bad kind' };
  if (typeof b.title !== 'string') return { error: 'bad title' };
  const title = str(b.title, 100);
  if (!title) return { error: 'bad title' };
  if (!Number.isInteger(b.rating) || b.rating < 1 || b.rating > 10) return { error: 'bad rating' };
  if (b.note !== undefined && b.note !== null && typeof b.note !== 'string') return { error: 'bad note' };
  return { event: { day: b.day, kind: b.kind, title, rating: b.rating, note: str(b.note, 200, true) } };
}

const EVENT_COLS = 'id, day, kind, title, rating, note';

export function diaryRouter(db) {
  const r = express.Router();

  r.get('/api/diary', async (req, res, next) => {
    try {
      const { from, to } = req.query;
      if (!isValidDay(from) || !isValidDay(to) || from > to || daysBetween(from, to) > MAX_SPAN) {
        return res.status(400).json({ error: 'bad range' });
      }
      const d = await db.query(`SELECT day, text FROM diary_days WHERE day >= $1 AND day <= $2 ORDER BY day`, [from, to]);
      const e = await db.query(
        `SELECT ${EVENT_COLS} FROM diary_events WHERE day >= $1 AND day <= $2 ORDER BY day, id`, [from, to]);
      res.json({ days: d.rows, events: e.rows });
    } catch (e) { next(e); }
  });

  // Пустой текст удаляет описание дня
  r.put('/api/diary/day', async (req, res, next) => {
    try {
      const { entry, error } = parseDiaryDay(req.body || {});
      if (error) return res.status(400).json({ error });
      if (!entry.text) {
        await db.query(`DELETE FROM diary_days WHERE day=$1`, [entry.day]);
      } else {
        await db.query(
          `INSERT INTO diary_days (day, text) VALUES ($1,$2) ON CONFLICT (day) DO UPDATE SET text=EXCLUDED.text`,
          [entry.day, entry.text]);
      }
      res.json(entry);
    } catch (e) { next(e); }
  });

  // Без id — новое событие, с id — правка
  r.post('/api/diary/events', async (req, res, next) => {
    try {
      const b = req.body || {};
      const { event: ev, error } = parseEvent(b);
      if (error) return res.status(400).json({ error });
      const vals = [ev.day, ev.kind, ev.title, ev.rating, ev.note];
      if (b.id !== undefined && b.id !== null) {
        const id = toId(b.id);
        const q = id && await db.query(
          `UPDATE diary_events SET day=$1, kind=$2, title=$3, rating=$4, note=$5 WHERE id=$6 RETURNING ${EVENT_COLS}`,
          [...vals, id]);
        if (!q?.rows[0]) return res.status(404).json({ error: 'not found' });
        return res.json({ event: q.rows[0] });
      }
      const q = await db.query(
        `INSERT INTO diary_events (day, kind, title, rating, note) VALUES ($1,$2,$3,$4,$5) RETURNING ${EVENT_COLS}`, vals);
      res.json({ event: q.rows[0] });
    } catch (e) { next(e); }
  });

  r.delete('/api/diary/events/:id', async (req, res, next) => {
    try {
      const id = toId(req.params.id);
      const q = id && await db.query(`DELETE FROM diary_events WHERE id=$1 RETURNING id`, [id]);
      if (!q?.rows[0]) return res.status(404).json({ error: 'not found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return r;
}
