// Этап 3 — сервер: дневник, экспорт JSON/CSV, импорт «заменить всё», сброс.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.APP_PASSWORD = 'secret-pass';
process.env.SESSION_SECRET = 'test-session-secret';

const { createPool, migrate } = await import('../lib/db.js');
const { createApp } = await import('../lib/app.js');
const { kyivDay } = await import('../lib/time.js');
const { addDays } = await import('../public/js/logic/dates.js');
const { csvCell, validateImport } = await import('../routes/data.js');

const TODAY = kyivDay();
const ago = (n) => addDays(TODAY, -n);
let server, base, cookie, db;

before(async () => {
  db = await createPool(process.env.TEST_DATABASE_URL_4 || 'memory');
  await migrate(db);
  server = createApp(db).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(base + '/login', { method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ p: 'secret-pass' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(async () => { server?.close(); await db?.end?.(); });

const api = (path, { method = 'GET', body, type = 'application/json' } = {}) => fetch(base + path, {
  method, headers: { ...(body !== undefined ? { 'Content-Type': type } : {}), Cookie: cookie },
  body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
});
const json = async (p, o) => (await api(p, o)).json();
const create = async (x) => (await json('/api/habits', { method: 'POST', body: { name: 'Привычка', type: 'boolean', schedule: 'daily', created_day: ago(30), ...x } })).id;
const reset = () => api('/api/reset', { method: 'POST', body: { confirm: 'УДАЛИТЬ' } });
const diary = (from, to) => json(`/api/diary?from=${from}&to=${to}`);
const ev = (x) => ({ day: TODAY, kind: 'sport', title: 'Пробежка', rating: 8, ...x });

test('дневник: описание дня — запись, правка, пустой текст удаляет, обрезка до 500', async () => {
  await reset();
  assert.equal((await api('/api/diary/day', { method: 'PUT', body: { day: TODAY, text: '  Хороший день  ' } })).status, 200);
  assert.deepEqual((await diary(TODAY, TODAY)).days, [{ day: TODAY, text: 'Хороший день' }]);
  await api('/api/diary/day', { method: 'PUT', body: { day: TODAY, text: 'я'.repeat(600) } });
  assert.equal((await diary(TODAY, TODAY)).days[0].text.length, 500);
  await api('/api/diary/day', { method: 'PUT', body: { day: TODAY, text: '   ' } });
  assert.deepEqual((await diary(TODAY, TODAY)).days, []);
  for (const body of [{ day: '2026-02-30', text: 'x' }, { day: addDays(TODAY, 2), text: 'x' }, { day: TODAY, text: 5 }]) {
    assert.equal((await api('/api/diary/day', { method: 'PUT', body })).status, 400, JSON.stringify(body));
  }
});

test('дневник: события — создать, изменить, удалить, проверки полей и диапазона', async () => {
  await reset();
  const { event } = await json('/api/diary/events', { method: 'POST', body: ev() });
  assert.equal(event.title, 'Пробежка'); assert.equal(event.rating, 8);
  const upd = await json('/api/diary/events', { method: 'POST', body: ev({ id: event.id, rating: 3, note: 'тяжело' }) });
  assert.equal(upd.event.rating, 3); assert.equal(upd.event.note, 'тяжело');
  for (const body of [ev({ kind: 'party' }), ev({ rating: 0 }), ev({ rating: 11 }), ev({ rating: 7.5 }),
    ev({ title: '   ' }), ev({ title: 5 }), ev({ day: addDays(TODAY, 2) })]) {
    assert.equal((await api('/api/diary/events', { method: 'POST', body })).status, 400, JSON.stringify(body));
  }
  assert.equal((await api('/api/diary/events', { method: 'POST', body: ev({ id: 999999 }) })).status, 404);
  assert.equal((await diary(TODAY, TODAY)).events.length, 1);
  assert.equal((await api(`/api/diary/events/${event.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await api(`/api/diary/events/${event.id}`, { method: 'DELETE' })).status, 404);
  assert.equal((await api(`/api/diary?from=${ago(500)}&to=${TODAY}`)).status, 400); // больше 400 дней
  assert.equal((await api(`/api/diary?from=${TODAY}&to=${ago(1)}`)).status, 400);
  assert.equal((await api(`/api/diary?from=x&to=${TODAY}`)).status, 400);
});

test('CSV: ячейки с формулами обезврежены, числа с запятой, кавычки удвоены', () => {
  assert.equal(csvCell('=SUM(A1)'), `"'=SUM(A1)"`);
  for (const s of ['+1', '-2', '@x', '\tx', '\rx']) assert.ok(csvCell(s).startsWith(`"'`), s);
  assert.equal(csvCell('скажи "привет"'), '"скажи ""привет"""');
  assert.equal(csvCell(1.5), '1,5');
});

test('экспорт CSV: BOM, разделитель «;», отметки и дневник', async () => {
  await reset();
  const id = await create({ name: '=Отжимания', type: 'number', target_value: 50, unit: 'раз' });
  await api('/api/mark', { method: 'POST', body: { habit_id: id, day: TODAY, value: 30, note: '+бонус' } });
  await api('/api/diary/events', { method: 'POST', body: ev() });
  const r = await api('/api/export?format=csv');
  assert.match(r.headers.get('content-type'), /text\/csv/);
  assert.match(r.headers.get('content-disposition'), /attachment; filename="habits-\d{4}-\d{2}-\d{2}\.csv"/);
  const buf = Buffer.from(await r.arrayBuffer());
  assert.deepEqual([...buf.subarray(0, 3)], [0xEF, 0xBB, 0xBF]);
  const text = buf.toString('utf8').slice(1);
  assert.ok(text.startsWith('"Дата";"Раздел"'));
  assert.ok(text.includes(`"'=Отжимания";30;"раз";"'+бонус"`), text);
  assert.ok(text.includes('"Дневник: Спорт";"Пробежка";8'));
});

// Три года данных: ежедневная, количественная, со сроком, архивная, дневник
async function seedThreeYears() {
  await reset();
  const daily = await create({ name: 'Зарядка', created_day: ago(1095) });
  const push = await create({ name: 'Отжимания', type: 'number', target_value: 50, unit: 'раз', created_day: ago(1095) });
  const old = await create({ name: 'Чтение', type: 'number', target_value: 30, unit: 'мин', created_day: ago(400), end_day: ago(100) });
  const arch = await create({ name: 'Шахматы', type: 'number', target_value: null, unit: 'партии', created_day: ago(200) });
  const rows = [];
  for (let i = 1; i <= 1095; i++) {
    if (i % 3) rows.push([daily, ago(i), 1, i % 50 ? '' : 'заметка ' + i]);
    rows.push([push, ago(i), 10 + (i % 60), '']);
    if (i >= 100 && i <= 400 && i % 2) rows.push([old, ago(i), 1 + (i % 45), '']);
    if (i <= 200 && i % 4 === 0) rows.push([arch, ago(i), 1 + (i % 3), '']);
  }
  for (let i = 0; i < rows.length; i += 400) {
    const part = rows.slice(i, i + 400);
    await db.query(`INSERT INTO completions (habit_id, day, value, note) VALUES ${part.map((_, j) =>
      `($${j * 4 + 1},$${j * 4 + 2},$${j * 4 + 3},$${j * 4 + 4})`).join(',')}`, part.flat());
  }
  await api(`/api/habits/${arch}/archive`, { method: 'POST', body: { archived: true } });
  for (let i = 0; i < 60; i++) {
    await api('/api/diary/day', { method: 'PUT', body: { day: ago(i * 5), text: 'День ' + i } });
    await api('/api/diary/events', { method: 'POST', body: ev({ day: ago(i * 7), kind: i % 2 ? 'work' : 'family', title: 'Событие ' + i, rating: 1 + (i % 10) }) });
  }
  await api('/api/settings', { method: 'PUT', body: { key: 'theme', value: 'dark' } });
  await api('/api/mark', { method: 'POST', body: { habit_id: daily, day: TODAY, value: 1 } }); // откроет достижения
  return rows.length + 1;
}

// Экспорт без служебных отличий: id привычки → её порядковый номер
function normalize(exp) {
  const idx = new Map(exp.habits.map((h, i) => [h.id, i]));
  return {
    habits: exp.habits.map(({ id, ...h }) => h),
    completions: exp.completions.map(([id, ...rest]) => [idx.get(id), ...rest])
      .sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1)),
    diary: exp.diary,
    settings: exp.settings,
    achievements: exp.achievements.map(a => a.code).sort()
  };
}

test('экспорт → сброс → импорт туда-обратно на объёме 3 лет', async () => {
  const marks = await seedThreeYears();
  const exp = await json('/api/export');
  assert.equal(exp.version, 2);
  assert.equal(exp.completions.length, marks);
  assert.equal(exp.habits.find(h => h.name === 'Шахматы').pauses.filter(p => p.to_day === null).length, 1);
  assert.ok(exp.achievements.length >= 1);
  // Файл больше общего лимита 100 КБ проходит: у импорта свой лимит 5 МБ
  const big = await api('/api/import', { method: 'POST', body: { dry: true, data: { ...exp, pad: 'x'.repeat(300_000) } } });
  assert.equal(big.status, 200);

  assert.equal((await reset()).status, 200);
  const empty = await json('/api/data');
  assert.equal(empty.habits.length, 0); assert.equal(empty.completions.length, 0);
  assert.equal(empty.achievements.length, 0);
  assert.equal(empty.settings.theme, undefined);

  const dry = await json('/api/import', { method: 'POST', body: { dry: true, data: exp } });
  assert.deepEqual(dry.summary, {
    habits: 4, archived: 2, completions: exp.completions.length, skipped: 0,
    diaryDays: new Set([...exp.diary.days.map(d => d.day), ...exp.diary.events.map(e => e.day)]).size
  });
  assert.equal((await json('/api/data')).habits.length, 0, 'dry ничего не пишет');

  assert.equal((await api('/api/import', { method: 'POST', body: { data: exp } })).status, 200);
  const again = await json('/api/export');
  assert.deepEqual(normalize(again), normalize(exp));
  const was = new Map(exp.achievements.map(a => [a.code, a.unlocked_at]));
  for (const a of again.achievements) assert.equal(a.unlocked_at, was.get(a.code), 'дата достижения сохранилась');
});

test('импорт: битый файл отклоняется целиком, база не тронута', async () => {
  await reset();
  const keep = await create({ name: 'Не трогать' });
  const good = { version: 2, habits: [{ id: 7, name: 'Вода', type: 'boolean', created_day: ago(10) }], completions: [[7, ago(1), 1, '']] };
  const cases = [
    [{ ...good, version: 3 }, /версия/],
    [{ ...good, completions: [[7, ago(1), 1], [7, ago(1), 1]] }, /повтор/],
    [{ ...good, completions: [[8, ago(1), 1]] }, /нет такой привычки/],
    [{ ...good, habits: [{ ...good.habits[0], type: 'weight' }] }, /bad type/],
    [{ ...good, habits: [{ ...good.habits[0], color: 'red;' }] }, /bad color/],
    [{ ...good, habits: [good.habits[0], good.habits[0]] }, /bad id/],
    [{ ...good, diary: { events: [ev({ rating: 99 })] } }, /bad rating/],
    [{ ...good, settings: { theme: 'pink' } }, /theme/],
    [{ ...good, habits: [{ ...good.habits[0], pauses: [{ from_day: ago(5), to_day: null }, { from_day: ago(3), to_day: null }] }] }, /two open/],
    [[], /не файл/],
    ['строка', /не файл/]
  ];
  for (const [data, re] of cases) {
    const r = await api('/api/import', { method: 'POST', body: { data } });
    assert.equal(r.status, 400, JSON.stringify(data).slice(0, 80));
    assert.match((await r.json()).detail, re);
  }
  assert.deepEqual((await json('/api/data')).habits.map(h => h.id), [keep]);
  assert.equal((await api('/api/import', { method: 'POST', body: '{"data":' })).status, 400);
  assert.equal((await api('/api/import', { method: 'POST', body: JSON.stringify({ data: good }), type: 'text/plain' })).status, 415);
});

test('импорт: мягкая обрезка старых полей, чужие настройки пропускаются, лишние достижения не берутся', async () => {
  await reset();
  const data = {
    version: 2,
    habits: [{ id: 1, name: 'Я'.repeat(70), description: 'о'.repeat(300), type: 'boolean', created_day: ago(5) }],
    completions: [[1, ago(1), 1, 'н'.repeat(300)], [1, ago(2), 0, '']],
    settings: { theme: 'light', sent_morning: TODAY, hacker: 1 },
    achievements: [
      { code: 'first_step', unlocked_at: '2025-01-01T10:00:00.000Z' },
      { code: 'thousand', unlocked_at: '2025-01-01T10:00:00.000Z' },
      { code: 'zzz', unlocked_at: 'x' }
    ]
  };
  assert.equal((await api('/api/import', { method: 'POST', body: { data } })).status, 200);
  const d = await json('/api/data');
  assert.equal(d.habits[0].name.length, 50);
  assert.equal(d.habits[0].description.length, 150);
  assert.equal(d.completions.length, 1, 'пустая строка без заметки не переносится');
  assert.equal(d.completions[0][3].length, 200);
  assert.deepEqual(d.settings, { theme: 'light' });
  assert.deepEqual(d.achievements.map(a => a.code), ['first_step']);
  assert.equal(new Date(d.achievements[0].unlocked_at).toISOString(), '2025-01-01T10:00:00.000Z');
});

test('импорт: отметки вне жизни и сверх лимита пропускаются с подсчётом, а не валят файл', async () => {
  await reset();
  const data = { version: 2, habits: [{ id: 7, name: 'Вода', type: 'boolean', created_day: ago(10),
    pauses: [{ from_day: addDays(TODAY, 1), to_day: null }] }],
    completions: [[7, ago(1), 1, ''], [7, ago(20), 1, ''], [7, ago(2), 2, ''], [7, addDays(TODAY, 1), 1, '']],
    achievements: [{ code: 'first_step', unlocked_at: '-000001-01-01T00:00:00Z' }] };
  const dry = await json('/api/import', { method: 'POST', body: { dry: true, data } });
  assert.equal(dry.summary.completions, 1);
  assert.equal(dry.summary.skipped, 3);
  assert.equal((await api('/api/import', { method: 'POST', body: { data } })).status, 200);
  const d = await json('/api/data');
  assert.equal(d.completions.length, 1);
  assert.deepEqual(d.achievements.map(a => a.code), ['first_step'], 'дата из файла отброшена, достижение пересчитано');
});

test('импорт: сводки нормализуются до { on, time }', async () => {
  await reset();
  const data = { version: 2, habits: [], settings: { digest_morning: { on: true, time: '07:30', junk: 'x'.repeat(1000) } } };
  assert.equal((await api('/api/import', { method: 'POST', body: { data } })).status, 200);
  assert.deepEqual((await json('/api/data')).settings.digest_morning, { on: true, time: '07:30' });
});

test('импорт v1: режим из days_per_week, старт по первой отметке, архив → пауза', () => {
  const { plan, error } = validateImport({
    version: 1,
    habits: [
      { id: 3, name: 'Бег', type: 'boolean', days_per_week: 3, created_day: ago(10), archived_at: '2026-01-01T00:00:00Z' },
      { id: 4, name: 'Вода', type: 'number', target_value: 8, unit: 'стаканы', days_per_week: 7, created_day: ago(5) }
    ],
    completions: [{ habit_id: 3, day: ago(20), value: 1 }, { habit_id: 4, day: ago(1), value: 6 }]
  }, TODAY);
  assert.equal(error, undefined);
  const [run, water] = plan.habits;
  assert.equal(run.schedule, 'weekly'); assert.equal(run.days_per_week, 3);
  assert.equal(run.created_day, ago(20));
  assert.deepEqual(run.pauses, [{ from_day: addDays(TODAY, 1), to_day: null, reason: 'paused' }]);
  assert.equal(water.schedule, 'daily'); assert.equal(water.pauses.length, 0);
  assert.equal(plan.completions.length, 2);
});

test('сброс: только со словом «УДАЛИТЬ», чистит всё, кроме служебных ключей', async () => {
  await create({ name: 'Что-то' });
  await api('/api/diary/day', { method: 'PUT', body: { day: TODAY, text: 'x' } });
  await db.query(`INSERT INTO settings (key, value) VALUES ('sent_morning', $1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`, [JSON.stringify(TODAY)]);
  assert.equal((await api('/api/reset', { method: 'POST', body: { confirm: 'удалить' } })).status, 400);
  assert.equal((await api('/api/reset', { method: 'POST', body: {} })).status, 400);
  assert.ok((await json('/api/data')).habits.length >= 1);
  assert.equal((await reset()).status, 200);
  assert.equal((await json('/api/data')).habits.length, 0);
  assert.deepEqual((await diary(TODAY, TODAY)).days, []);
  assert.equal((await db.query(`SELECT 1 FROM settings WHERE key='sent_morning'`)).rows.length, 1);
});

test('без входа дневник и данные закрыты', async () => {
  for (const [p, m] of [['/api/export', 'GET'], [`/api/diary?from=${TODAY}&to=${TODAY}`, 'GET'], ['/api/reset', 'POST'], ['/api/import', 'POST']]) {
    const r = await fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: m === 'POST' ? '{}' : undefined });
    assert.equal(r.status, 401, p);
  }
});
