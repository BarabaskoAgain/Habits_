// Каркас: состояние, загрузка, мемо расчётов, отметки, табы, шторки, полноэкранный экран, тосты, SW.
import * as api from './api.js';
import { dayKey, weekStart, isArchived, inLife, ACHIEVEMENTS } from './logic.js';
import { openSettings } from './settings.js';
import { renderToday } from './today.js';
import { renderStats } from './stats.js';
import { renderDiary } from './diary.js';
import { openArchive } from './archive.js';
import { openForm } from './form.js';

const $ = (s) => document.querySelector(s);
const view = $('#view');

// «Сегодня» — день по Киеву, как на сервере (SPEC §0), а не по часовому поясу устройства
const kyivFmt = (() => {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { return null; }
})();
const todayKey = () => (kyivFmt ? kyivFmt.format(new Date()) : dayKey());

// Понятные тексты для кодов ошибок API
const ERRORS = {
  'marks before start': 'Есть отметки раньше даты старта — выбери дату не позже первой отметки',
  'marks after end': 'Есть отметки после срока — продли срок',
  'day out of life': 'Этот день вне жизни привычки',
  'too much': 'Слишком большое число',
  'bad name': 'Название — от 3 до 50 символов',
  'bad created_day': 'Неверная дата старта',
  expired: 'Срок привычки вышел'
};
const errText = (e) => ERRORS[e.message] || e.message;

const today0 = todayKey();
const state = {
  habits: [],
  comp: {},        // { [habitId]: { day: value } }
  notes: {},       // { [habitId]: { day: note } }
  settings: {},
  achievements: [], // [{ code, unlocked_at }]
  today: today0,
  day: today0,     // выбранный день на «Сегодня»
  tab: 'today',
  statsTab: 'week',
  diaryMode: 'day', // дневник: day | week | month | year
  diaryDay: today0,
  diaryPeriod: {},   // начало выбранного периода сводки по режимам
  weekStart: weekStart(today0),
  month: today0.slice(0, 7),
  version: 0,
  loaded: false,
  screen: null     // открытый полноэкранный экран: { render }
};

const TABS = { today: renderToday, stats: renderStats, diary: renderDiary };

// ---------- мемо: расчёты кэшируются до следующего изменения данных ----------
let memoVersion = -1;
const memoCache = new Map();
function memo(key, fn) {
  if (memoVersion !== state.version) { memoCache.clear(); memoVersion = state.version; }
  if (!memoCache.has(key)) memoCache.set(key, fn());
  return memoCache.get(key);
}
const bump = () => { state.version++; };

// ---------- утилиты UI ----------
let toastTimer;
function toast(msg, action = null) {
  const el = $('#toast');
  el.innerHTML = '';
  el.append(document.createTextNode(msg));
  if (action) {
    const b = document.createElement('button');
    b.className = 'toast-act';
    b.textContent = action.label;
    b.onclick = () => { el.classList.add('hidden'); action.run(); };
    el.append(b);
  }
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), action ? 5000 : 3000);
}

// ---------- слои и кнопка «Назад» ----------
// Одна запись в истории на все открытые слои (шторка, экран привычки). «Назад» телефона закрывает
// верхний слой: сначала шторку, потом экран — и не уводит со страницы (на вход и т.п.).
let overlayPushed = false;
let ignorePop = 0;
const sheetOpen = () => $('#sheet').classList.contains('on');
function ensurePushed() {
  if (!overlayPushed) { history.pushState({ overlay: 1 }, ''); overlayPushed = true; }
}
// Отложенно: шторку часто сразу открывают снова (ввод → шторка дня), запись тогда остаётся
function releaseHistory() {
  setTimeout(() => {
    if (overlayPushed && !sheetOpen() && !state.screen) { overlayPushed = false; ignorePop++; history.back(); }
  }, 0);
}

let sheetOpenedAt = 0;
function openSheet(html) {
  if (!sheetOpen()) sheetOpenedAt = Date.now();
  $('#sheetBody').innerHTML = html;
  $('#sheetBody').scrollTop = 0;
  $('#sheet').classList.add('on');
  document.body.classList.add('locked');
  ensurePushed();
  return $('#sheetBody');
}
function hideSheet() {
  $('#sheet').classList.remove('on');
  if (!state.screen) document.body.classList.remove('locked');
}
function closeSheet() {
  if (!sheetOpen()) return;
  hideSheet();
  releaseHistory();
}
// Тап по фону закрывает шторку, но не тот же двойной тап, что её открыл
$('#sheet').addEventListener('click', (e) => {
  if (e.target.id === 'sheet' && Date.now() - sheetOpenedAt > 400) closeSheet();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (sheetOpen()) closeSheet(); else if (state.screen) closeScreen();
});

