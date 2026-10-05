// Данные (SPEC §9b): экспорт JSON/CSV, импорт «заменить всё», полный сброс.
// Импорт сначала целиком проверяется теми же парсерами, что API, и только потом пишет в базу.
import express from 'express';
import { kyivDay } from '../lib/time.js';
import { loadAll } from '../lib/store.js';
import { addDays } from '../public/js/logic/dates.js';
import { inLife } from '../public/js/logic/life.js';
import { ACHIEVEMENTS, achievementProgress } from '../public/js/logic/achievements.js';
import { DIARY_KINDS } from '../public/js/logic/diary.js';
import { parseHabit, unlockAchievements, isValidDay, maxValue, INT_UNITS, str, toId } from './habits.js';
import { parseDiaryDay, parseEvent } from './diary.js';
import { SETTINGS, normalizeSetting } from './settings.js';

const LIMITS = { habits: 500, pauses: 200, completions: 200_000, days: 20_000, events: 50_000 };
const REASONS = ['paused', 'ended'];
const ACH_CODES = new Set(ACHIEVEMENTS.map(a => a.code));
const KIND_NAME = Object.fromEntries(DIARY_KINDS.map(k => [k.code, k.name]));
const toArray = (v) => (Array.isArray(v) ? v : String(v ?? '').replace(/[{}]/g, '').split(',').filter(Boolean)).map(Number);
const parseForms = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

// Порядок удаления — от зависимых к главным; подписки устройств и служебные sent_* не трогаем
const WIPE = [
  `DELETE FROM completions`, `DELETE FROM habit_pauses`, `DELETE FROM habits`,
  `DELETE FROM diary_events`, `DELETE FROM diary_days`, `DELETE FROM achievements`,
  `DELETE FROM settings WHERE key NOT LIKE 'sent_%'`
];

async function readAll(db) {
  const h = await db.query(`SELECT * FROM habits ORDER BY sort, id`);
  const p = await db.query(`SELECT habit_id, from_day, to_day, reason FROM habit_pauses ORDER BY from_day`);
  const c = await db.query(`SELECT habit_id, day, value, note FROM completions ORDER BY habit_id, day`);
  const dd = await db.query(`SELECT day, text FROM diary_days ORDER BY day`);
  const de = await db.query(`SELECT day, kind, title, rating, note FROM diary_events ORDER BY day, id`);
  const a = await db.query(`SELECT code, unlocked_at FROM achievements ORDER BY unlocked_at`);
  const s = await db.query(`SELECT key, value FROM settings WHERE key NOT LIKE 'sent_%'`);
  const pausesBy = {};
  for (const x of p.rows) (pausesBy[x.habit_id] ||= []).push({ from_day: x.from_day, to_day: x.to_day, reason: x.reason });
  return {
    habits: h.rows.map(x => ({
      id: x.id, name: x.name, description: x.description, icon: x.icon, color: x.color, category: x.category,
      type: x.type, target_value: x.target_value === null ? null : Number(x.target_value), unit: x.unit,
      unit_forms: parseForms(x.unit_forms), schedule: x.schedule, active_days: toArray(x.active_days),
      days_per_week: x.days_per_week, created_day: x.created_day, end_day: x.end_day,
      reminder_enabled: x.reminder_enabled, reminder_time: x.reminder_time, pauses: pausesBy[x.id] || []
    })),
    completions: c.rows.map(x => [x.habit_id, x.day, Number(x.value), x.note || '']),
    diary: { days: dd.rows, events: de.rows },
    achievements: a.rows.map(x => ({ code: x.code, unlocked_at: new Date(x.unlocked_at).toISOString() })),
    settings: Object.fromEntries(s.rows.filter(x => Object.hasOwn(SETTINGS, x.key)).map(x => [x.key, x.value]))
  };
}

