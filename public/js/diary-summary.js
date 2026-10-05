// Сводки дневника за неделю / месяц / год (SPEC §9a): счётчики, средняя оценка, по типам,
// лучшие и худшие события, график средней оценки, дни без записей, лента описаний, «скопировать текстом».
import { addDays, weekStart, monthStart, monthEnd, shiftMonth, diarySummary, plural } from './logic.js';
import { esc, num, dayShort, dayWd, weekRange, MONTHS, DAY_WORDS } from './fmt.js';
import { barChart } from './chart.js';
import { diaryRange, KIND } from './diary-store.js';
import { eventRow, openEvent } from './diary.js';

const EVENT_WORDS = ['событие', 'события', 'событий'];
const FEED_LIMIT = 20;
let feedAll = false;

// Период режима: начало, конец, подпись, сдвиг
function period(mode, start) {
  if (mode === 'week') return { from: start, to: addDays(start, 6), label: weekRange(start), shift: (n) => addDays(start, 7 * n) };
  if (mode === 'month') {
    const label = `${MONTHS[Number(start.slice(5, 7)) - 1]} ${start.slice(0, 4)}`;
    return { from: start, to: monthEnd(start), label, shift: (n) => shiftMonth(start.slice(0, 7), n) + '-01' };
  }
  const y = Number(start.slice(0, 4));
  return { from: start, to: `${y}-12-31`, label: `${y} год`, shift: (n) => `${y + n}-01-01` };
}
const startOf = (mode, day) => (mode === 'week' ? weekStart(day) : mode === 'month' ? monthStart(day) : day.slice(0, 4) + '-01-01');

// График: по дням (неделя, месяц) или по месяцам (год)
function chartBars(mode, s, events) {
  if (mode !== 'year') {
    return s.series.map(x => ({
      label: mode === 'week' ? dayWd(x.day).slice(0, 2) : String(Number(x.day.slice(8))),
      value: x.avg || 0, title: `${dayWd(x.day)}: ${x.avg === null ? 'нет событий' : '★ ' + num(x.avg, 1)}`
    }));
  }
  return MONTHS.map((m, i) => {
    const rs = events.filter(e => Number(e.day.slice(5, 7)) === i + 1).map(e => e.rating);
    const avg = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
    return { label: m.slice(0, 3), value: avg, title: `${m}: ${rs.length ? '★ ' + num(avg, 1) : 'нет событий'}` };
  });
}

function summaryText(p, s) {
  const lines = [`📔 Дневник: ${p.label}`, '',
    `Событий: ${s.count}${s.avg !== null ? `, средняя оценка ${num(s.avg, 1)}` : ''}`,
    `Дней без записей: ${s.emptyDays}`];
  if (s.byKind.length) {
    lines.push('', 'По типам:');
    for (const k of s.byKind) lines.push(`• ${KIND[k.kind]?.icon || ''} ${KIND[k.kind]?.name || k.kind}: ${k.count} (★ ${num(k.avg, 1)})`);
  }
  const ev = (e) => `• ${e.rating}/10 · ${e.title} (${dayShort(e.day)})`;
  if (s.top.length) lines.push('', 'Лучшее:', ...s.top.map(ev));
  if (s.worst.length) lines.push('', 'Худшее:', ...s.worst.map(ev));
  return lines.join('\n');
}

export function renderDiarySummary(el, ctx, mode) {
  const { state } = ctx;
  state.diaryPeriod ||= {};
  const start = state.diaryPeriod[mode] || startOf(mode, state.today);
  const p = period(mode, start);
  const isCurrent = p.to >= state.today;
  const data = diaryRange(ctx, p.from, p.to);

  const head = `<div class="pager">
      <button data-dp="-1" aria-label="Предыдущий период">‹</button>
      <div class="pager-t">${esc(p.label)}</div>
      <button data-dp="1" aria-label="Следующий период" ${isCurrent ? 'disabled' : ''}>›</button>
    </div>`;
  const s = data && diarySummary(data.days, data.events, p.from, p.to, state.today);

  if (!s) el.innerHTML = head + '<div class="empty">Загружаю…</div>';
  else if (!s.count && !s.feed.length) {
    el.innerHTML = head + '<div class="empty">За этот период записей нет. Открой «День» и напиши пару слов или добавь событие.</div>';
  } else {
    const lived = s.series.length;
    const feed = feedAll ? s.feed : s.feed.slice(0, FEED_LIMIT);
    el.innerHTML = head + `
    <div class="tiles">
      <div class="tile"><div class="t">События</div><div class="v">${s.count}</div></div>
      <div class="tile"><div class="t">Средняя оценка</div><div class="v">${s.avg === null ? '—' : '★ ' + esc(num(s.avg, 1))}</div></div>
      <div class="tile"><div class="t">Дней с записями</div><div class="v">${lived - s.emptyDays}<small> из ${lived}</small></div></div>
      <div class="tile"><div class="t">Без записей</div><div class="v">${s.emptyDays}</div><div class="s">${plural(s.emptyDays, DAY_WORDS)}</div></div>
    </div>
    ${s.count ? `<h2 class="section-t">Средняя оценка ${mode === 'year' ? 'по месяцам' : 'по дням'}</h2>
    <div class="chart-box">${barChart(chartBars(mode, s, data.events), { color: 'var(--accent)' })}</div>
    <h2 class="section-t">По типам</h2>
    <div class="panel">${s.byKind.map(k => `<div class="set-row"><span>${KIND[k.kind]?.icon || ''} ${esc(KIND[k.kind]?.name || k.kind)}
      <small>${k.count} ${plural(k.count, EVENT_WORDS)}</small></span><b>★ ${esc(num(k.avg, 1))}</b></div>`).join('')}</div>
    <h2 class="section-t">Лучшее</h2>
    <div class="events">${s.top.map(e => eventRow(e, { withDay: true })).join('')}</div>
    ${s.worst.length ? `<h2 class="section-t">Худшее</h2><div class="events">${s.worst.map(e => eventRow(e, { withDay: true })).join('')}</div>` : ''}` : ''}
    ${s.feed.length ? `<h2 class="section-t">Описания дней</h2>
    <div class="feed">${feed.map(d => `<button class="feed-i" data-fday="${d.day}"><b>${esc(dayWd(d.day))}</b><span>${esc(d.text)}</span></button>`).join('')}</div>
    ${s.feed.length > FEED_LIMIT ? `<button class="link" id="feedAll">${feedAll ? 'Свернуть' : `Показать все ${s.feed.length}`}</button>` : ''}` : ''}
    <button class="btn line" id="copySum">📋 Скопировать сводку текстом</button>`;
  }

  el.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.dp) {
      const next = p.shift(Number(t.dataset.dp));
      state.diaryPeriod[mode] = next > state.today ? startOf(mode, state.today) : next;
      feedAll = false;
      return ctx.render();
    }
    if (t.id === 'feedAll') { feedAll = !feedAll; return ctx.render(); }
    if (t.dataset.fday) { state.diaryDay = t.dataset.fday; state.diaryMode = 'day'; return ctx.render(); }
    if (t.dataset.ev && data) return openEvent(ctx, data.events.find(x => x.id === Number(t.dataset.ev)));
    if (t.id === 'copySum' && s) {
      try { await navigator.clipboard.writeText(summaryText(p, s)); ctx.toast('Сводка скопирована'); }
      catch { ctx.toast('Не получилось скопировать'); }
    }
  };
}
