// API привычек v2 (SPEC §0, §12): выдача всего разом, сохранение, порядок, архив через паузы, отметки.
import express from 'express';
import { kyivDay } from '../lib/time.js';
import { addDays } from '../public/js/logic/dates.js';
import { inLife } from '../public/js/logic/life.js';
import { achievementProgress } from '../public/js/logic/achievements.js';
import { loadAll } from '../lib/store.js';

// Новые достижения после изменения данных: пишем в таблицу и возвращаем коды (клиент покажет «Новое достижение!»)
export async function unlockAchievements(db) {
  const { habits, comp } = await loadAll(db);
  const have = new Set((await db.query(`SELECT code FROM achievements`)).rows.map(r => r.code));
  const fresh = achievementProgress(habits, comp, kyivDay()).filter(a => a.done && !have.has(a.code)).map(a => a.code);
  for (const code of fresh) await db.query(`INSERT INTO achievements (code) VALUES ($1) ON CONFLICT (code) DO NOTHING`, [code]);
  return fresh;
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TYPES = ['boolean', 'number'];
const SCHEDULES = ['daily', 'days', 'weekly'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function isValidDay(s) {
  const m = DAY_RE.exec(String(s ?? ''));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// Управляющие символы (NUL ломает Postgres, bidi-переключатели путают отображение) вычищаем.
// multiline — для описаний и заметок: переводы строк остаются.
const CTRL_LINE = /[\u0000-\u001F\u007F‎‏‪-‮⁦-⁩]/g;
const CTRL_TEXT = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F‎‏‪-‮⁦-⁩]/g;
export const clean = (v, multiline = false) =>
  (typeof v === 'string' ? v : '').replace(multiline ? CTRL_TEXT : CTRL_LINE, '').trim();

// Обрезка по целым символам (графемам): эмодзи-семья и суррогатные пары не режутся пополам
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ru', { granularity: 'grapheme' }) : null;
const cut = (s, max) => (segmenter ? [...segmenter.segment(s)].map(x => x.segment) : Array.from(s)).slice(0, max).join('');

export const str = (v, max, multiline = false) => cut(clean(v, multiline), max);

// Штучные единицы — только целые числа; дробные допустимы для часов, литров, км и своих единиц
export const INT_UNITS = new Set(['раз', 'мин', 'стр', 'партии', 'подходы', 'упр', 'шт', 'стаканы', 'шаги']);

// id из пути/тела: целое в пределах INT, иначе null (-> 404, а не 500 от pg)
export const toId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 2 ** 31 ? n : null;
};

// Лимит значения за день: минуты ≤ 1440, часы ≤ 24, иначе max(10 × цель, 10000)
export const maxValue = (h) =>
  h.unit === 'мин' ? 1440 : h.unit === 'ч' ? 24 : Math.max(10 * (Number(h.target_value) || 0), 10000);

const toArray = (v) => (Array.isArray(v) ? v : String(v ?? '').replace(/[{}]/g, '').split(',').filter(Boolean)).map(Number);

const parseForms = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
const MAX_PAST_DAYS = 3650; // дата старта — не древнее 10 лет (иначе клиент перебирает сотни тысяч дней)

// Возвращает { habit } или { error }. existing — текущая запись при правке:
// не переданные поля берутся из неё (частичная правка ничего не затирает).
// soft — импорт: старое длинное или короткое название мягко обрезается, а не отклоняется.
export function parseHabit(b, existing = null, today = kyivDay(), { soft = false } = {}) {
  const prev = existing ? {
    ...existing, unit_forms: parseForms(existing.unit_forms), active_days: toArray(existing.active_days)
  } : {};
  const v = (k, def) => (b[k] !== undefined ? b[k] : (prev[k] !== undefined ? prev[k] : def));

  const rawName = typeof b.name === 'string' ? clean(b.name) : (existing?.name ?? '');
  const name = soft ? cut(rawName, 50) : rawName;
  const keepsOldName = existing && name === existing.name;
  if (!keepsOldName && (name.length < (soft ? 1 : 3) || name.length > 50)) return { error: 'bad name' };
  if (keepsOldName && (name.length < 1 || name.length > 60)) return { error: 'bad name' };

  const type = existing ? existing.type : b.type;
  if (!TYPES.includes(type)) return { error: 'bad type' };
  if (existing && b.type !== undefined && b.type !== existing.type) return { error: 'type locked' };

  const color = v('color', '#FF6A00');
  if (typeof color !== 'string' || !COLOR_RE.test(color)) return { error: 'bad color' };

  const unit = type === 'number' ? str(v('unit', ''), 20) : '';
  if (existing && type === 'number' && b.unit !== undefined && unit !== (existing.unit || '')) return { error: 'unit locked' };

  let target = null;
  const rawTarget = v('target_value', null);
  if (type === 'number' && rawTarget !== null && rawTarget !== '') {
    target = Number(rawTarget);
    const cap = unit === 'мин' ? 1440 : unit === 'ч' ? 24 : 10000;
    if (!Number.isFinite(target) || target <= 0 || target > cap) return { error: 'bad target_value' };
    if (INT_UNITS.has(unit) && !Number.isInteger(target)) return { error: 'bad target_value' };
  }

  let unitForms = null;
  const rawForms = type === 'number' ? v('unit_forms', null) : null;
  if (rawForms !== null) {
    const ok = Array.isArray(rawForms) && rawForms.length === 3 &&
      rawForms.every(f => typeof f === 'string' && clean(f) && clean(f).length <= 20);
    if (!ok) return { error: 'bad unit_forms' };
    unitForms = rawForms.map(f => clean(f));
  }

  // Счётчик без цели — чистый учёт, расписание ему не нужно
  let schedule = v('schedule', 'daily');
  if (!SCHEDULES.includes(schedule)) return { error: 'bad schedule' };
  let activeDays = ALL_DAYS, dpw = 7;
  if (type === 'number' && target === null) schedule = 'daily';
  if (schedule === 'days') {
    const raw = v('active_days', []);
    const days = Array.isArray(raw) ? [...new Set(raw)] : [];
    if (!days.length || !days.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) return { error: 'bad active_days' };
    activeDays = days.sort((x, y) => x - y);
  }
  if (schedule === 'weekly') {
    dpw = Number(v('days_per_week', 0));
    if (!Number.isInteger(dpw) || dpw < 1 || dpw > 6) return { error: 'bad days_per_week' };
  }

  const createdDay = v('created_day', undefined);
  if (!isValidDay(createdDay) || createdDay < addDays(today, -MAX_PAST_DAYS) || createdDay > addDays(today, 1)) {
    return { error: 'bad created_day' };
  }
  const endDay = v('end_day', null);
  if (endDay !== null && (!isValidDay(endDay) || endDay < createdDay)) return { error: 'bad end_day' };

  const reminderTime = v('reminder_time', null);
  if (reminderTime !== null && !TIME_RE.test(reminderTime)) return { error: 'bad reminder_time' };

  return {
    habit: {
      name,
      description: str(v('description', ''), 150, true),
      icon: str(v('icon', ''), 2) || '✅',
      color,
      category: str(v('category', ''), 40),
      type,
      target_value: target,
      unit,
      unit_forms: unitForms ? JSON.stringify(unitForms) : null,
      schedule,
      active_days: activeDays,
      days_per_week: dpw,
      created_day: createdDay,
      end_day: endDay,
      reminder_enabled: v('reminder_enabled', false) === true,
      reminder_time: reminderTime
    }
  };
}

async function loadHabit(db, id) {
  const q = await db.query(`SELECT * FROM habits WHERE id=$1`, [id]);
  if (!q.rows[0]) return null;
  const p = await db.query(`SELECT from_day, to_day, reason FROM habit_pauses WHERE habit_id=$1`, [id]);
  return { ...q.rows[0], pauses: p.rows };
}

export function habitsRouter(db) {
  const r = express.Router();

  r.get('/api/data', async (_req, res, next) => {
    try {
      const today = kyivDay();
      const h = await db.query(`SELECT * FROM habits ORDER BY sort, id`);
      const p = await db.query(`SELECT habit_id, from_day, to_day, reason FROM habit_pauses ORDER BY from_day`);
      const c = await db.query(`SELECT habit_id, day, value, note FROM completions`);
      // служебные ключи планировщика (sent_*) клиенту не отдаём
      const s = await db.query(`SELECT key, value FROM settings WHERE key NOT LIKE 'sent_%'`);
      const a = await db.query(`SELECT code, unlocked_at FROM achievements ORDER BY unlocked_at`);
      const pausesBy = {};
      for (const x of p.rows) (pausesBy[x.habit_id] ||= []).push({ from_day: x.from_day, to_day: x.to_day, reason: x.reason });
      const habits = h.rows.map(x => {
        const pauses = pausesBy[x.id] || [];
        return {
          id: x.id, name: x.name, description: x.description, icon: x.icon, color: x.color,
          category: x.category, type: x.type, target_value: x.target_value, unit: x.unit,
          unit_forms: parseForms(x.unit_forms), schedule: x.schedule, active_days: toArray(x.active_days),
          days_per_week: x.days_per_week, created_day: x.created_day, end_day: x.end_day,
          reminder_enabled: x.reminder_enabled, reminder_time: x.reminder_time, sort: x.sort, pauses,
          archived: pauses.some(q => q.to_day === null) || (!!x.end_day && x.end_day < today)
        };
      });
      res.json({
        today,
        habits,
        completions: c.rows.map(x => (x.note ? [x.habit_id, x.day, x.value, x.note] : [x.habit_id, x.day, x.value])),
        settings: Object.fromEntries(s.rows.map(x => [x.key, x.value])), // JSONB драйвер уже разобрал
        achievements: a.rows
      });
    } catch (e) { next(e); }
  });

  r.post('/api/habits', async (req, res, next) => {
    try {
      const b = req.body || {};
      const hasId = b.id !== undefined && b.id !== null;
      const id = hasId ? toId(b.id) : null;
      const existing = id ? await loadHabit(db, id) : null;
      if (hasId && !existing) return res.status(404).json({ error: 'not found' });
      const { habit: h, error } = parseHabit(b, existing);
      if (error) return res.status(400).json({ error });
      const fields = [h.name, h.description, h.icon, h.color, h.category, h.target_value, h.unit, h.unit_forms,
        h.schedule, h.active_days, h.days_per_week, h.created_day, h.end_day, h.reminder_enabled, h.reminder_time];
      if (existing) {
        // Отметки не должны выпасть из жизни привычки (иначе суммы и план разойдутся)
        const span = await db.query(`SELECT MIN(day) AS lo, MAX(day) AS hi FROM completions WHERE habit_id=$1`, [id]);
        const { lo, hi } = span.rows[0] || {};
        if (lo && lo < h.created_day) return res.status(400).json({ error: 'marks before start' });
        if (hi && h.end_day && hi > h.end_day) return res.status(400).json({ error: 'marks after end' });
        await db.query(
          `UPDATE habits SET name=$1, description=$2, icon=$3, color=$4, category=$5, target_value=$6, unit=$7,
             unit_forms=$8, schedule=$9, active_days=$10, days_per_week=$11, created_day=$12, end_day=$13,
             reminder_enabled=$14, reminder_time=$15 WHERE id=$16`, [...fields, id]);
        return res.json({ id });
      }
      const max = await db.query(`SELECT COALESCE(MAX(sort), 0) AS m FROM habits`);
      const q = await db.query(
        `INSERT INTO habits (name, description, icon, color, category, target_value, unit, unit_forms, schedule,
           active_days, days_per_week, created_day, end_day, reminder_enabled, reminder_time, type, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
        [...fields, h.type, Number(max.rows[0].m) + 1]);
      res.json({ id: q.rows[0].id });
    } catch (e) { next(e); }
  });

  // Порядок: ровно полный набор существующих привычек, без дублей
  r.post('/api/habits/order', async (req, res, next) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(toId) : [];
      const all = (await db.query(`SELECT id FROM habits`)).rows.map(x => x.id);
      const ok = ids.length === all.length && ids.every(Boolean) && new Set(ids).size === ids.length &&
        all.every(x => ids.includes(x));
      if (!ok) return res.status(400).json({ error: 'bad ids' });
      for (let i = 0; i < ids.length; i++) await db.query(`UPDATE habits SET sort=$1 WHERE id=$2`, [i + 1, ids[i]]);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // Архив = открытая пауза с завтрашнего дня; восстановление закрывает её сегодняшним днём.
  // День — только серверный (по Киеву): клиент не может «заархивировать с 2000 года».
  r.post('/api/habits/:id/archive', async (req, res, next) => {
    try {
      const id = toId(req.params.id);
      const h = id && await loadHabit(db, id);
      if (!h) return res.status(404).json({ error: 'not found' });
      const today = kyivDay();
      const day = today;
      const open = h.pauses.find(p => p.to_day === null);
      if (req.body?.archived === true) {
        if (!open) {
          try {
            await db.query(`INSERT INTO habit_pauses (habit_id, from_day, reason) VALUES ($1,$2,'paused')`, [id, addDays(day, 1)]);
          } catch (e) {
            // параллельный запрос уже открыл паузу (уникальный индекс habit_pauses_open)
            if (e.code !== '23505' && !/duplicate|unique/i.test(e.message)) throw e;
          }
        }
        return res.json({ ok: true });
      }
      const expired = !!h.end_day && h.end_day < today;
      if (expired) {
        if (!('end_day' in (req.body || {}))) return res.status(409).json({ error: 'expired' });
        const end = req.body.end_day;
        if (end !== null && (!isValidDay(end) || end < today)) return res.status(400).json({ error: 'bad end_day' });
        await db.query(`UPDATE habits SET end_day=$1 WHERE id=$2`, [end, id]);
      }
      if (open) {
        if (day <= open.from_day) {
          await db.query(`DELETE FROM habit_pauses WHERE habit_id=$1 AND to_day IS NULL`, [id]);
        } else {
          await db.query(`UPDATE habit_pauses SET to_day=$1 WHERE habit_id=$2 AND to_day IS NULL`, [day, id]);
        }
      }
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  r.delete('/api/habits/:id', async (req, res, next) => {
    try {
      const id = toId(req.params.id);
      if (!id) return res.status(404).json({ error: 'not found' });
      // отметки и паузы уходят каскадом (ON DELETE CASCADE)
      const q = await db.query(`DELETE FROM habits WHERE id=$1 RETURNING id`, [id]);
      if (!q.rows[0]) return res.status(404).json({ error: 'not found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // Отметка дня. mode: set (по умолчанию) | add. Ответ — итог с сервера: { value, note }.
  r.post('/api/mark', async (req, res, next) => {
    try {
      const b = req.body || {};
      const mode = b.mode === 'add' ? 'add' : 'set';
      if (!isValidDay(b.day)) return res.status(400).json({ error: 'bad day' });
      const v = b.value;
      const empty = v === null || v === undefined || v === 0;
      if (!empty && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) return res.status(400).json({ error: 'bad value' });
      if (mode === 'add' && (empty || v <= 0)) return res.status(400).json({ error: 'bad value' });
      if (b.note !== undefined && typeof b.note !== 'string') return res.status(400).json({ error: 'bad note' });
      const id = toId(b.habit_id);
      const h = id && await loadHabit(db, id);
      if (!h) return res.status(404).json({ error: 'not found' });
      const isBool = h.type === 'boolean';
      if (!isBool && !empty && INT_UNITS.has(h.unit) && !Number.isInteger(v)) return res.status(400).json({ error: 'bad value' });

      const hasNote = b.note !== undefined;
      const newNote = hasNote ? str(b.note, 200, true) : '';
      // Снять отметку без заметки можно в любой день (уборка старых данных вне жизни привычки)
      if (mode === 'set' && empty && !newNote) {
        await db.query(`DELETE FROM completions WHERE habit_id=$1 AND day=$2`, [id, b.day]);
        return res.json({ value: null, note: '', achievements: [] });
      }
      if (b.day > addDays(kyivDay(), 1) || !inLife(h, b.day)) return res.status(400).json({ error: 'day out of life' });
      const max = maxValue(h);
      // Заметку обновляем, только если её прислали; иначе остаётся прежняя
      const noteSet = hasNote ? ', note=EXCLUDED.note' : '';

      if (mode === 'add') {
        const delta = isBool ? 1 : v;
        if (delta > max) return res.status(400).json({ error: 'too much' });
        // Быстрая проверка по текущему итогу; от гонок защищает условие в самом UPDATE ниже
        if (!isBool) {
          const cur = await db.query(`SELECT value FROM completions WHERE habit_id=$1 AND day=$2`, [id, b.day]);
          if ((Number(cur.rows[0]?.value) || 0) + delta > max) return res.status(400).json({ error: 'too much' });
        }
        // Лимит — в условии того же UPDATE: параллельные «+» не перепрыгнут его.
        // Строки нет — INSERT … DO NOTHING; если её вставил параллельный запрос — ещё раз UPDATE.
        const upd = isBool
          ? () => db.query(
            `UPDATE completions SET value=1${hasNote ? ', note=$3' : ''}
             WHERE habit_id=$1 AND day=$2 RETURNING value, note`,
            hasNote ? [id, b.day, newNote] : [id, b.day])
          : () => db.query(
            `UPDATE completions SET value = value + $3${hasNote ? ', note=$5' : ''}
             WHERE habit_id=$1 AND day=$2 AND value + $3 <= $4 RETURNING value, note`,
            hasNote ? [id, b.day, delta, max, newNote] : [id, b.day, delta, max]);
        let q = await upd();
        if (!q.rows[0]) {
          q = await db.query(
            `INSERT INTO completions (habit_id, day, value, note) VALUES ($1,$2,$3,$4)
             ON CONFLICT (habit_id, day) DO NOTHING RETURNING value, note`, [id, b.day, delta, newNote]);
          if (!q.rows[0]) q = await upd();
        }
        if (!q.rows[0]) return res.status(400).json({ error: 'too much' });
        return res.json({ value: q.rows[0].value, note: q.rows[0].note, achievements: await unlockAchievements(db) });
      }

      const note = newNote;
      if (empty) {
        // сюда доходим только с заметкой: строка «заметка без отметки», value = 0
        await db.query(
          `INSERT INTO completions (habit_id, day, value, note) VALUES ($1,$2,0,$3)
           ON CONFLICT (habit_id, day) DO UPDATE SET value=0, note=EXCLUDED.note`, [id, b.day, note]);
        return res.json({ value: 0, note, achievements: [] });
      }
      const value = isBool ? 1 : v;
      if (value > max) return res.status(400).json({ error: 'too much' });
      const q = await db.query(
        `INSERT INTO completions (habit_id, day, value, note) VALUES ($1,$2,$3,$4)
         ON CONFLICT (habit_id, day) DO UPDATE SET value=EXCLUDED.value${noteSet}
         RETURNING value, note`, [id, b.day, value, note]);
      res.json({ value: q.rows[0].value, note: q.rows[0].note, achievements: await unlockAchievements(db) });
    } catch (e) { next(e); }
  });

  return r;
}
