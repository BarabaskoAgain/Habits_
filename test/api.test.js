import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.APP_PASSWORD = 'secret-pass';
process.env.SESSION_SECRET = 'test-session-secret';

const { createPool, migrate } = await import('../lib/db.js');
const { createApp } = await import('../lib/app.js');
const { kyivDay } = await import('../lib/time.js');
const { addDays } = await import('../public/js/logic/dates.js');

const TODAY = kyivDay();
const ago = (n) => addDays(TODAY, -n);

let server, base, cookie, db;

// По умолчанию — pg-mem; TEST_DATABASE_URL / _2 — прогон на настоящем Postgres (пустые базы)
const URL1 = process.env.TEST_DATABASE_URL || 'memory';
const URL2 = process.env.TEST_DATABASE_URL_2 || 'memory';

before(async () => {
  db = await createPool(URL1);
  await migrate(db);
  server = createApp(db).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server?.close(); await db?.end?.(); });

const api = (path, { method = 'GET', body, auth = true, headers = {} } = {}) => fetch(base + path, {
  method,
  redirect: 'manual',
  headers: {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(auth && cookie ? { Cookie: cookie } : {}),
    ...headers
  },
  body: body ? JSON.stringify(body) : undefined
});
const json = async (path, opts) => (await api(path, opts)).json();
const data = () => json('/api/data');

const login = (p) => fetch(base + '/login', {
  method: 'POST', redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ p })
});

const habit = (extra = {}) => ({
  name: 'Чтение', icon: '📚', color: '#FF6A00', category: 'learning',
  type: 'boolean', schedule: 'daily', created_day: ago(30), ...extra
});
const create = async (extra) => (await json('/api/habits', { method: 'POST', body: habit(extra) })).id;
const mark = (body) => api('/api/mark', { method: 'POST', body });
const vn = (o) => ({ value: o.value, note: o.note }); // ответ отметки без списка достижений

