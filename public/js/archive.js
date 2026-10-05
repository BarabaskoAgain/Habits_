// Архив (SPEC §5): сортировка, «Выполнено факт из план», период, длительность, «Срок вышел»,
// восстановление (с новым сроком, если истёк), удаление навсегда. Здесь же выход из аккаунта.
import { addDays, periodStats, lifeDays, plural } from './logic.js';
import { esc, dateRange, fmtValue, num, DAY_WORDS } from './fmt.js';
import { clearCache } from './api.js';

const SORTS = { date: 'По дате', name: 'По названию', pct: 'По выполнению' };
let sortMode = 'date';

// Последний день жизни: день перед открытой паузой или срок
function lastDay(h, today) {
  const open = (h.pauses || []).find(p => p.to_day == null);
  if (open) return addDays(open.from_day, -1);
  if (h.end_day && h.end_day < today) return h.end_day;
  return today;
}

function summary(ctx, h) {
  const today = ctx.state.today;
  const end = lastDay(h, today);
  const s = periodStats(h, ctx.state.comp[h.id] || {}, h.created_day, end, today);
  const life = lifeDays({ ...h, end_day: end }, end);
  const expired = !(h.pauses || []).some(p => p.to_day == null) && !!h.end_day && h.end_day < today;
  return { s, end, life, expired };
}

const count = (h, v) => (h.type === 'number' ? fmtValue(h, v) : String(Math.round(v)));

export function openArchive(ctx) {
  const list = ctx.archivedHabits().map(h => ({ h, ...summary(ctx, h) }));
  if (sortMode === 'name') list.sort((a, b) => a.h.name.localeCompare(b.h.name, 'ru'));
  else if (sortMode === 'pct') list.sort((a, b) => (b.s.pct ?? -1) - (a.s.pct ?? -1));
  else list.sort((a, b) => b.end.localeCompare(a.end));

  const badge = (p) => (p === null ? '' : `<span class="pbadge ${p >= 80 ? 'good' : p >= 60 ? 'mid' : 'low'}">${p}%</span>`);
  const body = ctx.openSheet(`
    <h3>Архив</h3>
    ${list.length ? `
    <div class="muted">${list.length} ${plural(list.length, ['завершённая привычка', 'завершённые привычки', 'завершённых привычек'])}. История сохранена, вернуть можно в любой момент.</div>
    <div class="chips tight">${Object.entries(SORTS).map(([k, l]) => `<button class="chip${sortMode === k ? ' on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div>
    <div class="arch-list">${list.map(({ h, s, end, life, expired }) => `
      <div class="arch" style="--c:${h.color}">
        <div class="arch-top"><span class="hicon sm">${esc(h.icon)}</span><b>${esc(h.name)}</b>${badge(s.pct)}</div>
        ${expired ? '<div class="badge-arch">⏱ Срок вышел</div>' : ''}
        <div class="muted">Период: ${esc(dateRange(h.created_day, end))} · ${life} ${plural(life, DAY_WORDS)}</div>
        <div class="muted">${s.pct === null ? `Всего: ${esc(fmtValue(h, s.sum))}` : `Выполнено ${esc(count(h, s.fact))} из ${esc(h.type === 'number' ? fmtValue(h, Math.round(s.plan)) : num(s.plan, 1))}${h.type === 'number' && s.sum > s.fact ? ` · всего ${esc(fmtValue(h, s.sum))}` : ''}`}</div>
        ${h.description ? `<div class="muted">${esc(h.description)}</div>` : ''}
        <div class="row2">
          <button class="btn small line" data-restore="${h.id}">Вернуть</button>
          <button class="btn small danger" data-del="${h.id}">Удалить</button>
        </div>
      </div>`).join('')}</div>`
    : '<div class="muted">Пусто. Привычку можно завершить на её экране: «Завершить (в архив)».</div>'}
    <form method="POST" action="/logout" class="logout"><button class="btn line">Выйти из аккаунта</button></form>`);

  body.querySelector('.logout').addEventListener('submit', () => clearCache());
  body.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.sort) { sortMode = t.dataset.sort; return openArchive(ctx); }
    if (t.dataset.restore) return restoreHabit(ctx, ctx.habitById(t.dataset.restore));
    if (t.dataset.del) {
      // второй тап — не раньше чем через 0,6 с: быстрый двойной тап не удаляет навсегда
      if (!t.classList.contains('ask')) { t.classList.add('ask'); t.dataset.askAt = Date.now(); t.textContent = 'Точно? Тап ещё раз'; return; }
      if (Date.now() - Number(t.dataset.askAt) < 600) return;
      ctx.run(() => ctx.del(`/api/habits/${t.dataset.del}`), 'Удалено навсегда');
    }
  };
}

// Восстановление: истёкший срок — спросить новый срок или «бессрочно»
export function restoreHabit(ctx, h) {
  const today = ctx.state.today;
  const expired = !!h.end_day && h.end_day < today;
  // Сервер считает «сегодня» по Киеву: если он ответил «срок вышел» — тоже спросить новый срок
  const go = async (extra = {}) => {
    const r = await ctx.run(async () => {
      try { await ctx.post(`/api/habits/${h.id}/archive`, { archived: false, day: today, ...extra }); return 'ok'; }
      catch (e) { if (e.message === 'expired') return 'expired'; throw e; }
    });
    if (r === 'expired') askTerm();
    else if (r) ctx.toast('Вернул в активные');
  };
  if (!expired) return go();
  askTerm();

  function askTerm() {
  const body = ctx.openSheet(`
    <h3>Срок привычки вышел</h3>
    <div class="muted">Продолжить «${esc(h.name)}» на сколько?</div>
    <div class="chips tight">
      <button class="chip" data-term="none">Бессрочно</button>
      ${[7, 14, 21, 30].map(n => `<button class="chip" data-term="${n}">Ещё ${n} ${plural(n, DAY_WORDS)}</button>`).join('')}
    </div>`);
  body.onclick = (e) => {
    const t = e.target.closest('[data-term]');
    if (!t) return;
    go({ end_day: t.dataset.term === 'none' ? null : addDays(today, Number(t.dataset.term) - 1) });
  };
  }
}