// Ячейка CSV: в кавычках; формулы (= + - @ Tab CR в начале) обезврежены апострофом
export function csvCell(v) {
  if (typeof v === 'number') return String(v).replace('.', ',');
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function toCsv(all) {
  const byId = new Map(all.habits.map(h => [h.id, h]));
  const rows = [];
  for (const [id, day, value, note] of all.completions) {
    const h = byId.get(id);
    rows.push([day, 'Привычка', h.name, h.type === 'number' ? value : (value > 0 ? 'да' : 'нет'), h.unit, note]);
  }
  for (const e of all.diary.events) rows.push([e.day, 'Дневник: ' + (KIND_NAME[e.kind] || e.kind), e.title, e.rating, 'из 10', e.note]);
  for (const d of all.diary.days) rows.push([d.day, 'Дневник: день', '', '', '', d.text]);
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const head = ['Дата', 'Раздел', 'Название', 'Значение', 'Единица', 'Заметка'];
  return '﻿' + [head, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

// Дата получения достижения: настоящая и не из будущего (иначе Postgres или toISOString упадут)
const saneDate = (s) => { const t = Date.parse(s); return t >= Date.UTC(2000, 0, 1) && t <= Date.now() + 86_400_000; };
const fail = (where, error) => ({ error: `${where}: ${error}` });
const list = (x) => (x === undefined || x === null ? [] : x);

// Отметки файла по старому id привычки: [hid, day, value, note] или { habit_id, day, value, note }
function groupMarks(src) {
  const marks = new Map();
  for (const [i, m] of src.entries()) {
    const [hid, day, value, note] = Array.isArray(m) ? m : [m?.habit_id, m?.day, m?.value, m?.note];
    const id = toId(hid);
    if (!id) return fail(`отметка ${i + 1}`, 'bad habit_id');
    (marks.get(id) || marks.set(id, []).get(id)).push({ day, value, note, i });
  }
  return { marks };
}

function parsePauses(raw) {
  if (!Array.isArray(raw) || raw.length > LIMITS.pauses) return { error: 'bad pauses' };
  const pauses = [];
  for (const p of raw) {
    const to = p?.to_day ?? null;
    const reason = p?.reason ?? 'paused';
    const ok = p && isValidDay(p.from_day) && (to === null || (isValidDay(to) && to > p.from_day)) && REASONS.includes(reason);
    if (!ok) return { error: 'bad pause' };
    pauses.push({ from_day: p.from_day, to_day: to, reason });
  }
  if (pauses.filter(p => p.to_day === null).length > 1) return { error: 'two open pauses' };
  return { pauses };
}

function parseImportHabit(src, marks, v1, today) {
  if (!src || typeof src !== 'object') return { error: 'bad habit' };
  const b = { ...src, unit_forms: typeof src.unit_forms === 'string' ? parseForms(src.unit_forms) : src.unit_forms };
  if (v1) {
    // v1: режим из days_per_week, старт сдвигается к первой отметке (как миграция 003)
    b.schedule = (Number(src.days_per_week) || 7) < 7 ? 'weekly' : 'daily';
    const first = (marks || []).map(m => m.day).filter(isValidDay).sort()[0];
    if (first && (!isValidDay(b.created_day) || first < b.created_day)) b.created_day = first;
  }
  const { habit, error } = parseHabit(b, null, today, { soft: true });
  if (error) return { error };
  if (v1) {
    const pauses = src.archived || src.archived_at ? [{ from_day: addDays(today, 1), to_day: null, reason: 'paused' }] : [];
    return { habit: { ...habit, pauses } };
  }
  const p = parsePauses(list(src.pauses));
  return p.error ? p : { habit: { ...habit, pauses: p.pauses } };
}

function parseMarks(marks, byOld, today) {
  const out = [];
  let skipped = 0;
  for (const [oldId, items] of marks) {
    const h = byOld.get(oldId);
    const seen = new Set();
    for (const m of items) {
      const where = `отметка ${m.i + 1}`;
      if (!h) return fail(where, 'нет такой привычки');
      if (!isValidDay(m.day) || m.day > addDays(today, 1)) return fail(where, 'bad day');
      if (seen.has(m.day)) return fail(where, 'повтор дня');
      seen.add(m.day);
      if (typeof m.value !== 'number' || !Number.isFinite(m.value) || m.value < 0) return fail(where, 'bad value');
      if (m.note !== undefined && m.note !== null && typeof m.note !== 'string') return fail(where, 'bad note');
      const note = str(m.note, 200, true);
      if (m.value === 0 && !note) continue; // пустая строка — переносить нечего
      const isBool = h.type === 'boolean';
      if (!isBool && INT_UNITS.has(h.unit) && !Number.isInteger(m.value)) return fail(where, 'bad value');
      // Такие отметки API мог оставить законно (отметка на завтра и потом архив, цель снизили позже):
      // из-за них не отказываем во всём файле, а пропускаем и показываем число в предпросмотре
      if ((isBool ? m.value > 1 : m.value > maxValue(h)) || !inLife(h, m.day)) { skipped++; continue; }
      out.push({ h, day: m.day, value: isBool && m.value > 0 ? 1 : m.value, note });
    }
  }
  return { completions: out, skipped };
}

function parseDiary(srcDays, srcEvents, today) {
  const days = [], seen = new Set();
  for (const [i, d] of srcDays.entries()) {
    const { entry, error } = parseDiaryDay(d || {}, today);
    if (error) return fail(`дневник, день ${i + 1}`, error);
    if (seen.has(entry.day)) return fail(`дневник, день ${i + 1}`, 'повтор дня');
    seen.add(entry.day);
    if (entry.text) days.push(entry);
  }
  const events = [];
  for (const [i, e] of srcEvents.entries()) {
    const { event, error } = parseEvent(e || {}, today);
    if (error) return fail(`дневник, событие ${i + 1}`, error);
    events.push(event);
  }
  return { days, events };
}

function parseSettings(src) {
  if (typeof src !== 'object' || src === null || Array.isArray(src)) return { error: 'настройки: bad settings' };
  const settings = [];
  for (const [k, v] of Object.entries(src)) {
    if (!Object.hasOwn(SETTINGS, k)) continue; // чужие и служебные ключи молча пропускаем
    if (!SETTINGS[k](v)) return fail(`настройка ${k}`, 'bad value');
    settings.push([k, normalizeSetting(k, v)]);
  }
  return { settings };
}

// Проверяет файл экспорта (version 1 или 2) целиком, до записи. Возвращает { plan, summary } или { error }.
export function validateImport(data, today = kyivDay()) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'не файл экспорта' };
  if (data.version !== 1 && data.version !== 2) return { error: 'неизвестная версия файла' };
  const v1 = data.version === 1;
  const srcHabits = list(data.habits), srcComp = list(data.completions);
  const srcDays = list(data.diary?.days), srcEvents = list(data.diary?.events);
  if (![srcHabits, srcComp, srcDays, srcEvents].every(Array.isArray)) return { error: 'не файл экспорта' };
  if (srcHabits.length > LIMITS.habits || srcComp.length > LIMITS.completions ||
      srcDays.length > LIMITS.days || srcEvents.length > LIMITS.events) return { error: 'слишком большой файл' };

  const g = groupMarks(srcComp);
  if (g.error) return g;
  const habits = [], byOld = new Map();
  for (const [i, src] of srcHabits.entries()) {
    const oldId = toId(src?.id);
    if (!oldId || byOld.has(oldId)) return fail(`привычка ${i + 1}`, 'bad id');
    const { habit, error } = parseImportHabit(src, g.marks.get(oldId), v1, today);
    if (error) return fail(`привычка ${i + 1}`, error);
    habits.push(habit); byOld.set(oldId, habit);
  }
  const c = parseMarks(g.marks, byOld, today);
  if (c.error) return c;
  const d = parseDiary(srcDays, srcEvents, today);
  if (d.error) return d;
  const s = parseSettings(data.settings ?? {});
  if (s.error) return s;
  // Достижения пересчитываются после записи; из файла берём только даты получения
  const unlocked = Array.isArray(data.achievements)
    ? data.achievements.filter(a => a && ACH_CODES.has(a.code) && saneDate(a.unlocked_at))
    : [];

  return {
    plan: { habits, completions: c.completions, days: d.days, events: d.events, settings: s.settings, unlocked },
    summary: {
      habits: habits.length,
      archived: habits.filter(h => h.pauses.some(p => p.to_day === null) || (h.end_day && h.end_day < today)).length,
      completions: c.completions.length,
      skipped: c.skipped,
      diaryDays: new Set([...d.days.map(x => x.day), ...d.events.map(x => x.day)]).size
    }
  };
}

// Многострочный INSERT порциями: тысячи отметок — десятки запросов, а не тысячи
async function insertMany(client, table, cols, rows, chunk = 500) {
  for (let i = 0; i < rows.length; i += chunk) {
    const params = [];
    const values = rows.slice(i, i + chunk)
      .map(r => '(' + r.map(v => { params.push(v); return '$' + params.length; }).join(',') + ')');
    await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values.join(',')}`, params);
  }
}

async function inTx(db, fn) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
}

async function writePlan(client, plan) {
  for (const q of WIPE) await client.query(q);
  const newId = new Map();
  for (const [i, h] of plan.habits.entries()) {
    const q = await client.query(
      `INSERT INTO habits (name, description, icon, color, category, target_value, unit, unit_forms, schedule,
         active_days, days_per_week, created_day, end_day, reminder_enabled, reminder_time, type, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [h.name, h.description, h.icon, h.color, h.category, h.target_value, h.unit, h.unit_forms, h.schedule,
        h.active_days, h.days_per_week, h.created_day, h.end_day, h.reminder_enabled, h.reminder_time, h.type, i + 1]);
    newId.set(h, q.rows[0].id);
  }
  await insertMany(client, 'habit_pauses', ['habit_id', 'from_day', 'to_day', 'reason'],
    plan.habits.flatMap(h => h.pauses.map(p => [newId.get(h), p.from_day, p.to_day, p.reason])));
  await insertMany(client, 'completions', ['habit_id', 'day', 'value', 'note'],
    plan.completions.map(c => [newId.get(c.h), c.day, c.value, c.note]));
  await insertMany(client, 'diary_days', ['day', 'text'], plan.days.map(d => [d.day, d.text]));
  await insertMany(client, 'diary_events', ['day', 'kind', 'title', 'rating', 'note'],
    plan.events.map(e => [e.day, e.kind, e.title, e.rating, e.note]));
  for (const [k, v] of plan.settings) {
    await client.query(`INSERT INTO settings (key, value) VALUES ($1,$2)`, [k, JSON.stringify(v)]);
  }
}