// Полноэкранный экран (привычка)
function openScreen(renderFn) {
  state.screen = { render: renderFn };
  ensurePushed();
  $('#screen').classList.remove('hidden');
  document.body.classList.add('locked');
  renderFn($('#screen'));
  $('#screen').scrollTop = 0;
}
function hideScreen() {
  state.screen = null;
  $('#screen').classList.add('hidden');
  $('#screen').innerHTML = '';
  if (!sheetOpen()) document.body.classList.remove('locked');
  render();
}
function closeScreen() {
  if (!state.screen) return;
  hideScreen();
  releaseHistory();
}
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop--; return; }
  overlayPushed = false;
  if (sheetOpen()) {
    hideSheet();
    if (state.screen) ensurePushed(); // под шторкой ещё экран — следующий «Назад» закроет его
  } else if (state.screen) {
    hideScreen();
  }
});

// Страница из bfcache (например, «Назад» после выхода) — перезагрузить, чтобы проверить сессию
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

// ---------- данные ----------
// Нормализация: кэш v1 и ответы сервера приводятся к одной форме (новые поля — по умолчанию)
function normalize(h) {
  const days = Array.isArray(h.active_days) ? h.active_days.map(Number) : [0, 1, 2, 3, 4, 5, 6];
  return {
    ...h,
    color: /^#[0-9a-f]{6}$/i.test(h.color) ? h.color : '#FF6A00', // цвет идёт в style-атрибуты
    target_value: h.target_value === null || h.target_value === undefined ? null : Number(h.target_value),
    schedule: h.schedule || (Number(h.days_per_week) < 7 ? 'weekly' : 'daily'),
    active_days: days.length ? days : [0, 1, 2, 3, 4, 5, 6],
    days_per_week: Number(h.days_per_week) || 7,
    pauses: Array.isArray(h.pauses) ? h.pauses : [],
    unit_forms: Array.isArray(h.unit_forms) ? h.unit_forms : null,
    end_day: h.end_day || null
  };
}

function applyData(data) {
  state.habits = (data.habits || []).map(normalize);
  const comp = {}, notes = {};
  for (const [id, day, value, note] of data.completions || []) {
    (comp[id] ||= {})[day] = value;
    if (note) (notes[id] ||= {})[day] = note;
  }
  state.comp = comp;
  state.notes = notes;
  state.settings = data.settings || {};
  state.achievements = data.achievements || [];
  // тема, выбранная на другом устройстве, приезжает с сервера
  const theme = state.settings.theme;
  if (theme && window.hbTheme && window.hbTheme() !== theme) window.hbSetTheme(theme);
  state.loaded = true;
  bump();
}

// Отметки в полёте: ответ load, начатого до них, не должен перетереть экран
const queues = new Map(); // 'habitId:day' -> промис последнего запроса
let mutations = 0;
let needReload = false; // загрузку пропустили из-за отметок в полёте — повторить, когда очередь опустеет

async function load({ silent = false } = {}) {
  const startedAt = mutations;
  try {
    const data = await api.get('/api/data');
    if (mutations !== startedAt || queues.size) {
      needReload = true;
      if (!queues.size) { needReload = false; return load({ silent: true }); }
      return;
    }
    api.saveCache('data2', data);
    applyData(data);
  } catch (e) {
    if (e.message === 'auth') return;
    const cached = api.readCache('data2');
    if (cached && !state.loaded) applyData(cached.data);
    if (!silent) toast(e.message === 'Нет сети' ? 'Нет сети, показываю сохранённое' : 'Не загрузилось: ' + e.message);
  }
  rerender(); // и вкладку, и открытый экран привычки
}

function setLocal(id, day, value, note) {
  const byDay = (state.comp[id] ||= {});
  if (value === undefined || value === null) delete byDay[day]; else byDay[day] = value;
  if (note !== undefined) {
    const n = (state.notes[id] ||= {});
    if (note) n[day] = note; else delete n[day];
  }
  bump();
}

function snapshot() {
  const completions = [];
  for (const [id, days] of Object.entries(state.comp)) {
    for (const [day, value] of Object.entries(days)) {
      const note = state.notes[id]?.[day];
      completions.push(note ? [Number(id), day, value, note] : [Number(id), day, value]);
    }
  }
  return { habits: state.habits, completions, settings: state.settings };
}

