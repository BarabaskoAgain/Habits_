// Экран привычки (SPEC §4): итоги сегодня/неделя/месяц/год/всё время, серии, рекорд, среднее,
// сравнение с прошлой неделей, график с переключателем, календарь по месяцам, дни под «Показать всё».
import {
  addDays, weekStart, monthStart, monthEnd, shiftMonth, weekdayIndex, daysBetween, isCounter, isDone, isAllowed,
  inLife, isArchived, periodStats, sumRange, currentStreak, bestStreak, allTime, plural, scheduledOnDay, insights
} from './logic.js';
import { esc, dayShort, dayWd, fmtValue, fmtTarget, fmtStreak, scheduleText, tint, MONTHS, WD_SHORT, pctClass, DAY_WORDS } from './fmt.js';
import { categoryOf } from './consts.js';
import { barChart } from './chart.js';
import { openForm } from './form.js';
import { openInput } from './input-sheet.js';
import { restoreHabit } from './archive.js';

export function openHabitScreen(ctx, habit) {
  const id = habit.id;
  let chartMode = '30d';
  let month = ctx.state.today.slice(0, 7);
  let showDays = false;
  ctx.openScreen((el) => render(el));

  function render(el) {
    const h = ctx.habitById(id);
    if (!h) { ctx.closeScreen(); return; }
    const { today } = ctx.state;
    const marks = ctx.state.comp[h.id] || {};
    const counter = isCounter(h);
    const archived = isArchived(h, today);
    const all = ctx.memo(`all:${h.id}`, () => allTime(h, marks, today));
    const period = (from) => ctx.memo(`ps:${h.id}:${from}`, () => periodStats(h, marks, from, today, today));
    const P = {
      day: period(today), week: period(weekStart(today)), month: period(monthStart(today)),
      year: period(today.slice(0, 4) + '-01-01')
    };
    const cur = currentStreak(h, marks, today);
    const best = ctx.memo(`best:${h.id}`, () => bestStreak(h, marks, today));
    const ws = weekStart(today);
    const span = daysBetween(ws, today);
    const thisWeek = sumRange(marks, ws, today);
    const lastWeek = sumRange(marks, addDays(ws, -7), addDays(ws, -7 + span));
    const delta = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
    const cat = categoryOf(h.category);
    const left = h.end_day ? daysBetween(today, h.end_day) + 1 : null;
    const tot = (s) => (h.type === 'number' ? fmtValue(h, s.sum) : fmtValue(h, s.doneDays));
    const pct = (s) => (s.pct === null ? '' : `<small class="${pctClass(s.pct)}">${s.pct}%</small>`);
    // Плитка «Сегодня»: у «сделал/не сделал» — ✓ или —; у weekly % за один день не имеет смысла
    const todayVal = h.type === 'number' ? fmtValue(h, P.day.sum) : (P.day.doneDays ? '✓ Сделано' : '—');
    const todayPct = h.schedule === 'weekly' || h.type !== 'number' ? '' : pct(P.day);
    // Анализ — за последние 30 дней: стабильнее календарного месяца в его начале
    const ins = ctx.memo(`ins:${h.id}:${today}`, () => insights(h, periodStats(h, marks, addDays(today, -29), today, today), cur));
    const avgText = all.avg === null ? '—'
      : h.type === 'number' ? fmtValue(h, Math.round(all.avg * 10) / 10) : `${Math.round(all.avg * 100)}% дней`;

    el.innerHTML = `<div class="screen-in">
      <div class="screen-head">
        <button class="hbtn" id="scrBack" aria-label="Назад">‹</button>
        <div class="screen-t">${esc(h.name)}</div>
        <button class="hbtn" id="scrEdit" aria-label="Изменить">✎</button>
      </div>
      <section class="hhead" style="--c:${h.color};--fill:${tint(h.color, 0.15)}">
        <span class="hicon big">${esc(h.icon)}</span>
        <div>
          <div class="muted">${esc(scheduleText(h))}${h.type === 'number' ? ` · ${esc(fmtTarget(h))}${counter ? '' : ' в день'}` : ''}${cat ? ` · ${cat.icon} ${esc(cat.label)}` : ''}</div>
          ${h.end_day ? `<div class="muted">До ${esc(dayShort(h.end_day, true))}${left > 0 ? ` · осталось ${left} ${plural(left, DAY_WORDS)}` : ' · ⏱ срок вышел'}</div>` : ''}
          ${archived ? '<div class="badge-arch">📁 В архиве</div>' : ''}
        </div>
      </section>
      ${h.description ? `<p class="why" style="--c:${h.color}">${esc(h.description)}</p>` : ''}

      <div class="totals">
        <button class="tot today" data-today="1"><span>Сегодня</span><b>${esc(todayVal)}</b>${todayPct}</button>
        <div class="tot"><span>Неделя</span><b>${esc(tot(P.week))}</b>${pct(P.week)}</div>
        <div class="tot"><span>Месяц</span><b>${esc(tot(P.month))}</b>${pct(P.month)}</div>
        <div class="tot"><span>Год</span><b>${esc(tot(P.year))}</b>${pct(P.year)}</div>
        <div class="tot all"><span>Всё время</span><b>${esc(h.type === 'number' ? fmtValue(h, all.sum) : fmtValue(h, all.days))}</b>
          <small>${all.first ? `с ${esc(dayShort(all.first, true))}` : 'пока пусто'}</small></div>
      </div>

      <div class="tiles">
        ${counter ? '' : `<div class="tile"><div class="t">Серия</div><div class="v">${cur?.value ? '🔥 ' : ''}${esc(fmtStreak(cur))}</div></div>
        <div class="tile"><div class="t">Лучшая серия</div><div class="v">${esc(fmtStreak(best))}</div></div>`}
        <div class="tile"><div class="t">Рекорд дня</div><div class="v">${all.best ? esc(fmtValue(h, all.best.value)) : '—'}</div>${all.best ? `<div class="s">${esc(dayShort(all.best.day, true))}</div>` : ''}</div>
        <div class="tile"><div class="t">В среднем в день</div><div class="v">${esc(avgText)}</div></div>
        <div class="tile"><div class="t">Дней с отметкой</div><div class="v">${all.days}</div></div>
        <div class="tile"><div class="t">К прошлой неделе</div><div class="v ${delta === null ? '' : delta >= 0 ? 'up' : 'down'}">${delta === null ? '—' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%`}</div>
          <div class="s">${esc(fmtValue(h, thisWeek))} против ${esc(fmtValue(h, lastWeek))}</div></div>
      </div>

      ${ins.items.length ? `<h2 class="section-t">💡 Анализ выполнения · 30 дней</h2>
      <div class="insights">${ins.items.map(i => `<div class="insight ${i.tone}"><span aria-hidden="true">${i.icon}</span><span>${esc(i.text)}</span></div>`).join('')}
        ${ins.tip ? `<div class="insight tip"><span aria-hidden="true">💡</span><span><b>Рекомендация.</b> ${esc(ins.tip)}</span></div>` : ''}</div>` : ''}

      <h2 class="section-t">Динамика</h2>
      <div class="seg small">
        <button data-chart="30d" class="${chartMode === '30d' ? 'sel' : ''}">30 дней</button>
        <button data-chart="weeks" class="${chartMode === 'weeks' ? 'sel' : ''}">Недели</button>
        <button data-chart="months" class="${chartMode === 'months' ? 'sel' : ''}">Месяцы</button>
      </div>
      <div class="chart-box">${chart(h, marks, today)}</div>

      <h2 class="section-t">Календарь</h2>
      ${calendar(h, marks, today)}

      <div class="screen-actions">
        ${archived ? '<button class="btn" id="scrRestore">Вернуть из архива</button>' : '<button class="btn line" id="scrArchive">Завершить (в архив)</button>'}
        <button class="btn danger" id="scrDelete">Удалить навсегда</button>
      </div></div>`;
    el.onclick = (e) => onClick(e, h);
  }

  function chart(h, marks, today) {
    const target = Number(h.target_value) || 0;
    const counter = isCounter(h);
    const val = (s) => (h.type === 'number' ? s.sum : s.doneDays);
    const bars = [];
    if (chartMode === '30d') {
      for (let i = 29; i >= 0; i--) {
        const d = addDays(today, -i);
        const v = h.type === 'number' ? Number(marks[d]) || 0 : (isDone(h, marks[d]) ? 1 : 0);
        const plan = counter || h.schedule === 'weekly' || !isAllowed(h, d) ? 0 : (h.type === 'number' ? target : 1);
        bars.push({ label: String(Number(d.slice(8))), value: v, plan, title: `${dayWd(d)}: ${fmtValue(h, v)}` });
      }
    } else if (chartMode === 'weeks') {
      const ws = weekStart(today);
      for (let i = 11; i >= 0; i--) {
        const from = addDays(ws, -7 * i);
        const s = periodStats(h, marks, from, addDays(from, 6), today);
        bars.push({ label: `${Number(from.slice(8))}.${from.slice(5, 7)}`, value: val(s), plan: counter ? 0 : s.plan, title: `${dayShort(from)}: ${fmtValue(h, val(s))}` });
      }
    } else {
      const ym = today.slice(0, 7);
      for (let i = 11; i >= 0; i--) {
        const m = shiftMonth(ym, -i), from = m + '-01';
        const s = periodStats(h, marks, from, monthEnd(from), today);
        const name = MONTHS[Number(m.slice(5)) - 1];
        bars.push({ label: name.slice(0, 3), value: val(s), plan: counter ? 0 : s.plan, title: `${name}: ${fmtValue(h, val(s))}` });
      }
    }
    return barChart(bars, { color: h.color });
  }

  function calendar(h, marks, today) {
    const first = month + '-01', last = monthEnd(first);
    const cells = [];
    for (let i = 0; i < weekdayIndex(first); i++) cells.push('<i class="pad"></i>');
    for (let d = first; d <= last; d = addDays(d, 1)) {
      const v = marks[d];
      const done = isDone(h, v);
      const part = !done && Number(v) > 0;
      // пропуск — только прошлый день, который был в плане (weekly «в запасе» и сегодня — нейтральные)
      const cls = d > today ? 'future' : done ? 'ok' : part ? 'part'
        : (d < today && scheduledOnDay(h, marks, d) ? 'miss' : 'off');
      cells.push(`<i class="${cls}${d === today ? ' now' : ''}" title="${esc(dayWd(d))}${v !== undefined ? ': ' + esc(fmtValue(h, v)) : ''}">${Number(d.slice(8))}</i>`);
    }
    const s = periodStats(h, marks, first, last, today);
    const rows = [];
    if (showDays) {
      for (let d = last > today ? today : last; d >= first; d = addDays(d, -1)) {
        if (!inLife(h, d)) continue;
        const v = marks[d];
        const note = ctx.state.notes[h.id]?.[d];
        const plan = isCounter(h) || !isAllowed(h, d) ? '—' : (h.type === 'number' ? fmtTarget(h) : 'Сделать');
        const p = h.type === 'number' && Number(h.target_value) ? Math.round(((Number(v) || 0) / h.target_value) * 100) + '%' : (isDone(h, v) ? '✓' : '');
        rows.push(`<tr data-day="${d}"><td>${esc(dayWd(d))}${note ? `<div class="note">📝 ${esc(note)}</div>` : ''}</td><td>${esc(plan)}</td><td>${v !== undefined ? esc(fmtValue(h, v)) : '—'}</td><td>${p}</td></tr>`);
      }
    }
    return `
      <div class="pager">
        <button data-month="-1" aria-label="Прошлый месяц">‹</button>
        <div class="pager-t">${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}
          <small>${esc(h.type === 'number' ? fmtValue(h, s.sum) : fmtValue(h, s.doneDays))}${s.pct !== null ? ` · ${s.pct}% плана` : ''}</small></div>
        <button data-month="1" aria-label="Следующий месяц" ${month >= today.slice(0, 7) ? 'disabled' : ''}>›</button>
      </div>
      <div class="hcal" style="--c:${h.color}">${WD_SHORT.map(w => `<b>${w}</b>`).join('')}${cells.join('')}</div>
      <button class="link" id="toggleDays">${showDays ? 'Скрыть дни' : 'Показать дни этого месяца'}</button>
      ${showDays ? `<table class="days-table"><thead><tr><th>День</th><th>План</th><th>Факт</th><th>%</th></tr></thead><tbody>${rows.join('') || '<tr><td colspan="4">Нет дней</td></tr>'}</tbody></table>` : ''}`;
  }

  function onClick(e, h) {
    const t = e.target.closest('button, tr[data-day]');
    if (!t) return;
    const el = document.querySelector('#screen');
    const today = ctx.state.today;
    const toggle = (d) => ctx.mark(h, d, (ctx.state.comp[h.id] || {})[d] !== undefined ? null : 1);
    if (t.id === 'scrBack') return ctx.closeScreen();
    if (t.id === 'scrEdit') return openForm(ctx, h);
    if (t.dataset.today) return h.type === 'number' ? openInput(ctx, h, today) : toggle(today);
    if (t.dataset.chart) { chartMode = t.dataset.chart; return render(el); }
    if (t.dataset.month) { month = shiftMonth(month, Number(t.dataset.month)); return render(el); }
    if (t.id === 'toggleDays') { showDays = !showDays; return render(el); }
    if (t.dataset.day) return h.type === 'number' ? openInput(ctx, h, t.dataset.day) : toggle(t.dataset.day);
    if (t.id === 'scrArchive') {
      const s = periodStats(h, ctx.state.comp[h.id] || {}, h.created_day, today, today);
      return ctx.run(() => ctx.post(`/api/habits/${h.id}/archive`, { archived: true, day: today }),
        `Привычка завершена!${s.pct !== null ? ` Выполнено ${s.pct}%` : ''}`);
    }
    if (t.id === 'scrRestore') return restoreHabit(ctx, h);
    if (t.id === 'scrDelete') {
      // второй тап засчитывается не раньше чем через 0,6 с — быстрый двойной тап не удалит
      if (!t.classList.contains('ask')) { t.classList.add('ask'); t.dataset.askAt = Date.now(); t.textContent = 'Точно удалить? Тап ещё раз'; return; }
      if (Date.now() - Number(t.dataset.askAt) < 600) return;
      // экран закроется сам: после перезагрузки данных привычки нет → closeScreen
      ctx.run(() => ctx.del(`/api/habits/${h.id}`), 'Удалено');
    }
  }
}
