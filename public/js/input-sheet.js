// Ввод количества за день (SPEC §2): итог дня крупно (тап = поправить), «+N», своё число,
// «Отменить» в тосте, под «Ещё» — «= цель», «Сбросить», заметка.
import { isCounter, dayProgress } from './logic.js';
import { esc, dayWd, fmtValue, fmtTarget, num, unitWord } from './fmt.js';
import { quickSteps, INT_UNITS, maxValue } from './consts.js';

export function openInput(ctx, h, day, { onDone = null } = {}) {
  const { state } = ctx;
  const target = Number(h.target_value) || 0;
  const key = `${h.id}:${day}`;
  const isToday = day === state.today;
  const max = maxValue(h);
  const intOnly = INT_UNITS.has(h.unit);
  const value = () => Number(state.comp[h.id]?.[day]) || 0;
  // #14: прошлый день без отметки — сразу «поправить итог» с подставленной целью
  let editing = !isToday && !value() && target > 0;

  // Число из поля: запятая как точка, штучные — только целые
  const parse = (s, { allowZero = false } = {}) => {
    const n = Number(String(s).replace(',', '.').trim());
    if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) return { error: 'Введи число больше нуля' };
    if (intOnly && !Number.isInteger(n)) return { error: `Здесь только целые: ${unitWord(h, 5)}` };
    return { n: Math.round(n * 100) / 100 };
  };

  const paint = () => {
    const v = value();
    const note = state.notes[h.id]?.[day] || '';
    const pct = target ? Math.min(100, Math.round((v / target) * 100)) : 0;
    const body = ctx.openSheet(`
      <div class="in-head" style="--c:${h.color}">
        <span class="hicon sm">${esc(h.icon)}</span>
        <div><h3>${esc(h.name)}</h3><div class="muted">${isToday ? 'Сегодня' : esc(dayWd(day))}${target ? ` · цель ${esc(fmtTarget(h))}` : ''}</div></div>
      </div>
      ${editing ? `
        <div class="total-edit">
          <input id="totalIn" type="text" inputmode="${intOnly ? 'numeric' : 'decimal'}" value="${v || target || ''}" aria-label="Итог за день">
          <span>${esc(unitWord(h, v || target || 5))}</span>
        </div>
        <div class="muted center">Не больше ${esc(fmtValue(h, max))} за день</div>
        <button class="btn" id="saveTotal">Сохранить итог</button>
        <button class="link" id="cancelEdit">Отмена</button>`
      : `
        <button class="total" id="total" aria-label="Поправить итог">
          <b>${esc(fmtValue(h, v))}</b>${target ? `<span>из ${esc(fmtTarget(h))}</span>` : ''}
          <small>✎ тап — поправить итог</small>
        </button>
        ${target ? `<div class="bar thin"><i style="width:${pct}%"></i></div>` : ''}
        <div class="steps-row">${quickSteps(h).map(s => `<button class="step" data-add="${s}" style="--c:${h.color}">+${num(s)}</button>`).join('')}</div>
        <div class="add-row">
          <input id="addIn" type="text" inputmode="${intOnly ? 'numeric' : 'decimal'}" placeholder="Своё число" aria-label="Добавить своё число">
          <button class="btn small" id="addBtn">Добавить</button>
        </div>
        <details class="more"${note ? ' open' : ''}>
          <summary>Ещё: цель, сброс, заметка</summary>
          <div class="row2">
            ${target && !isCounter(h) ? '<button class="btn small line" id="setTarget">= цель</button>' : ''}
            <button class="btn small line" id="reset">Сбросить день</button>
          </div>
          <div class="field"><label for="noteIn">Заметка к дню</label>
            <textarea id="noteIn" maxlength="200" rows="2" placeholder="Например: читал Толстого">${esc(note)}</textarea></div>
          <button class="btn small line" id="saveNote">Сохранить заметку</button>
        </details>
        <button class="btn" id="doneBtn">Готово</button>`}`);
    body.dataset.key = key;
    if (editing) setTimeout(() => body.querySelector('#totalIn')?.select(), 50);
    body.onclick = onClick;
    body.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      if (e.target.id === 'addIn') { e.preventDefault(); body.querySelector('#addBtn').click(); }
      if (e.target.id === 'totalIn') { e.preventDefault(); body.querySelector('#saveTotal').click(); }
    };
  };

  // Ответ сервера пришёл — обновить только итог и полоску: набранная заметка и своё число не стираются
  const updateTotal = () => {
    const body = document.querySelector('#sheetBody');
    if (!ctx.sheetOpen() || body.dataset.key !== key || editing) return;
    const v = value();
    const b = body.querySelector('#total b');
    if (b) b.textContent = fmtValue(h, v);
    const bar = body.querySelector('.bar.thin i');
    if (bar && target) bar.style.width = Math.min(100, Math.round((v / target) * 100)) + '%';
  };

  const finish = () => { ctx.closeSheet(); if (onDone) onDone(); };
  const restore = (before) => () => ctx.mark(h, day, before || null).then(updateTotal);

  const addDelta = (delta) => {
    const before = value();
    const after = before + delta;
    if (after > max) return ctx.toast(`Не больше ${fmtValue(h, max)} за день`);
    ctx.add(h, day, delta).then(updateTotal);
    updateTotal();
    const reached = target && before < target && after >= target;
    let msg = `+${fmtValue(h, delta)} · итого ${fmtValue(h, after)}`;
    if (reached) {
      const p = dayProgress(ctx.habitsOnDay(day), state.comp, day);
      msg = p.total && p.done === p.total ? '🎉 Все привычки дня сделаны!' : '🎯 Цель достигнута!';
    }
    ctx.toast(msg, { label: 'Отменить', run: restore(before) });
  };

  function onClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    const $ = (s) => document.querySelector('#sheetBody ' + s);
    if (t.dataset.add) return addDelta(Number(t.dataset.add));
    if (t.id === 'addBtn') {
      const r = parse($('#addIn').value);
      if (r.error) return ctx.toast(r.error);
      $('#addIn').value = '';
      return addDelta(r.n);
    }
    if (t.id === 'total') { editing = true; return paint(); }
    if (t.id === 'cancelEdit') { editing = false; return paint(); }
    if (t.id === 'saveTotal') {
      const raw = $('#totalIn').value.trim();
      const r = raw === '' ? { n: 0 } : parse(raw, { allowZero: true });
      if (r.error) return ctx.toast(r.error);
      if (r.n > max) return ctx.toast(`Не больше ${fmtValue(h, max)} за день`);
      ctx.mark(h, day, r.n || null);
      return finish();
    }
    if (t.id === 'setTarget') { ctx.mark(h, day, target); return finish(); }
    if (t.id === 'reset') {
      const before = value();
      const note = state.notes[h.id]?.[day] || '';
      ctx.mark(h, day, null, '');
      finish();
      if (before || note) ctx.toast('День сброшен', { label: 'Отменить', run: () => ctx.mark(h, day, before || null, note) });
      return;
    }
    if (t.id === 'saveNote') {
      ctx.mark(h, day, value() || null, $('#noteIn').value.trim());
      ctx.toast('Заметка сохранена');
      return;
    }
    if (t.id === 'doneBtn') finish();
  }

  paint();
}
