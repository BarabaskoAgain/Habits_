// Год (SPEC §3, перенос Core2 с исправлениями): «🎯 ГОД В ОБЗОРЕ», кварталы (тап — месяцы и лучшие
// привычки квартала), теплокарта 12 месяцев (тап — вкладка «Месяц»), Топ-5 года, учёт за год.
import { monthEnd, periodStats, bestStreak, percent } from './logic.js';
import { esc, MONTHS, fmtValue, fmtStreak, pctClass } from './fmt.js';
import { groupFor } from './stats.js';
import { openHabitScreen } from './habit-screen.js';

const Q = [['Q1', '🌱', 0], ['Q2', '☀️', 3], ['Q3', '🍂', 6], ['Q4', '❄️', 9]];
const mm = (n) => String(n).padStart(2, '0');
// План и факт в «днях»: количественная привычка делится на цель, чтобы 10 000 шагов не перевешивали зарядку
const unit = (h) => (h.type === 'number' ? Number(h.target_value) : 1);

export function renderYear(el, ctx) {
  const { state } = ctx;
  const { today, comp } = state;
  const y = Number(state.year || today.slice(0, 4));
  const from = `${y}-01-01`, to = `${y}-12-31`;
  const isCurrent = today.startsWith(String(y));
  const g = groupFor(ctx, from, to);
  const planned = [...g.planned, ...g.archived];

  const stats = (h, a, b) => ctx.memo(`yr:${h.id}:${a}:${b}`, () => periodStats(h, comp[h.id] || {}, a, b, today));
  const agg = (a, b) => {
    let fact = 0, plan = 0, done = 0;
    for (const h of planned) {
      const s = stats(h, a, b);
      fact += s.fact / unit(h); plan += s.plan / unit(h); done += s.doneDays;
    }
    return { pct: percent(fact, plan), done };
  };
  const year = agg(from, to);
  const days = (s) => (s ? s.value * (s.unit === 'week' ? 7 : 1) : 0);
  let best = null;
  for (const h of planned) {
    const clipped = { ...h, created_day: h.created_day > from ? h.created_day : from };
    const b = bestStreak(clipped, comp[h.id] || {}, to < today ? to : today);
    if (b && days(b) > days(best)) best = b;
  }
  const months = Array.from({ length: 12 }, (_, i) => {
    const a = `${y}-${mm(i + 1)}-01`;
    return { i, a, ...agg(a, monthEnd(a)) };
  });
  const top = planned.map(h => ({ h, s: stats(h, from, to) })).filter(x => x.s.pct !== null)
    .sort((a, b) => b.s.pct - a.s.pct).slice(0, 5);
  const counters = g.counters.map(h => ({ h, sum: stats(h, from, to).sum })).filter(x => x.sum > 0);

  el.innerHTML = `
    <div class="pager">
      <button data-ynav="-1" aria-label="Прошлый год">‹</button>
      <div class="pager-t">🎯 ${y} год в обзоре</div>
      <button data-ynav="1" aria-label="Следующий год" ${isCurrent ? 'disabled' : ''}>›</button>
    </div>
    ${planned.length || counters.length ? `
    <div class="tiles">
      <div class="tile"><div class="t">Общий успех</div><div class="v ${pctClass(year.pct)}">${year.pct === null ? '—' : year.pct + '%'}</div></div>
      <div class="tile"><div class="t">Лучшая серия</div><div class="v">${best?.value ? '🔥 ' + esc(fmtStreak(best)) : '—'}</div></div>
      <div class="tile"><div class="t">Привычек</div><div class="v">${g.alive.length}</div></div>
      <div class="tile"><div class="t">Дней выполнено</div><div class="v">${year.done}</div></div>
    </div>
    <h2 class="section-t">📊 Кварталы</h2>
    <div class="quarters">${Q.map(([name, icon, m0]) => {
      const q = agg(`${y}-${mm(m0 + 1)}-01`, monthEnd(`${y}-${mm(m0 + 3)}-01`));
      return `<button class="quarter" data-q="${m0}"><span>${icon} ${name}</span><b class="${pctClass(q.pct)}">${q.pct === null ? '—' : q.pct + '%'}</b></button>`;
    }).join('')}</div>
    <h2 class="section-t">🗓️ Месяцы</h2>
    <div class="ymonths">${months.map(m => `<button class="ymonth" data-m="${m.a.slice(0, 7)}" ${m.a > today ? 'disabled' : ''}>
        <span>${MONTHS[m.i].slice(0, 3)}</span><b class="${pctClass(m.pct)}">${m.pct === null ? '—' : m.pct + '%'}</b></button>`).join('')}</div>
    ${top.length ? `<h2 class="section-t">🏆 Топ привычек года</h2>${top.map(({ h, s }, i) => `
      <button class="sum-row" data-open="${h.id}" style="--c:${h.color}"><span class="rank">${i + 1}</span><span class="hicon sm">${esc(h.icon)}</span>
        <span class="t">${esc(h.name)}<small>${esc(h.type === 'number' ? fmtValue(h, s.sum) : `${s.doneDays} дн.`)}</small></span>
        <b class="${pctClass(s.pct)}">${s.pct}%</b></button>`).join('')}` : ''}
    ${counters.length ? `<h2 class="section-t">Учёт за год</h2>${counters.map(({ h, sum }) => `
      <button class="sum-row" data-open="${h.id}" style="--c:${h.color}"><span class="hicon sm">${esc(h.icon)}</span>
        <span class="t">${esc(h.name)}</span><b>${esc(fmtValue(h, sum))}</b></button>`).join('')}` : ''}`
    : '<div class="empty">В этом году привычек не было.</div>'}`;

  el.onclick = (e) => {
    const n = e.target.closest('[data-ynav]');
    if (n) { state.year = String(y + Number(n.dataset.ynav)); return ctx.render(); }
    const m = e.target.closest('[data-m]');
    if (m && !m.disabled) { state.month = m.dataset.m; state.statsTab = 'month'; return ctx.render(); }
    const q = e.target.closest('[data-q]');
    if (q) return openQuarter(ctx, y, Number(q.dataset.q), planned, stats, agg);
    const o = e.target.closest('[data-open]');
    if (o) openHabitScreen(ctx, ctx.habitById(o.dataset.open));
  };
}

