// Месяц (SPEC §3): календарь «X/Y» с цветами и легендой, тап по дню — список с факт/план/статус и правкой,
// «📋 Итоги по привычкам»: Факт, План, Лучшая серия, «Вып P%»; учёт — только суммы.
import { addDays, shiftMonth, monthEnd, weekdayIndex, weekStart, isDone, isCounter, scheduledOnDay, dayProgress, periodStats, bestStreak } from './logic.js';
import { esc, MONTHS, WD_SHORT, dayLong, fmtValue, fmtTarget, fmtStreak, pctClass, num } from './fmt.js';
import { groupFor } from './stats.js';
import { openInput } from './input-sheet.js';
import { openHabitScreen } from './habit-screen.js';

const dayClass = (p) => (!p.total ? '' : p.done === p.total ? 'd100' : p.done / p.total >= 0.5 ? 'd50' : p.done ? 'd1' : 'd0');

export function renderMonth(el, ctx) {
  const { state } = ctx;
  const { today, comp } = state;
  const ym = state.month;
  const first = ym + '-01', last = monthEnd(first);
  const isCurrent = today.startsWith(ym);
  const g = groupFor(ctx, first, last);

  const cells = [];
  for (let i = 0; i < weekdayIndex(first); i++) cells.push('<div class="mday pad"></div>');
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const future = d > today;
    const p = future ? { done: 0, total: 0 } : ctx.memo(`dp:${d}`, () => dayProgress(ctx.habitsOnDay(d), comp, d));
    // сегодняшний день ещё идёт — красным не красим, пока не всё сделано
    const cls = future || (d === today && p.done < p.total) ? '' : dayClass(p);
    cells.push(`<button class="mday ${cls}${d === today ? ' now' : ''}" data-d="${d}" ${future ? 'disabled' : ''}>
      <b>${Number(d.slice(8))}</b><small>${future ? '' : p.total ? `${p.done}/${p.total}` : '–'}</small></button>`);
  }

  const summary = (h) => {
    const marks = comp[h.id] || {};
    const s = ctx.memo(`mo:${h.id}:${ym}`, () => periodStats(h, marks, first, last, today));
    if (isCounter(h)) {
      return `<button class="sum-row" data-open="${h.id}" style="--c:${h.color}"><span class="hicon sm">${esc(h.icon)}</span>
        <span class="t">${esc(h.name)}<small>${s.doneDays} дн. с отметкой</small></span><b>${esc(fmtValue(h, s.sum))}</b></button>`;
    }
    // Лучшая серия внутри месяца: жизнь привычки обрезается границами месяца
    // weekly — с начала недели, в которую попало 1-е число, иначе неделя на стыке месяцев «рвётся»
    const from = h.schedule === 'weekly' ? weekStart(first) : first;
    const clipped = { ...h, created_day: h.created_day > from ? h.created_day : from };
    const best = bestStreak(clipped, marks, last < today ? last : today);
    return `<button class="sum-row" data-open="${h.id}" style="--c:${h.color}"><span class="hicon sm">${esc(h.icon)}</span>
      <span class="t">${esc(h.name)}<small>Факт ${esc(h.type === 'number' ? fmtValue(h, s.sum) : String(s.doneDays))} · план ${esc(h.type === 'number' ? fmtValue(h, Math.round(s.plan)) : num(s.plan, 1))} · лучшая серия ${esc(fmtStreak(best))}</small></span>
      <b class="${pctClass(s.pct)}">${s.pct === null ? '—' : s.pct + '%'}</b></button>`;
  };

  el.innerHTML = `
    <div class="pager">
      <button data-nav="-1" aria-label="Прошлый месяц">‹</button>
      <div class="pager-t">📊 ${MONTHS[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}</div>
      <button data-nav="1" aria-label="Следующий месяц" ${isCurrent ? 'disabled' : ''}>›</button>
    </div>
    ${g.alive.length ? `
    <div class="mgrid">${WD_SHORT.map(w => `<div class="mwd">${w}</div>`).join('')}${cells.join('')}</div>
    <div class="legend"><i class="d100"></i>100% <i class="d50"></i>50%+ <i class="d1"></i>меньше <i class="d0"></i>0%</div>
    ${g.planned.length ? `<h2 class="section-t">📋 Итоги по привычкам</h2>${g.planned.map(summary).join('')}` : ''}
    ${g.counters.length ? `<h2 class="section-t">Учёт</h2>${g.counters.map(summary).join('')}` : ''}
    ${g.archived.length ? `<h2 class="section-t">📁 Завершённые</h2><div class="dim">${g.archived.map(summary).join('')}</div>` : ''}`
    : '<div class="empty">В этом месяце у вас не было привычек.</div>'}`;

  el.onclick = (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { state.month = shiftMonth(ym, Number(nav.dataset.nav)); return ctx.render(); }
    const o = e.target.closest('[data-open]');
    if (o) return openHabitScreen(ctx, ctx.habitById(o.dataset.open));
    const d = e.target.closest('.mday[data-d]');
    if (d && !d.disabled) openDay(ctx, d.dataset.d);
  };
}

// Шторка дня: «Выполнено X из Y», привычки с факт/план/статус, правка тапом
function openDay(ctx, day) {
  const paint = () => {
    const { comp } = ctx.state;
    const alive = ctx.habitsOnDay(day); // то же правило, что на «Сегодня» и в календаре
    const p = dayProgress(alive, comp, day);
    const body = ctx.openSheet(`
      <h3>${esc(dayLong(day))}${day === ctx.state.today ? ' <span class="pbadge mid">сегодня</span>' : ''}</h3>
      <div class="muted">${p.total ? `Выполнено ${p.done} из ${p.total} (${Math.round((p.done / p.total) * 100)}%)` : 'В этот день у вас не было привычек по плану'}</div>
      <div class="daylist">${alive.map(h => {
        const v = comp[h.id]?.[day];
        const done = isDone(h, v);
        const over = h.type === 'number' && Number(h.target_value) && Number(v) > h.target_value;
        const status = isCounter(h) ? '' : over ? '🔥' : done ? '✓' : Number(v) > 0 ? '◐' : scheduledOnDay(h, comp[h.id] || {}, day) ? '✗' : '·';
        return `<button class="dayrow" data-h="${h.id}" style="--c:${h.color}">
          <span class="hicon sm">${esc(h.icon)}</span>
          <span class="t">${esc(h.name)}<small>${h.type === 'number' ? `${v !== undefined ? esc(fmtValue(h, v)) : '0'}${isCounter(h) ? '' : ' / ' + esc(fmtTarget(h))}` : (done ? 'Сделано' : 'Не отмечено')}</small></span>
          <span class="st ${done ? 'ok' : ''}">${status}</span></button>`;
      }).join('')}</div>`);
    body.onclick = (e) => {
      const r = e.target.closest('[data-h]');
      if (!r) return;
      const h = ctx.habitById(r.dataset.h);
      if (h.type === 'number') return openInput(ctx, h, day, { onDone: paint });
      ctx.mark(h, day, (ctx.state.comp[h.id] || {})[day] !== undefined ? null : 1);
      paint();
    };
  };
  paint();
}