// Запросы по одной клетке — строго по очереди; итог берём с сервера (ответ {value, note})
function send(h, day, body, optimistic) {
  const prev = state.comp[h.id]?.[day];
  const prevNote = state.notes[h.id]?.[day];
  optimistic();
  mutations++;
  rerender();
  const key = h.id + ':' + day;
  let p;
  // .catch перед .then: ошибка предыдущего запроса не должна блокировать следующий в очереди
  p = (queues.get(key) || Promise.resolve()).catch(() => {})
    .then(() => api.post('/api/mark', { habit_id: h.id, day, ...body }))
    .then((res) => {
      if (queues.get(key) === p) setLocal(h.id, day, res.value === 0 && !res.note ? null : res.value, res.note || '');
      announceAchievements(res.achievements);
      api.saveCache('data2', snapshot());
      rerender();
      return res;
    })
    .catch((e) => {
      // Откат к значению до этого тапа; истину потом подтянет загрузка с сервера
      setLocal(h.id, day, prev, prevNote || '');
      needReload = true;
      rerender();
      if (e.message !== 'auth') toast('Не сохранилось: ' + errText(e));
      throw e;
    })
    .finally(() => {
      if (queues.get(key) === p) queues.delete(key);
      if (!queues.size && needReload) { needReload = false; load({ silent: true }); }
    });
  queues.set(key, p);
  return p.catch(() => null);
}

// Поставить итог дня (null — снять отметку)
const mark = (h, day, value, note) =>
  send(h, day, { value: value || null, ...(note !== undefined ? { note } : {}) },
    () => setLocal(h.id, day, value || (note ? 0 : null), note));

// Прибавить к итогу дня
const add = (h, day, delta) =>
  send(h, day, { mode: 'add', value: delta },
    () => setLocal(h.id, day, (Number(state.comp[h.id]?.[day]) || 0) + (h.type === 'boolean' ? 0 : delta) || 1));

// Действие с сервером + перезагрузка данных; ошибки — в тост
async function run(fn, okMsg) {
  try {
    const res = await fn();
    closeSheet();
    if (okMsg) toast(okMsg);
    await load({ silent: true });
    return res ?? true;
  } catch (e) {
    if (e.message !== 'auth') toast(errText(e));
    return false;
  }
}

const ctx = {
  state, toast, openSheet, closeSheet, sheetOpen, openScreen, closeScreen, memo, mark, add, run,
  get: api.get, post: api.post, put: api.put, del: api.del,
  render: () => render(),
  habitById: (id) => state.habits.find(h => h.id === Number(id)),
  activeHabits: () => state.habits.filter(h => !isArchived(h, state.today)),
  // Привычки дня d — единое правило для «Сегодня», недели и месяца: жила в этот день;
  // за сегодня ушедшие в архив не показываем, за прошлые дни — показываем (история)
  habitsOnDay: (d) => state.habits.filter(h => inLife(h, d) && (d < state.today || !isArchived(h, state.today))),
  archivedHabits: () => state.habits.filter(h => isArchived(h, state.today))
};

// ---------- отрисовка ----------
function render() {
  const now = todayKey();
  if (now !== state.today) {
    // наступили новые сутки: «эта неделя» и «этот месяц» переезжают вместе с днём
    const prev = state.today;
    if (state.weekStart === weekStart(prev)) state.weekStart = weekStart(now);
    if (state.month === prev.slice(0, 7)) state.month = now.slice(0, 7);
    if (state.diaryDay === prev) state.diaryDay = now;
    state.today = now; state.day = now; bump();
  }
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === state.tab);
  // «+» только когда есть привычки: в онбординге и пустом экране своя кнопка «Своя привычка»
  $('#fab').classList.toggle('hidden', !state.loaded || state.tab !== 'today' || !ctx.activeHabits().length);
  if (!state.loaded) { view.innerHTML = '<div class="empty">Загружаю…</div>'; return; }
  TABS[state.tab](view, ctx);
}
// Перерисовать всё видимое: вкладку и открытый экран привычки
function rerender() {
  render();
  if (state.screen) state.screen.render($('#screen'));
}
ctx.rerender = rerender;

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b || b.dataset.tab === state.tab) return;
  state.tab = b.dataset.tab;
  window.scrollTo(0, 0);
  render();
});

$('#archiveBtn').addEventListener('click', () => openArchive(ctx));
$('#settingsBtn').addEventListener('click', () => openSettings(ctx));

// Новые достижения из ответа сервера: в список и всплывашкой (по одному, чтобы не перекрывались)
function announceAchievements(codes) {
  if (!codes?.length) return;
  const now = new Date().toISOString();
  for (const code of codes) if (!state.achievements.some(a => a.code === code)) state.achievements.push({ code, unlocked_at: now });
  bump();
  codes.forEach((code, i) => {
    const a = ACHIEVEMENTS.find(x => x.code === code);
    if (a) setTimeout(() => toast(`🏆 Новое достижение: ${a.icon} ${a.name}`), 1200 + i * 3200);
  });
}
$('#fab').addEventListener('click', () => openForm(ctx));

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  state.day = todayKey(); // вернулись в приложение — снова «сегодня»
  load({ silent: true });
});

// ---------- service worker ----------
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController || sheetOpen()) return;
    reloaded = true;
    location.reload();
  });
}

// ---------- запуск: сперва кэш (мгновенно), потом сеть ----------
const cached = api.readCache('data2');
if (cached) applyData(cached.data);
render();
load();
