// Экран «Сегодня» (SPEC §2): листание дней, прогресс дня, карточки, учёт-счётчики, онбординг.
import { addDays, inLife, isCounter, isDone, scheduledOnDay, dayProgress, currentStreak, weekInfo, weekStart, allTime } from './logic.js';
import { esc, dayLong, dayWd, fmtValue, fmtTarget, fmtStreak, tint } from './fmt.js';
import { TEMPLATES, QUOTES, categoryOf } from './consts.js';
import { openInput } from './input-sheet.js';
import { openHabitScreen } from './habit-screen.js';
import { openForm } from './form.js';
import { openArchive } from './archive.js';
import { diaryCard } from './diary.js';

const pref = {
  get: (k, d) => { try { return localStorage.getItem('hb_' + k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('hb_' + k, v); } catch {} }
};

function metaText(h, marks, day, ctx) {
  const s = ctx.memo(`streak:${h.id}:${day}`, () => currentStreak(h, marks, day));
  const planned = scheduledOnDay(h, marks, day);
  if (h.schedule === 'weekly') {
    const w = weekInfo(h, marks, weekStart(day));
    const head = w.doneCount >= w.wp && w.wp ? `План недели выполнен ✓ ${w.doneCount}/${w.wp}` : `${w.doneCount} из ${w.wp} на неделе`;
    return s?.value ? `${head} · 🔥 ${fmtStreak(s)}` : head;
  }
  if (!planned && !isDone(h, marks[day])) return 'По плану отдых';
  return s?.value ? `🔥 ${fmtStreak(s)} подряд` : 'Серия начнётся с этого дня';
}

function card(h, ctx, day) {
  const marks = ctx.state.comp[h.id] || {};
  const v = marks[day];
  const done = isDone(h, v);
  const planned = scheduledOnDay(h, marks, day);
  let pct = done ? 100 : 0, right, state = done ? 'ok' : 'none';
  if (h.type === 'number') {
    const t = Number(h.target_value);
    const val = Number(v) || 0;
    pct = Math.min(100, Math.round((val / t) * 100));
    state = val > t ? 'over' : val >= t ? 'ok' : val > 0 ? 'part' : 'none';
    const icon = state === 'over' ? '🔥' : state === 'ok' ? '✓' : '+';
    right = `<span class="act ${state}">${icon}</span>
      <span class="amt"><b>${esc(fmtValue(h, val, { short: true }))}</b> / ${esc(fmtTarget(h))}</span>`;
  } else {
    right = `<span class="act ${state}">${done ? '✓' : ''}</span>`;
  }
  const alpha = state === 'over' ? 0.2 : state === 'ok' ? 0.15 : pct ? 0.1 : 0;
  // Тусклая — только выходной день «по дням недели»; weekly «в запасе» отмечать можно и нужно
  const rest = !planned && !done && h.schedule === 'days';
  return `
    <div class="card ${state}${rest ? ' rest' : ''}" style="--c:${h.color};--fill:${tint(h.color, alpha)};--pct:${pct}%">
      <button class="card-main" data-open="${h.id}">
        <span class="hicon">${esc(h.icon)}</span>
        <span class="htext">
          <span class="hname">${esc(h.name)}</span>
          <span class="hmeta">${esc(metaText(h, marks, day, ctx))}</span>
        </span>
      </button>
      <button class="card-act" data-act="${h.id}" aria-label="${done ? 'Выполнено' : 'Отметить'}: ${esc(h.name)}">${right}</button>
    </div>`;
}

function counterCard(h, ctx, day) {
  const marks = ctx.state.comp[h.id] || {};
  const v = Number(marks[day]) || 0;
  const total = ctx.memo(`all:${h.id}`, () => allTime(h, marks, ctx.state.today)).sum;
  return `
    <div class="card counter${v ? ' ok' : ''}" style="--c:${h.color};--fill:${tint(h.color, v ? 0.1 : 0)};--pct:100%">
      <button class="card-main" data-open="${h.id}">
        <span class="hicon">${esc(h.icon)}</span>
        <span class="htext">
          <span class="hname">${esc(h.name)}</span>
          <span class="hmeta">Сегодня ${esc(fmtValue(h, v))} · всего ${esc(fmtValue(h, total))}</span>
        </span>
      </button>
      <button class="card-act" data-act="${h.id}" aria-label="Добавить: ${esc(h.name)}"><span class="act part">+</span></button>
    </div>`;
}

function onboarding() {
  const pre = new Set([1, 2, 3]);
  return `
    <section class="welcome">
      <div class="welcome-emoji">🌱</div>
      <h2>С чего начнём?</h2>
      <p>Отметь, что хочешь отслеживать. Потом можно поменять цели и добавить своё.</p>
      <div class="tpl-list">${TEMPLATES.map((t, i) => `
        <label class="tpl" style="--c:${t.color}">
          <input type="checkbox" data-tpl="${i}" ${pre.has(i) ? 'checked' : ''}>
          <span class="hicon sm">${t.icon}</span>
          <span class="t">${esc(t.name)}<small>${esc(t.type === 'number' ? (t.target_value ? `${fmtTarget(t)} в день` : 'просто считать') : (t.schedule === 'weekly' ? `${t.days_per_week} раза в неделю` : 'каждый день'))}</small></span>
        </label>`).join('')}</div>
      <button class="btn" id="startBtn">Начать</button>
      <button class="btn line" id="ownHabit">Своя привычка</button>
    </section>`;
}

function emptyState(ctx) {
  const [q, author] = QUOTES[new Date().getDate() % QUOTES.length];
  const arch = ctx.archivedHabits().length;
  return `
    <section class="welcome">
      <div class="welcome-emoji">🎯</div>
      <h2>Начните новую привычку</h2>
      <blockquote class="quote">«${esc(q)}»<cite>${esc(author)}</cite></blockquote>
      <div class="presets">${TEMPLATES.map((t, i) => `<button class="preset" data-preset="${i}" style="--c:${t.color}"><span>${t.icon}</span>${esc(t.name)}</button>`).join('')}</div>
      <button class="btn" id="ownHabit">Своя привычка</button>
      ${arch ? `<button class="link" id="toArchive">Посмотреть архив (${arch})</button>` : ''}
    </section>`;
}

const SORTS = { own: 'Мой порядок', name: 'По названию', streak: 'По серии', pct: 'По выполнению' };

// Ключ сортировки считается один раз на привычку; счётчики без цели — в конце
function sortHabits(list, ctx, day) {
  const mode = pref.get('sort', 'own');
  if (mode === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  if (mode !== 'streak' && mode !== 'pct') return list;
  const key = new Map(list.map(h => {
    const marks = ctx.state.comp[h.id] || {};
    if (isCounter(h)) return [h, -Infinity];
    if (mode === 'streak') return [h, -(currentStreak(h, marks, day)?.value || 0)];
    const v = Number(marks[day]) || 0;
    return [h, h.type === 'number' ? v / h.target_value : (v > 0 ? 1 : 0)];
  }));
  return [...list].sort((a, b) => key.get(a) - key.get(b));
}

function openFilter(ctx, habits) {
  const cats = [...new Set(habits.map(h => h.category).filter(Boolean))];
  const cur = pref.get('cat', ''), sort = pref.get('sort', 'own');
  const body = ctx.openSheet(`
    <h3>Показать</h3>
    <div class="chips tight">
      <button class="chip${cur ? '' : ' on'}" data-cat="">Все</button>
      ${cats.map(c => { const k = categoryOf(c); return `<button class="chip${cur === c ? ' on' : ''}" data-cat="${esc(c)}">${k.icon} ${esc(k.label)}</button>`; }).join('')}
    </div>
    <h3 class="mt">Сортировка</h3>
    <div class="chips tight">${Object.entries(SORTS).map(([k, l]) => `<button class="chip${sort === k ? ' on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div>`);
  body.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.cat !== undefined) pref.set('cat', t.dataset.cat);
    if (t.dataset.sort) pref.set('sort', t.dataset.sort);
    ctx.closeSheet();
    ctx.render();
  };
}

export function renderToday(view, ctx) {
  const { state } = ctx;
  const day = state.day;
  const isToday = day === state.today;
  const all = ctx.activeHabits();

  if (!all.length) {
    view.innerHTML = state.settings.onboarded ? emptyState(ctx) : onboarding();
    bindEmpty(view, ctx);
    return;
  }
  if (!state.settings.onboarded) { state.settings.onboarded = true; ctx.put('/api/settings', { key: 'onboarded', value: true }).catch(() => {}); }

  // Привычки дня — единое правило для всех экранов (за прошлые дни — и ныне архивные)
  const alive = ctx.habitsOnDay(day);
  const cat = pref.get('cat', '');
  const shown = sortHabits(cat ? alive.filter(h => h.category === cat) : alive, ctx, day);
  const planned = shown.filter(h => !isCounter(h));
  const counters = shown.filter(isCounter);
  // Прогресс — по тем же карточкам, что на экране (с учётом фильтра категории)
  const { done, total } = ctx.memo(`progress:${day}:${cat}`, () => dayProgress(shown, state.comp, day));
  const pct = total ? Math.round((done / total) * 100) : 0;
  const catLabel = cat ? categoryOf(cat).label : '';
  // Раньше самой ранней даты старта листать незачем
  const firstDay = state.habits.reduce((m, h) => (h.created_day < m ? h.created_day : m), state.today);

  view.innerHTML = `
    <div class="daynav">
      <button data-day="-1" aria-label="Предыдущий день" ${day <= firstDay ? 'disabled' : ''}>‹</button>
      <div class="daynav-t">${isToday ? 'Сегодня' : esc(dayLong(day))}<small>${isToday ? esc(dayLong(day)) : ''}</small></div>
      <button data-day="1" aria-label="Следующий день" ${isToday ? 'disabled' : ''}>›</button>
    </div>
    ${isToday ? '' : `<button class="banner" data-day="today">Отмечаешь ${esc(dayWd(day))} · <u>Вернуться к сегодня</u></button>`}
    ${total ? `
    <section class="hero">
      <div class="progress-row">
        <div class="big">${done}<span> из ${total}</span></div>
        <div class="pct">${done === total ? 'Всё сделано 🎉' : pct + '% выполнено'}</div>
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </section>` : ''}
    ${alive.length >= 2 ? `<div class="toolbar"><button class="tool" id="filterBtn">⚙ ${esc(catLabel || SORTS[pref.get('sort', 'own')])}</button></div>` : ''}
    <div class="cards">${planned.map(h => card(h, ctx, day)).join('')}</div>
    ${counters.length ? `<h2 class="section-t">Учёт</h2><div class="cards">${counters.map(h => counterCard(h, ctx, day)).join('')}</div>` : ''}
    ${!shown.length ? `<div class="empty">${alive.length ? 'В этой категории привычек нет.' : 'В этот день привычек ещё не было. Дату старта можно поменять в «Изменить» на экране привычки.'}</div>` : ''}
    ${diaryCard(ctx, day)}`;

  view.onclick = (e) => {
    const nav = e.target.closest('[data-day]');
    if (nav) {
      const d = nav.dataset.day;
      state.day = d === 'today' ? state.today : addDays(day, Number(d));
      if (state.day > state.today) state.day = state.today;
      if (state.day < firstDay) state.day = firstDay;
      return ctx.render();
    }
    if (e.target.closest('#filterBtn')) return openFilter(ctx, alive);
    const dc = e.target.closest('[data-diary]');
    if (dc) {
      Object.assign(state, { tab: 'diary', diaryMode: 'day', diaryDay: dc.dataset.diary });
      window.scrollTo(0, 0);
      return ctx.render();
    }
    const a = e.target.closest('[data-act]');
    if (a) {
      const h = ctx.habitById(a.dataset.act);
      if (h.type === 'number') return openInput(ctx, h, day);
      const has = (state.comp[h.id] || {})[day] !== undefined;
      ctx.mark(h, day, has ? null : 1);
      if (!has) {
        const p = dayProgress(ctx.habitsOnDay(day), state.comp, day);
        if (p.total && p.done === p.total) ctx.toast('🎉 Все привычки дня сделаны!');
      }
      return;
    }
    const o = e.target.closest('[data-open]');
    if (o) openHabitScreen(ctx, ctx.habitById(o.dataset.open));
  };
}

function bindEmpty(view, ctx) {
  const today = ctx.state.today;
  view.onclick = async (e) => {
    if (e.target.closest('#ownHabit')) return openForm(ctx);
    if (e.target.closest('#toArchive')) return openArchive(ctx);
    const p = e.target.closest('[data-preset]');
    if (p) {
      const t = TEMPLATES[Number(p.dataset.preset)];
      return ctx.run(() => ctx.post('/api/habits', { ...t, created_day: today }), `Добавил «${t.name}»`);
    }
    if (e.target.closest('#startBtn')) {
      const picked = [...view.querySelectorAll('[data-tpl]:checked')].map(x => TEMPLATES[Number(x.dataset.tpl)]);
      if (!picked.length) return ctx.toast('Отметь хотя бы одну или создай свою');
      await ctx.run(async () => {
        for (const t of picked) await ctx.post('/api/habits', { ...t, created_day: today });
        await ctx.put('/api/settings', { key: 'onboarded', value: true });
      }, 'Готово! Отмечай выполнение тапом справа');
    }
  };
}
