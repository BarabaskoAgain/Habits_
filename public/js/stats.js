// Вкладка «Статистика»: Неделя · Месяц · Всё время (Год — этап 2). Общие помощники периода.
import { addDays, inLife, isCounter, isArchived } from './logic.js';
import { renderWeek } from './stats-week.js';
import { renderMonth } from './stats-month.js';
import { renderAllTime } from './stats-all.js';
import { renderYear } from './stats-year.js';

const TABS = {
  week: ['Неделя', renderWeek], month: ['Месяц', renderMonth], year: ['Год', renderYear], all: ['Всё время', renderAllTime]
};

// Привычка жила хотя бы день в периоде (включая ныне архивные — история не теряется)
export function aliveIn(h, from, to) {
  if (h.created_day > to) return false;
  for (let d = from; d <= to; d = addDays(d, 1)) if (inLife(h, d)) return true;
  return false;
}

// Разбивка привычек периода: по плану / учёт / завершённые
export function groupFor(ctx, from, to) {
  const today = ctx.state.today;
  const alive = ctx.state.habits.filter(h => aliveIn(h, from, to > today ? today : to));
  return {
    alive,
    planned: alive.filter(h => !isCounter(h) && !isArchived(h, today)),
    counters: alive.filter(h => isCounter(h)),
    archived: alive.filter(h => !isCounter(h) && isArchived(h, today))
  };
}

export function renderStats(view, ctx) {
  const { state } = ctx;
  view.innerHTML = `
    <div class="seg stats-seg">${Object.entries(TABS).map(([k, [l]]) => `<button data-st="${k}" class="${state.statsTab === k ? 'sel' : ''}">${l}</button>`).join('')}</div>
    <div id="statsBody"></div>`;
  const body = view.querySelector('#statsBody');
  view.onclick = (e) => {
    const t = e.target.closest('[data-st]');
    if (!t) return;
    state.statsTab = t.dataset.st;
    ctx.render();
  };
  TABS[state.statsTab][1](body, ctx);
}