// ---------- auth ----------
test('health', async () => {
  const r = await fetch(base + '/health');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test('api без cookie — 401', async () => {
  assert.equal((await api('/api/data', { auth: false })).status, 401);
});

test('неверный пароль — назад на логин с ошибкой', async () => {
  const r = await login('wrong');
  assert.equal(r.headers.get('location'), '/login.html?e=1');
  assert.equal(r.headers.get('set-cookie'), null);
});

test('верный пароль — cookie и редирект на /', async () => {
  const r = await login('secret-pass');
  assert.equal(r.headers.get('location'), '/');
  const sc = r.headers.get('set-cookie');
  assert.match(sc, /hb_s=.+; Path=\/; Max-Age=\d+; HttpOnly/);
  cookie = sc.split(';')[0];
});

test('кириллический пароль: неверный ввод той же длины — редирект, не 500', async () => {
  const saved = process.env.APP_PASSWORD;
  process.env.APP_PASSWORD = 'пароль12';
  try {
    assert.equal((await login('abcdefgh')).headers.get('location'), '/login.html?e=1');
    assert.equal((await login('пароль12')).headers.get('location'), '/');
  } finally { process.env.APP_PASSWORD = saved; }
});

// ---------- защита ----------
test('CSRF: чужой сайт и не-JSON на изменяющих запросах отклоняются', async () => {
  let r = await api('/api/mark', { method: 'POST', body: { habit_id: 1, day: TODAY, value: 1 }, headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(r.status, 403);
  r = await fetch(base + '/api/mark', { method: 'POST', headers: { 'Content-Type': 'text/plain', Cookie: cookie }, body: '{}' });
  assert.equal(r.status, 415);
  r = await fetch(base + '/api/mark', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{bad' });
  assert.equal(r.status, 400);
});

test('кривые id — 404, не 500', async () => {
  assert.equal((await api('/api/habits/abc/archive', { method: 'POST', body: { archived: true } })).status, 404);
  assert.equal((await api('/api/habits/99999999999', { method: 'DELETE' })).status, 404);
  assert.equal((await mark({ habit_id: 'x', day: TODAY, value: 1 })).status, 404);
});

// ---------- привычки ----------
test('создание v2: поля, массивы, паузы, счётчик без цели', async () => {
  const id = await create({ name: 'Шахматы', type: 'number', target_value: null, unit: 'партии',
    unit_forms: ['партия', 'партии', 'партий'] });
  const id2 = await create({ name: 'Спорт', schedule: 'days', active_days: [0, 2, 4] });
  const d = await data();
  assert.equal(d.today, TODAY);
  const h = d.habits.find(x => x.id === id);
  assert.equal(h.target_value, null);
  assert.deepEqual(h.unit_forms, ['партия', 'партии', 'партий']);
  assert.equal(h.schedule, 'daily');
  assert.ok(Array.isArray(h.active_days));
  assert.deepEqual(h.pauses, []);
  assert.equal(h.archived, false);
  assert.deepEqual(d.habits.find(x => x.id === id2).active_days, [0, 2, 4]);
});

test('валидация привычки', async () => {
  for (const bad of [
    habit({ name: 'Йо' }),
    habit({ name: 'x'.repeat(51) }),
    habit({ type: 'weight' }),
    habit({ color: ['#aabbcc'] }),
    habit({ schedule: 'days', active_days: [] }),
    habit({ schedule: 'days', active_days: [7] }),
    habit({ schedule: 'weekly', days_per_week: 7 }),
    habit({ schedule: 'sometimes' }),
    habit({ type: 'number', target_value: 0 }),
    habit({ type: 'number', target_value: 20000 }),
    habit({ type: 'number', target_value: 2000, unit: 'мин' }),
    habit({ created_day: '05.10.2026' }),
    habit({ end_day: ago(40) }),
    habit({ type: 'number', target_value: 5, unit: 'круг', unit_forms: ['a', 'b'] }),
    habit({ reminder_time: '25:00' })
  ]) {
    const r = await api('/api/habits', { method: 'POST', body: bad });
    assert.equal(r.status, 400, JSON.stringify(bad));
  }
  assert.equal((await api('/api/habits', { method: 'POST', body: habit({ id: 99999 }) })).status, 404);
});

test('тип и единица неизменяемы, остальное правится; старое короткое имя не мешает', async () => {
  const id = await create({ name: 'Отжимания', type: 'number', target_value: 50, unit: 'раз' });
  let r = await api('/api/habits', { method: 'POST', body: habit({ id, type: 'boolean' }) });
  assert.equal(r.status, 400);
  r = await api('/api/habits', { method: 'POST', body: habit({ id, name: 'Отжимания', type: 'number', target_value: 50, unit: 'мин' }) });
  assert.equal(r.status, 400);
  r = await api('/api/habits', { method: 'POST', body: habit({ id, name: 'Отжимания утром', type: 'number', target_value: 60, unit: 'раз', schedule: 'weekly', days_per_week: 3 }) });
  assert.equal(r.status, 200);
  const h = (await data()).habits.find(x => x.id === id);
  assert.equal(h.target_value, 60); assert.equal(h.schedule, 'weekly'); assert.equal(h.days_per_week, 3);

  // v1 разрешал имя из 1 символа — правка без смены имени проходит
  const q = await db.query(`INSERT INTO habits (name, created_day) VALUES ('Ю', $1) RETURNING id`, [ago(5)]);
  r = await api('/api/habits', { method: 'POST', body: habit({ id: q.rows[0].id, name: 'Ю' }) });
  assert.equal(r.status, 200);
});

test('дата старта: не древнее 10 лет и не в будущем; отметки не выпадают из жизни при правке', async () => {
  for (const created_day of ['0202-01-01', addDays(TODAY, 3)]) {
    assert.equal((await api('/api/habits', { method: 'POST', body: habit({ created_day }) })).status, 400, created_day);
  }
  const id = await create({ name: 'Сдвигаемая', created_day: ago(10) });
  await mark({ habit_id: id, day: ago(8), value: 1 });
  await mark({ habit_id: id, day: ago(2), value: 1 });
  let r = await api('/api/habits', { method: 'POST', body: habit({ id, name: 'Сдвигаемая', created_day: ago(5) }) });
  assert.equal(r.status, 400, 'старт позже первой отметки');
  assert.equal((await r.json()).error, 'marks before start');
  r = await api('/api/habits', { method: 'POST', body: habit({ id, name: 'Сдвигаемая', created_day: ago(10), end_day: ago(4) }) });
  assert.equal((await r.json()).error, 'marks after end');
});

test('частичная правка не затирает несланные поля', async () => {
  const id = await create({ name: 'Частичная', type: 'number', target_value: 10, unit: 'партии',
    unit_forms: ['партия', 'партии', 'партий'], description: 'зачем', icon: '♟️', category: 'hobby' });
  const r = await api('/api/habits', { method: 'POST', body: { id, name: 'Частичная', target_value: 12 } });
  assert.equal(r.status, 200);
  const h = (await data()).habits.find(x => x.id === id);
  assert.equal(h.unit, 'партии'); assert.deepEqual(h.unit_forms, ['партия', 'партии', 'партий']);
  assert.equal(h.description, 'зачем'); assert.equal(h.icon, '♟️'); assert.equal(h.category, 'hobby');
  assert.equal(h.target_value, 12);
});

test('порядок привычек', async () => {
  const a = await create({ name: 'Альфа' }), b = await create({ name: 'Бета' });
  const rest = (await data()).habits.map(h => h.id).filter(x => x !== a && x !== b);
  assert.equal((await api('/api/habits/order', { method: 'POST', body: { ids: [b, a, ...rest] } })).status, 200);
  const ids = (await data()).habits.map(h => h.id);
  assert.ok(ids.indexOf(b) < ids.indexOf(a));
});

// ---------- отметки ----------
test('отметки: set, add атомарно, ответ value, удаление', async () => {
  const id = await create({ name: 'Отжимания', type: 'number', target_value: 50, unit: 'раз' });
  let r = await mark({ habit_id: id, day: TODAY, mode: 'add', value: 20 });
  assert.deepEqual(vn(await r.json()), { value: 20, note: '' });
  await Promise.all([1, 2, 3, 4, 5].map(() => mark({ habit_id: id, day: TODAY, mode: 'add', value: 10 })));
  r = await mark({ habit_id: id, day: TODAY, mode: 'add', value: 30 });
  assert.equal((await r.json()).value, 100);
  r = await mark({ habit_id: id, day: TODAY, value: 45 });
  assert.equal((await r.json()).value, 45);
  const c = (await data()).completions.find(x => x[0] === id && x[1] === TODAY);
  assert.equal(c[2], 45);
  r = await mark({ habit_id: id, day: TODAY, value: null });
  assert.equal((await r.json()).value, null);
  assert.equal((await data()).completions.some(x => x[0] === id && x[1] === TODAY), false);
});

test('отметки: заметка живёт без значения и не теряется при add', async () => {
  const id = await create({ name: 'Чтение книги', type: 'number', target_value: 20, unit: 'мин' });
  let r = await mark({ habit_id: id, day: TODAY, value: 0, note: 'Толстой' });
  assert.deepEqual(vn(await r.json()), { value: 0, note: 'Толстой' });
  r = await mark({ habit_id: id, day: TODAY, mode: 'add', value: 15 });
  assert.deepEqual(vn(await r.json()), { value: 15, note: 'Толстой' });
  const c = (await data()).completions.find(x => x[0] === id && x[1] === TODAY);
  assert.deepEqual(c, [id, TODAY, 15, 'Толстой']);
});

test('отметки: boolean add = 1, лимиты, будущее, вне жизни', async () => {
  const b = await create({ name: 'Зарядка' });
  let r = await mark({ habit_id: b, day: TODAY, mode: 'add', value: 5 });
  assert.equal((await r.json()).value, 1);

  const n = await create({ name: 'Чтение минут', type: 'number', target_value: 30, unit: 'мин', created_day: ago(3) });
  for (const [body, why] of [
    [{ habit_id: n, day: TODAY, value: 1500 }, 'минут > 1440'],
    [{ habit_id: n, day: TODAY, mode: 'add', value: -5 }, 'add < 0'],
    [{ habit_id: n, day: addDays(TODAY, 2), value: 5 }, 'будущее'],
    [{ habit_id: n, day: ago(5), value: 5 }, 'до старта'],
    [{ habit_id: n, day: '2026-13-01', value: 5 }, 'кривая дата'],
    [{ habit_id: n, day: TODAY, value: 'много' }, 'не число']
  ]) assert.equal((await mark(body)).status, 400, why);
  await mark({ habit_id: n, day: TODAY, value: 1400 });
  assert.equal((await mark({ habit_id: n, day: TODAY, mode: 'add', value: 100 })).status, 400, 'add по итогу > лимита');
});

// ---------- архив ----------
test('архив: пауза с завтрашнего дня (день — серверный), сегодняшняя отметка жива, восстановление сохраняет историю', async () => {
  const id = await create({ name: 'Бег' });
  await mark({ habit_id: id, day: ago(1), value: 1 });
  // день из тела игнорируется: «заархивировать с 2000 года» нельзя
  let r = await api(`/api/habits/${id}/archive`, { method: 'POST', body: { archived: true, day: '2000-01-01' } });
  assert.equal(r.status, 200);
  let h = (await data()).habits.find(x => x.id === id);
  assert.equal(h.archived, true);
  assert.deepEqual(h.pauses.map(p => [p.from_day, p.to_day]), [[addDays(TODAY, 1), null]]);
  assert.equal((await mark({ habit_id: id, day: TODAY, value: 1 })).status, 200, 'день архивации в жизни');
  assert.equal((await mark({ habit_id: id, day: addDays(TODAY, 1), value: 1 })).status, 400, 'в паузе отмечать нельзя');

  r = await api(`/api/habits/${id}/archive`, { method: 'POST', body: { archived: false } });
  assert.equal(r.status, 200);
  h = (await data()).habits.find(x => x.id === id);
  assert.equal(h.archived, false);
  assert.deepEqual(h.pauses, [], 'пустая пауза (тот же день) удалена');
  assert.ok((await data()).completions.some(x => x[0] === id && x[1] === ago(1)), 'история на месте');
});

test('истёкший срок: архивна, восстановление требует новый срок', async () => {
  const id = await create({ name: 'Марафон', created_day: ago(20), end_day: ago(2) });
  assert.equal((await data()).habits.find(x => x.id === id).archived, true);
  let r = await api(`/api/habits/${id}/archive`, { method: 'POST', body: { archived: false, day: TODAY } });
  assert.equal(r.status, 409);
  r = await api(`/api/habits/${id}/archive`, { method: 'POST', body: { archived: false, day: TODAY, end_day: null } });
  assert.equal(r.status, 200);
  const h = (await data()).habits.find(x => x.id === id);
  assert.equal(h.archived, false); assert.equal(h.end_day, null);
});

test('удаление уносит отметки и паузы', async () => {
  const id = await create({ name: 'Удаляемая' });
  await mark({ habit_id: id, day: TODAY, value: 1 });
  await api(`/api/habits/${id}/archive`, { method: 'POST', body: { archived: true, day: TODAY } });
  assert.equal((await api(`/api/habits/${id}`, { method: 'DELETE' })).status, 200);
  const d = await data();
  assert.equal(d.habits.some(h => h.id === id), false);
  assert.equal(d.completions.some(c => c[0] === id), false);
  const p = await db.query(`SELECT COUNT(*)::int AS n FROM habit_pauses WHERE habit_id=$1`, [id]);
  assert.equal(p.rows[0].n, 0);
});

// ---------- аудит: гонки, мусор, лимиты ----------
// pg-mem не соблюдает условие в UPDATE … WHERE value + $3 <= $4 при параллельных запросах — гонку
// проверяем только на настоящем Postgres (TEST_DATABASE_URL, scratchpad/realpg/run.mjs)
test('гонка add не обходит дневной лимит', { skip: URL1 === 'memory' && 'только на настоящем Postgres' }, async () => {
  const id = await create({ name: 'Гонка', type: 'number', target_value: 1000, unit: 'раз' }); // лимит 10000
  await mark({ habit_id: id, day: TODAY, value: 9000 });
  const rs = await Promise.all(Array.from({ length: 30 }, () => mark({ habit_id: id, day: TODAY, mode: 'add', value: 400 })));
  const okN = rs.filter(r => r.status === 200).length;
  const c = (await data()).completions.find(x => x[0] === id && x[1] === TODAY);
  assert.ok(c[2] <= 10000, `итог ${c[2]} ≤ 10000`);
  assert.equal(c[2], 9000 + 400 * okN);
});

test('параллельная архивация даёт одну открытую паузу; archived строкой "false" не архивирует', async () => {
  const id = await create({ name: 'Параллельная' });
  await Promise.all([1, 2, 3].map(() => api(`/api/habits/${id}/archive`, { method: 'POST', body: { archived: true } })));
  let h = (await data()).habits.find(x => x.id === id);
  assert.equal(h.pauses.filter(p => p.to_day === null).length, 1);
  await api(`/api/habits/${id}/archive`, { method: 'POST', body: { archived: false } });
  await api(`/api/habits/${id}/archive`, { method: 'POST', body: { archived: 'false' } });
  h = (await data()).habits.find(x => x.id === id);
  assert.equal(h.archived, false);
});

test('управляющие символы вычищаются, эмодзи не режется пополам', async () => {
  const r = await api('/api/habits', { method: 'POST', body: habit({ name: 'Ч\u0000тение\u0007', icon: '👨‍👩‍👧‍👦' + '😀'.repeat(20) }) });
  assert.equal(r.status, 200);
  const { id: newId } = await r.json();
  const h = (await data()).habits.find(x => x.id === newId);
  assert.equal(h.name, 'Чтение');
  assert.ok(!h.icon.includes('�') && !/[\uD800-\uDBFF]$/.test(h.icon), 'целые символы');
  const n = await mark({ habit_id: h.id, day: TODAY, value: 0, note: 'за\u0000метка' });
  assert.equal((await n.json()).note, 'заметка');
});

test('большое тело — 413, а не 500', async () => {
  const r = await fetch(base + '/api/mark', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ note: 'x'.repeat(200_000) }) });
  assert.equal(r.status, 413);
});

test('штучные единицы — только целые; литры и часы — дробные', async () => {
  const pcs = await create({ name: 'Отжимания целые', type: 'number', target_value: 50, unit: 'раз' });
  assert.equal((await mark({ habit_id: pcs, day: TODAY, value: 1.5 })).status, 400);
  assert.equal((await api('/api/habits', { method: 'POST', body: habit({ type: 'number', target_value: 1.5, unit: 'раз' }) })).status, 400);
  const lit = await create({ name: 'Вода литры', type: 'number', target_value: 2, unit: 'л' });
  assert.equal((await mark({ habit_id: lit, day: TODAY, value: 1.5 })).status, 200);
});

test('порядок: только полный набор без дублей', async () => {
  const ids = (await data()).habits.map(h => h.id);
  assert.equal((await api('/api/habits/order', { method: 'POST', body: { ids: [ids[0], ids[0]] } })).status, 400);
  assert.equal((await api('/api/habits/order', { method: 'POST', body: { ids: ids.slice(1) } })).status, 400);
  assert.equal((await api('/api/habits/order', { method: 'POST', body: { ids: [...ids].reverse() } })).status, 200);
});

test('снять отметку можно и вне жизни привычки (уборка старых данных)', async () => {
  const id = await create({ name: 'Старая отметка', created_day: ago(3) });
  await db.query(`INSERT INTO completions (habit_id, day, value) VALUES ($1,$2,1)`, [id, ago(20)]);
  assert.equal((await mark({ habit_id: id, day: ago(20), value: null })).status, 200);
  assert.equal((await data()).completions.some(c => c[0] === id && c[1] === ago(20)), false);
});

test('cookie Secure за https-прокси; вошедший с /login.html уходит на /', async () => {
  const r = await fetch(base + '/login', { method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Forwarded-Proto': 'https' },
    body: new URLSearchParams({ p: process.env.APP_PASSWORD }) });
  assert.match(r.headers.get('set-cookie'), /; Secure/);
  const l = await fetch(base + '/login.html', { redirect: 'manual', headers: { Cookie: cookie } });
  assert.equal(l.status, 302);
  assert.equal(l.headers.get('location'), '/');
});

// ---------- настройки ----------
test('настройки: белый список', async () => {
  assert.equal((await api('/api/settings', { method: 'PUT', body: { key: 'onboarded', value: true } })).status, 200);
  assert.equal((await data()).settings.onboarded, true);
  assert.equal((await api('/api/settings', { method: 'PUT', body: { key: 'evil', value: 1 } })).status, 400);
});

// ---------- миграция v1 → v2 ----------
test('миграция v1 → v2: weekly, старт по ранней отметке, паузы архивных', async () => {
  const m = await createPool(URL2);
  await migrate(m, { until: 1 });
  const archivedAt = new Date(Date.UTC(2026, 8, 10, 22, 30)); // 11 сентября по Киеву (UTC+3)
  const a = await m.query(`INSERT INTO habits (name, days_per_week, created_day, archived_at) VALUES ('A', 3, '2026-09-05', $1) RETURNING id`, [archivedAt]);
  const b = await m.query(`INSERT INTO habits (name, days_per_week, created_day) VALUES ('B', 7, '2026-09-05') RETURNING id`);
  await m.query(`INSERT INTO completions (habit_id, day, value) VALUES ($1, '2026-09-01', 1)`, [b.rows[0].id]);
  await migrate(m);
  const hs = (await m.query(`SELECT id, schedule, created_day, sort, active_days FROM habits ORDER BY id`)).rows;
  assert.equal(hs[0].schedule, 'weekly');
  assert.equal(hs[1].schedule, 'daily');
  assert.equal(hs[1].created_day, '2026-09-01');
  assert.equal(hs[0].sort, hs[0].id);
  assert.ok(Array.isArray(hs[0].active_days));
  const p = (await m.query(`SELECT habit_id, from_day, to_day FROM habit_pauses`)).rows;
  assert.deepEqual(p.map(x => [x.habit_id, x.from_day, x.to_day]), [[a.rows[0].id, '2026-09-12', null]]);
});

// ---------- выход ----------
test('чужой сайт не может разлогинить', async () => {
  const r = await fetch(base + '/logout', { method: 'POST', redirect: 'manual', headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(r.status, 403);
});

test('logout гасит cookie', async () => {
  const r = await api('/logout', { method: 'POST' });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('set-cookie'), /hb_s=; Path=\/; Max-Age=0/);
  assert.match(r.headers.get('clear-site-data') || '', /storage/, 'выход чистит данные сайта в браузере');
});
