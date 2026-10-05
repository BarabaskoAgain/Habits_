// Всё время (SPEC §3, главный запрос): по каждой привычке реальная сумма, дни с отметкой,
// среднее в день, рекорд дня, первая отметка. Архивные — отдельной группой.
import { isArchived, allTime, plural } from './logic.js';
import { esc, dayShort, fmtValue, DAY_WORDS } from './fmt.js';
import { openHabitScreen } from './habit-screen.js';

export function renderAllTime(el, ctx) {
  const { today, comp, habits } = ctx.state;
  const card = (h) => {
    const t = ctx.memo(`all:${h.id}`, () => allTime(h, comp[h.id] || {}, today));
    const main = h.type === 'number' ? fmtValue(h, t.sum) : `${t.days} ${plural(t.days, DAY_WORDS)}`;
    const bits = [];
    if (t.first) bits.push(`${t.days} ${plural(t.days, DAY_WORDS)} с отметкой`);
    if (t.first && h.type === 'number' && t.avg !== null) bits.push(`в среднем ${fmtValue(h, Math.round(t.avg * 10) / 10)} в день`);
    if (t.best && h.type === 'number') bits.push(`рекорд ${fmtValue(h, t.best.value)} (${dayShort(t.best.day)})`);
    return `<button class="all-card" data-open="${h.id}" style="--c:${h.color}">
      <span class="hicon">${esc(h.icon)}</span>
      <span class="t">${esc(h.name)}
        <b>${esc(main)}</b>
        <small>${esc(bits.join(' · ') || 'пока ни одной отметки')}</small>
        ${t.first ? `<small>с ${esc(dayShort(t.first, true))}</small>` : ''}
      </span></button>`;
  };
  const active = habits.filter(h => !isArchived(h, today));
  const archived = habits.filter(h => isArchived(h, today));
  el.innerHTML = habits.length ? `
    ${active.map(card).join('')}
    ${archived.length ? `<h2 class="section-t">📁 Архив</h2><div class="dim">${archived.map(card).join('')}</div>` : ''}`
    : '<div class="empty">Пока нет привычек.</div>';
  el.onclick = (e) => {
    const o = e.target.closest('[data-open]');
    if (o) openHabitScreen(ctx, ctx.habitById(o.dataset.open));
  };
}
