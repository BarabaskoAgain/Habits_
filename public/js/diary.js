// Вкладка «Дневник» (SPEC §9a): день — описание и события; неделя/месяц/год — сводки (diary-summary.js).
import { addDays, monthStart, monthEnd, plural, DIARY_KINDS } from './logic.js';
import { esc, dayLong, dayWd } from './fmt.js';
import { diaryRange, patchDiary, drafts, KIND } from './diary-store.js';
import { renderDiarySummary } from './diary-summary.js';

const MODES = [['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']];
const EVENT_WORDS = ['событие', 'события', 'событий'];

// Описание и события одного дня — из месячного диапазона (листание по дням не дёргает сервер)
function dayData(ctx, day) {
  const data = diaryRange(ctx, monthStart(day), monthEnd(day));
  if (!data) return null;
  return { text: data.days.find(d => d.day === day)?.text || '', events: data.events.filter(e => e.day === day) };
}

// ---------- карточка «Как прошёл день?» на «Сегодня» ----------
export function diaryCard(ctx, day) {
  const d = dayData(ctx, day);
  const n = d?.events.length || 0;
  const filled = !!(d && (d.text || n));
  const avg = n ? Math.round(d.events.reduce((s, e) => s + e.rating, 0) / n * 10) / 10 : null;
  const sub = filled
    ? [d.text ? (d.text.length > 80 ? d.text.slice(0, 80) + '…' : d.text) : '',
      n ? `${n} ${plural(n, EVENT_WORDS)} · ★ ${avg}` : ''].filter(Boolean).join(' · ')
    : 'Пара слов о дне и главные события';
  return `<button class="diary-card${filled ? ' filled' : ''}" data-diary="${day}">
    <span class="dc-ic" aria-hidden="true">📔</span>
    <span class="dc-t"><b>${filled ? 'Дневник дня' : 'Как прошёл день?'}</b><small>${esc(sub)}</small></span>
    <span class="dc-go" aria-hidden="true">›</span></button>`;
}

// ---------- вкладка ----------

export function renderDiary(view, ctx) {
  const { state } = ctx;
  state.diaryMode ||= 'day';
  state.diaryDay ||= state.today;
  if (state.diaryDay > state.today) state.diaryDay = state.today;

  // Фокус и курсор в описании переживают перерисовку (ответ сервера, возврат в приложение)
  const a = document.activeElement;
  const keep = a?.id === 'dText' ? { start: a.selectionStart, end: a.selectionEnd } : null;

  view.innerHTML = `
    <div class="seg stats-seg">${MODES.map(([k, l]) => `<button data-dm="${k}" class="${state.diaryMode === k ? 'sel' : ''}">${l}</button>`).join('')}</div>
    <div id="diaryBody"></div>`;
  view.onclick = (e) => {
    const t = e.target.closest('[data-dm]');
    if (!t) return;
    state.diaryMode = t.dataset.dm;
    ctx.render();
  };
  const body = view.querySelector('#diaryBody');
  if (state.diaryMode !== 'day') return renderDiarySummary(body, ctx, state.diaryMode);
  renderDay(body, ctx);
  const ta = keep && body.querySelector('#dText');
  if (ta) { ta.focus(); ta.setSelectionRange(keep.start, keep.end); }
}

function renderDay(el, ctx) {
  const { state } = ctx;
  const day = state.diaryDay;
  const isToday = day === state.today;
  const d = dayData(ctx, day);
  const saved = d?.text || '';
  const text = drafts.has(day) ? drafts.get(day) : saved;
  const dirty = text !== saved;

  el.innerHTML = `
    <div class="daynav">
      <button data-dday="-1" aria-label="Предыдущий день">‹</button>
      <div class="daynav-t">${isToday ? 'Сегодня' : esc(dayLong(day))}<small>${isToday ? esc(dayLong(day)) : ''}</small></div>
      <button data-dday="1" aria-label="Следующий день" ${isToday ? 'disabled' : ''}>›</button>
    </div>
    ${isToday ? '' : `<button class="banner" data-dday="today">Дневник за ${esc(dayWd(day))} · <u>К сегодня</u></button>`}
    ${!d ? '<div class="empty">Загружаю…</div>' : `
    <section class="panel diary-text">
      <label for="dText" class="panel-t">Как прошёл день?</label>
      <textarea id="dText" maxlength="500" rows="4" placeholder="Пара слов о дне. Можно надиктовать: микрофон на клавиатуре">${esc(text)}</textarea>
      <div class="dt-row"><small class="muted" id="dCount">${text.length} / 500</small>
        <button class="btn small" id="dSave" ${dirty ? '' : 'disabled'}>${dirty ? 'Сохранить' : 'Сохранено'}</button></div>
    </section>
    <h2 class="section-t">События дня${d.events.length ? ` · ${d.events.length}` : ''}</h2>
    <div class="events">${d.events.map(eventRow).join('') || '<div class="empty small">Пока пусто. Работа, спорт, встреча, кино: всё, что стоит запомнить.</div>'}</div>
    <button class="btn line" id="evAdd">+ Добавить событие</button>`}`;

  const ta = el.querySelector('#dText');
  if (ta) {
    ta.oninput = () => {
      drafts.set(day, ta.value);
      el.querySelector('#dCount').textContent = `${ta.value.length} / 500`;
      const btn = el.querySelector('#dSave');
      btn.disabled = false; btn.textContent = 'Сохранить';
    };
    // Ушли из поля — сохраняем сами, чтобы текст не потерялся
    ta.onblur = () => { if (drafts.has(day) && drafts.get(day) !== saved) saveText(ctx, day); };
  }
  el.onclick = (e) => {
    const nav = e.target.closest('[data-dday]');
    if (nav) {
      const v = nav.dataset.dday;
      state.diaryDay = v === 'today' ? state.today : addDays(day, Number(v));
      if (state.diaryDay > state.today) state.diaryDay = state.today;
      return ctx.render();
    }
    if (e.target.closest('#dSave')) return saveText(ctx, day);
    if (e.target.closest('#evAdd')) return openEvent(ctx, { day });
    const row = e.target.closest('[data-ev]');
    if (row) openEvent(ctx, d.events.find(x => x.id === Number(row.dataset.ev)));
  };
}

