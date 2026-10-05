// Неделя (SPEC §3): карточки «Всего / Сегодня / Макс серия / ТОП», таблица привычка × дни,
// факт/план одной ячейкой, фон строки по %, бейдж серии, «Учёт» и «Завершённые». Тап — правка дня.
import { addDays, isDone, inLife, periodStats, currentStreak, dayProgress, weekInfo, scheduledOnDay } from './logic.js';
import { esc, weekRange, fmtValue, fmtStreak, tint, WD_SHORT, num, pctClass } from './fmt.js';
import { groupFor } from './stats.js';
import { openInput } from './input-sheet.js';
import { openHabitScreen } from './habit-screen.js';

const rowAlpha = (p) => (p === null ? 0 : p >= 100 ? 0.13 : p >= 80 ? 0.09 : p >= 50 ? 0.07 : p > 0 ? 0.05 : 0.02);
const streakColor = (v) => (v >= 30 ? '#E53935' : v >= 14 ? '#FF6B35' : v >= 7 ? '#FFA500' : '#E0B000');

export function renderWeek(el, ctx) {
  const { state } = ctx;
  const { today, comp } = state;
  const start = state.weekStart;
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const isCurrent = days.includes(today);
  const g = groupFor(ctx, start, end);
  const stats = (h) => ctx.memo(`wk:${h.id}:${start}`, () => periodStats(h, comp[h.id] || {}, start, end, today));

  const planned = [...g.planned, ...g.archived];
  // Плитки — только по действующим привычкам (как «Сегодня X/Y»); завершённые видны строками ниже
  let top = null, maxStreak = null, pctSum = 0, pctN = 0;
  for (const h of g.planned) {
    const s = stats(h);
    if (s.pct !== null) { pctSum += s.pct; pctN++; if (!top || s.pct > top.pct) top = { h, pct: s.pct }; }
    // серия на конец просматриваемой недели; недели и дни сравниваем в днях
    const st = currentStreak(h, comp[h.id] || {}, end < today ? end : today);
    const days = (s) => (s ? s.value * (s.unit === 'week' ? 7 : 1) : 0);
    if (st && days(st) > days(maxStreak)) maxStreak = st;
  }
  const prog = isCurrent ? dayProgress(ctx.habitsOnDay(today), comp, today) : null;
  const avgPct = pctN ? Math.round(pctSum / pctN) : null;

  const cell = (h, d) => {
    const v = comp[h.id]?.[d];
    const future = d > today, out = !inLife(h, d);
    const done = isDone(h, v);
    // красный пропуск — только прошлый день в плане (не учёт, не weekly «в запасе», не сегодня)
    const cls = future ? 'future' : out ? 'off' : done ? 'ok' : Number(v) > 0 ? 'part'
      : (d < today && scheduledOnDay(h, comp[h.id] || {}, d) ? 'miss' : 'free');
    const label = h.type === 'number' && Number(v) > 0 ? fmtValue(h, v, { short: true }) : (done ? '✓' : '');
    return `<button class="cell ${cls}${d === today ? ' now' : ''}" data-h="${h.id}" data-d="${d}" ${future || out ? 'disabled' : ''}
      aria-label="${esc(h.name)}, ${d}${v !== undefined ? ', ' + esc(fmtValue(h, v)) : ''}">${esc(label)}</button>`;
  };

  const row = (h, archived = false) => {
    const s = stats(h);
    const st = archived ? null : currentStreak(h, comp[h.id] || {}, today);
    const w = h.schedule === 'weekly' ? weekInfo(h, comp[h.id] || {}, start) : null;
    // weekly — «сделано / план недели», цвет по выполнению плана; иначе % или «—», если плана нет
    const fp = w ? `${Math.min(w.doneCount, w.wp)}/${w.wp}` : h.type === 'number' ? (s.pct === null ? '—' : `${s.pct}%`) : `${s.doneDays}/${num(s.plan, 1)}`;
    const fpClass = w ? (w.doneCount >= w.wp ? 'p100' : end < today ? pctClass(Math.round((w.doneCount / w.wp) * 100)) : '') : pctClass(s.pct);
    return `<div class="wrow" style="--c:${h.color};background:${tint(h.color, rowAlpha(s.pct))}">
      <button class="wname" data-open="${h.id}"><span class="wic">${esc(h.icon)}${st?.value ? `<i class="sbadge" style="background:${streakColor(st.value)}">${st.value}</i>` : ''}</span>
        <span class="t">${esc(h.name)}</span>${h.type === 'number' ? `<small>${esc(fmtValue(h, s.sum))}</small>` : ''}</button>
      ${days.map(d => cell(h, d)).join('')}
      <div class="wfact ${fpClass}">${fp}</div>
    </div>`;
  };

  const counterRow = (h) => `<div class="wrow" style="--c:${h.color}">
      <button class="wname" data-open="${h.id}"><span class="wic">${esc(h.icon)}</span><span class="t">${esc(h.name)}</span><small>${esc(fmtValue(h, stats(h).sum))}</small></button>
      ${days.map(d => cell(h, d)).join('')}
      <div class="wfact">Σ</div>
    </div>`;

  const head = `<div class="wrow head">${days.map((d, i) => `<div class="wd${d === today ? ' now' : ''}">${WD_SHORT[i]}<b>${Number(d.slice(8))}</b></div>`).join('')}<div class="wfact">итог</div></div>`;

  el.innerHTML = `
    <div class="pager">
      <button data-nav="-1" aria-label="Прошлая неделя">‹</button>
      <div class="pager-t">${weekRange(start)}${isCurrent ? '<small>эта неделя</small>' : ''}</div>
      <button data-nav="1" aria-label="Следующая неделя" ${isCurrent ? 'disabled' : ''}>›</button>
    </div>
    ${g.alive.length ? `
    <div class="tiles four">
      <div class="tile"><div class="t">Всего</div><div class="v">${g.planned.length + g.counters.length}</div></div>
      <div class="tile"><div class="t">${prog ? 'Сегодня' : 'Выполнение'}</div><div class="v">${prog ? `${prog.done}/${prog.total}` : (avgPct === null ? '—' : avgPct + '%')}</div></div>
      <div class="tile"><div class="t">Макс серия</div><div class="v">${maxStreak?.value ? '🔥 ' + esc(fmtStreak(maxStreak)) : '—'}</div></div>
      <div class="tile"><div class="t">ТОП</div><div class="v small">${top ? `${esc(top.h.icon)} ${esc(top.h.name.length > 9 ? top.h.name.slice(0, 8) + '…' : top.h.name)} · ${top.pct}%` : '—'}</div></div>
    </div>
    ${g.planned.length ? `<h2 class="section-t">🎯 Привычки</h2><div class="wtable">${head}${g.planned.map(h => row(h)).join('')}</div>` : ''}
    ${g.counters.length ? `<h2 class="section-t">Учёт</h2><div class="wtable">${head}${g.counters.map(counterRow).join('')}</div>` : ''}
    ${g.archived.length ? `<h2 class="section-t">📁 Завершённые</h2><div class="wtable dim">${head}${g.archived.map(h => row(h, true)).join('')}</div>` : ''}
    <p class="hint">Тап по клетке — отметить или поправить тот день.</p>`
    : '<div class="empty">В эту неделю привычек не было.</div>'}`;

  el.onclick = (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { state.weekStart = addDays(start, 7 * Number(nav.dataset.nav)); return ctx.render(); }
    const o = e.target.closest('[data-open]');
    if (o) return openHabitScreen(ctx, ctx.habitById(o.dataset.open));
    const c = e.target.closest('.cell');
    if (!c || c.disabled) return;
    const h = ctx.habitById(c.dataset.h);
    const d = c.dataset.d;
    if (h.type === 'number') return openInput(ctx, h, d);
    ctx.mark(h, d, (comp[h.id] || {})[d] !== undefined ? null : 1);
  };
}
