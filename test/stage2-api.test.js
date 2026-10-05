// Этап 2 — сервер: настройки, push-подписки, планировщик (напоминания, сводки, автоархив), достижения.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.APP_PASSWORD = 'secret-pass';
process.env.SESSION_SECRET = 'test-session-secret';
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;

const { createPool, migrate } = await import('../lib/db.js');
const { createApp } = await import('../lib/app.js');
const { tick } = await import('../lib/scheduler.js');
const { kyivDay } = await import('../lib/time.js');
const { addDays } = await import('../public/js/logic/dates.js');

const TODAY = kyivDay();
const ago = (n) => addDays(TODAY, -n);
let server, base, cookie, db;

before(async () => {
  db = await createPool(process.env.TEST_DATABASE_URL_3 || 'memory');
  await migrate(db);
  server = createApp(db).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(base + '/login', { method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ p: 'secret-pass' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(async () => { server?.close(); await db?.end?.(); });

const api = (path, { method = 'GET', body } = {}) => fetch(base + path, {
  method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Cookie: cookie },
  body: body ? JSON.stringify(body) : undefined
});
const json = async (p, o) => (await api(p, o)).json();
const create = async (x) => (await json('/api/habits', { method: 'POST', body: { name: 'Привычка', type: 'boolean', schedule: 'daily', created_day: ago(30), ...x } })).id;

// Подставной отправщик: копит пуши вместо web-push
const fakePush = () => { const sent = []; return { sent, enabled: () => true, sendAll: async (p) => { sent.push(p); } }; };

test('настройки этапа 2: тема, пуши, сводки — белый список и формат', async () => {
  for (const body of [
    { key: 'theme', value: 'dark' },
    { key: 'push_enabled', value: false },
    { key: 'digest_morning', value: { on: true, time: '08:00' } }
  ]) assert.equal((await api('/api/settings', { method: 'PUT', body })).status, 200, JSON.stringify(body));
  for (const body of [
    { key: 'theme', value: 'pink' },
    { key: 'digest_evening', value: { on: true, time: '25:00' } },
    { key: 'sent_morning', value: TODAY } // служебный ключ — не из клиента
  ]) assert.equal((await api('/api/settings', { method: 'PUT', body })).status, 400, JSON.stringify(body));
  const s = (await json('/api/data')).settings;
  assert.equal(s.theme, 'dark'); assert.equal(s.push_enabled, false);
  await api('/api/settings', { method: 'PUT', body: { key: 'push_enabled', value: true } });
});

test('push без VAPID-ключей: выключен, сервер не падает', async () => {
  assert.deepEqual(await json('/api/push/pubkey'), { enabled: false, key: null });
  assert.equal((await api('/api/push/test', { method: 'POST', body: {} })).status, 503);
});

test('подписка: валидация endpoint и ключей, повтор — без дублей', async () => {
  const sub = { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'BPx', auth: 'au' } };
  assert.equal((await api('/api/push/subscribe', { method: 'POST', body: { subscription: sub } })).status, 200);
  assert.equal((await api('/api/push/subscribe', { method: 'POST', body: { subscription: sub } })).status, 200);
  const n = await db.query(`SELECT COUNT(*)::int AS n FROM push_subscriptions`);
  assert.equal(n.rows[0].n, 1);
  for (const bad of [
    { endpoint: 'http://push.example.com/x', keys: sub.keys },
    { endpoint: 'https://x/' + 'a'.repeat(600), keys: sub.keys },
    { endpoint: sub.endpoint, keys: { p256dh: 1 } }
  ]) assert.equal((await api('/api/push/subscribe', { method: 'POST', body: { subscription: bad } })).status, 400);
  assert.equal((await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } })).status, 200);
});

test('планировщик: напоминание один раз в окне, не после отметки', async () => {
  const id = await create({ name: 'Чтение вечером', reminder_enabled: true, reminder_time: '21:00' });
  const push = fakePush();
  await tick(db, push, { day: TODAY, hm: '20:59' });
  assert.equal(push.sent.filter(p => p.tag === `habit-${id}`).length, 0, 'до времени — тихо');
  await tick(db, push, { day: TODAY, hm: '21:03' });
  await tick(db, push, { day: TODAY, hm: '21:04' });
  const mine = push.sent.filter(p => p.tag === `habit-${id}`);
  assert.equal(mine.length, 1, 'ровно одно напоминание');
  assert.equal(mine[0].title, '🎯 Время для привычки!');
  assert.equal(mine[0].body, 'Пора выполнить: Чтение вечером');

  const id2 = await create({ name: 'Уже сделано', reminder_enabled: true, reminder_time: '21:00' });
  await api('/api/mark', { method: 'POST', body: { habit_id: id2, day: TODAY, value: 1 } });
  await tick(db, push, { day: TODAY, hm: '21:05' });
  assert.equal(push.sent.filter(p => p.tag === `habit-${id2}`).length, 0, 'сделано — не напоминаем');
});

test('планировщик: глобальный выключатель пушей', async () => {
  await create({ name: 'Тихая', reminder_enabled: true, reminder_time: '07:00' });
  await api('/api/settings', { method: 'PUT', body: { key: 'push_enabled', value: false } });
  const push = fakePush();
  await tick(db, push, { day: TODAY, hm: '07:01' });
  assert.equal(push.sent.length, 0);
  await api('/api/settings', { method: 'PUT', body: { key: 'push_enabled', value: true } });
});

test('планировщик: утренняя сводка один раз в день', async () => {
  await api('/api/settings', { method: 'PUT', body: { key: 'digest_morning', value: { on: true, time: '08:00' } } });
  const push = fakePush();
  await tick(db, push, { day: TODAY, hm: '08:00' });
  await tick(db, push, { day: TODAY, hm: '08:01' });
  assert.equal(push.sent.filter(p => p.tag === 'digest-morning').length, 1);
});

test('планировщик: истёкший срок — пауза ended (идемпотентно)', async () => {
  const id = await create({ name: 'Марафон 7 дней', created_day: ago(10), end_day: ago(3) });
  const push = fakePush();
  await tick(db, push, { day: TODAY, hm: '12:00' });
  await tick(db, push, { day: TODAY, hm: '12:01' });
  const p = await db.query(`SELECT from_day, to_day, reason FROM habit_pauses WHERE habit_id=$1`, [id]);
  assert.deepEqual(p.rows.map(x => [x.from_day, x.to_day, x.reason]), [[ago(2), null, 'ended']]);
});

test('достижения: новые приходят в ответе на отметку один раз', async () => {
  // «Первый шаг» уже открылся на отметках выше — проверяем на «Тысячнике»
  const id = await create({ name: 'Отжимания тысяча', type: 'number', target_value: 100, unit: 'раз', created_day: TODAY });
  const r1 = await json('/api/mark', { method: 'POST', body: { habit_id: id, day: TODAY, value: 1000 } });
  assert.deepEqual(r1.achievements, ['thousand']);
  const r2 = await json('/api/mark', { method: 'POST', body: { habit_id: id, day: TODAY, value: 900 } });
  assert.deepEqual(r2.achievements, [], 'не повторяется и не отзывается');
  const d = await json('/api/data');
  assert.ok(d.achievements.some(a => a.code === 'thousand' && a.unlocked_at));
  assert.ok(d.achievements.some(a => a.code === 'first_step'));
});