// Даты из файла сохраняем только для достижений, которые подтверждаются данными; остальные откроются заново
async function restoreAchievements(db, unlocked) {
  const { habits, comp } = await loadAll(db);
  const done = new Set(achievementProgress(habits, comp, kyivDay()).filter(a => a.done).map(a => a.code));
  for (const a of unlocked) {
    if (!done.has(a.code)) continue;
    await db.query(`INSERT INTO achievements (code, unlocked_at) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING`,
      [a.code, new Date(a.unlocked_at).toISOString()]);
  }
  await unlockAchievements(db);
}

export function dataRouter(db) {
  const r = express.Router();

  r.get('/api/export', async (req, res, next) => {
    try {
      const format = req.query.format === 'csv' ? 'csv' : 'json';
      const all = await readAll(db);
      res.setHeader('Content-Disposition', `attachment; filename="habits-${kyivDay()}.${format}"`);
      res.setHeader('Cache-Control', 'no-store');
      if (format === 'csv') return res.type('text/csv; charset=utf-8').send(toCsv(all));
      res.json({ version: 2, exported_at: new Date().toISOString(), ...all });
    } catch (e) { next(e); }
  });

  // { data, dry: true } — только проверка и счётчики для подтверждения; без dry — замена всего
  r.post('/api/import', express.json({ limit: '5mb' }), async (req, res, next) => {
    try {
      const { plan, summary, error } = validateImport(req.body?.data);
      if (error) return res.status(400).json({ error: 'bad file', detail: error });
      if (req.body.dry === true) return res.json({ summary });
      await inTx(db, (client) => writePlan(client, plan));
      // Данные уже заменены: сбой с датами достижений не должен выглядеть как проваленный импорт
      try { await restoreAchievements(db, plan.unlocked); } catch (e) {
        console.error('import achievements:', e.message);
        await unlockAchievements(db);
      }
      res.json({ ok: true, summary });
    } catch (e) { next(e); }
  });

  r.post('/api/reset', async (req, res, next) => {
    try {
      if (req.body?.confirm !== 'УДАЛИТЬ') return res.status(400).json({ error: 'confirm' });
      await inTx(db, async (client) => { for (const q of WIPE) await client.query(q); });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return r;
}