// Цвет оценки: 1–3 низкая, 4–6 средняя, 7–10 хорошая
export const ratingClass = (r) => (r >= 7 ? 'r-hi' : r >= 4 ? 'r-mid' : 'r-lo');

export function eventRow(e, { withDay = false } = {}) {
  const k = KIND[e.kind] || KIND.other;
  return `<button class="event" data-ev="${e.id}" data-evday="${e.day}">
    <span class="ev-ic" aria-hidden="true">${k.icon}</span>
    <span class="ev-t"><b>${esc(e.title)}</b><small>${withDay ? esc(dayWd(e.day)) + ' · ' : ''}${esc(k.name)}${e.note ? ' · ' + esc(e.note) : ''}</small></span>
    <span class="ev-r ${ratingClass(e.rating)}" aria-label="Оценка ${e.rating} из 10">${e.rating}</span></button>`;
}

let saving = Promise.resolve();
function saveText(ctx, day) {
  // Сохранения — строго по очереди: blur и кнопка не обгоняют друг друга
  saving = saving.catch(() => {}).then(async () => {
    const text = drafts.get(day);
    if (text === undefined) return;
    try {
      const res = await ctx.put('/api/diary/day', { day, text });
      patchDiary(day, (d) => ({
        ...d, days: [...d.days.filter(x => x.day !== day), ...(res.text ? [res] : [])]
      }));
      if (drafts.get(day) === text) drafts.delete(day);
      ctx.toast(text.trim() ? 'Записал в дневник' : 'Описание дня удалено');
    } catch (e) {
      if (e.message !== 'auth') ctx.toast('Не сохранилось: ' + e.message + '. Текст остался в поле');
    }
    ctx.rerender();
  });
}

// ---------- шторка события ----------
export function openEvent(ctx, ev) {
  const isNew = !ev.id;
  let kind = ev.kind || 'other';
  let rating = ev.rating || 7;
  const body = ctx.openSheet(`
    <div class="sheet-h"><b>${isNew ? 'Новое событие' : 'Событие'}</b><small>${esc(dayWd(ev.day))}</small></div>
    <div class="kinds" role="radiogroup" aria-label="Тип события">${DIARY_KINDS.map(k =>
      `<button data-kind="${k.code}" role="radio" aria-checked="${k.code === kind}" class="${k.code === kind ? 'sel' : ''}">${k.icon} ${esc(k.name)}</button>`).join('')}</div>
    <label class="fld">Что было<input id="eTitle" maxlength="100" value="${esc(ev.title || '')}" placeholder="Например: тренировка в зале" autocomplete="off"></label>
    <div class="fld">Оценка: <b id="eRv">${rating}</b> из 10
      <div class="rating" role="radiogroup" aria-label="Оценка">${Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
        `<button data-r="${n}" role="radio" aria-checked="${n === rating}" class="${n === rating ? 'sel' : ''}">${n}</button>`).join('')}</div></div>
    <label class="fld">Заметка<textarea id="eNote" maxlength="200" rows="2" placeholder="Необязательно">${esc(ev.note || '')}</textarea></label>
    <button class="btn" id="eSave">Сохранить</button>
    ${isNew ? '' : '<button class="btn danger" id="eDel">Удалить событие</button>'}`);

  const pick = (sel, attr, val) => body.querySelectorAll(sel).forEach(b => {
    const on = b.dataset[attr] === String(val);
    b.classList.toggle('sel', on);
    b.setAttribute('aria-checked', String(on));
  });
  body.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.kind) { kind = t.dataset.kind; return pick('[data-kind]', 'kind', kind); }
    if (t.dataset.r) {
      rating = Number(t.dataset.r);
      body.querySelector('#eRv').textContent = rating;
      return pick('[data-r]', 'r', rating);
    }
    if (t.id === 'eSave') {
      const title = body.querySelector('#eTitle').value.trim();
      if (!title) { ctx.toast('Напиши, что было'); return body.querySelector('#eTitle').focus(); }
      t.disabled = true;
      const payload = { day: ev.day, kind, title, rating, note: body.querySelector('#eNote').value, ...(isNew ? {} : { id: ev.id }) };
      const ok = await ctx.run(() => ctx.post('/api/diary/events', payload), isNew ? 'Событие добавлено' : 'Сохранено');
      if (!ok) { t.disabled = false; return; }
      const saved = ok.event;
      patchDiary(ev.day, (d) => ({
        ...d, events: isNew ? [...d.events, saved] : d.events.map(x => (x.id === saved.id ? saved : x))
      }));
      ctx.rerender();
      return;
    }
    if (t.id === 'eDel') {
      // второй тап засчитывается не раньше чем через 0,6 с — быстрый двойной тап не удалит
      if (!t.classList.contains('ask')) { t.classList.add('ask'); t.dataset.askAt = Date.now(); t.textContent = 'Точно удалить? Тап ещё раз'; return; }
      if (Date.now() - Number(t.dataset.askAt) < 600) return;
      if (await ctx.run(() => ctx.del(`/api/diary/events/${ev.id}`), 'Событие удалено')) {
        patchDiary(ev.day, (d) => ({ ...d, events: d.events.filter(x => x.id !== ev.id) }));
        ctx.rerender();
      }
    }
  };
}