// Шторка квартала: месяцы и лучшие привычки именно этого квартала (в Core2 были годовые — исправлено)
function openQuarter(ctx, y, m0, planned, stats, agg) {
  const [name, icon] = Q[m0 / 3];
  const a = `${y}-${mm(m0 + 1)}-01`, b = monthEnd(`${y}-${mm(m0 + 3)}-01`);
  const q = agg(a, b);
  const top = planned.map(h => ({ h, s: stats(h, a, b) })).filter(x => x.s.pct !== null)
    .sort((x, z) => z.s.pct - x.s.pct).slice(0, 3);
  const body = ctx.openSheet(`
    <h3>${icon} ${name} ${y}</h3>
    <div class="muted">Выполнено ${q.pct === null ? '—' : q.pct + '%'} · ${q.done} дн. с отметкой</div>
    <div class="daylist">${[0, 1, 2].map(i => {
      const ma = `${y}-${mm(m0 + i + 1)}-01`, m = agg(ma, monthEnd(ma));
      return `<button class="dayrow" data-m="${ma.slice(0, 7)}"><span class="t">${MONTHS[m0 + i]}</span>
        <b class="${pctClass(m.pct)}">${m.pct === null ? '—' : m.pct + '%'}</b></button>`;
    }).join('')}</div>
    ${top.length ? `<h3 class="mt">🏆 Лучшие привычки квартала</h3><div class="daylist">${top.map(({ h, s }) => `
      <div class="dayrow" style="--c:${h.color}"><span class="hicon sm">${esc(h.icon)}</span><span class="t">${esc(h.name)}</span>
      <b class="${pctClass(s.pct)}">${s.pct}%</b></div>`).join('')}</div>` : ''}`);
  body.onclick = (e) => {
    const m = e.target.closest('[data-m]');
    if (!m) return;
    ctx.state.month = m.dataset.m; ctx.state.statsTab = 'month';
    ctx.closeSheet(); ctx.render();
  };
}
