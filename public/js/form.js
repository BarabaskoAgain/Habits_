// Пошаговая форма привычки (SPEC §6): Тип → Название и категория → Цель → Расписание и срок.
// «Создать» доступна со 2-го шага; иконка и цвет подставляются от категории. Тип и единица при правке заблокированы.
import { addDays, daysBetween, plural } from './logic.js';
import { esc, WD_SHORT, dayShort, DAY_WORDS } from './fmt.js';
import { CATEGORY_GROUPS, ICON_GROUPS, COLOR_GROUPS, UNITS, INT_UNITS, categoryOf } from './consts.js';
import { pushStatus, enablePush, IOS_HINT } from './push-client.js';

const TERMS = [7, 14, 21, 30];

export function openForm(ctx, habit = null) {
  const today = ctx.state.today;
  const d = {
    name: '', description: '', icon: '✅', color: '#FF6A00', category: '', type: 'boolean',
    target_value: '', counter: false, unit: 'раз', unit_forms: null, customUnit: false,
    schedule: 'daily', active_days: [0, 1, 2, 3, 4, 5, 6], days_per_week: 3,
    created_day: today, end_day: null, reminder_enabled: false, reminder_time: null,
    ...(habit ? structuredClone(habit) : {})
  };
  if (habit) {
    d.counter = habit.type === 'number' && !(Number(habit.target_value) > 0);
    d.target_value = d.counter ? '' : habit.target_value;
    d.customUnit = habit.type === 'number' && !UNITS.some(u => u.u === habit.unit);
    if (habit.schedule !== 'weekly') d.days_per_week = 3;
  }
  const picked = { icon: !!habit, color: !!habit };
  let step = habit ? 2 : 1;
  let iconGroup = 0, colorGroup = 0;
  const isCounter = () => d.type === 'number' && d.counter;
  const steps = () => (d.type === 'number' ? [1, 2, 3, 4] : [1, 2, 4]).filter(s => !(habit && s === 1));

  const stepType = () => `
    <h3>Как будем отмечать?</h3>
    <div class="choice">
      <button data-type="boolean" class="${d.type === 'boolean' ? 'sel' : ''}"><b>✅ Сделал / не сделал</b><small>Зарядка, без сладкого, витамины</small></button>
      <button data-type="number" class="${d.type === 'number' ? 'sel' : ''}"><b>🔢 Количество</b><small>Отжимания, минуты чтения, партии в шахматы</small></button>
    </div>`;

  const stepName = () => `
    <h3>${habit ? 'Изменить привычку' : 'Название и вид'}</h3>
    <div class="field"><label for="fName">Название</label>
      <input id="fName" maxlength="50" placeholder="Например, отжимания" value="${esc(d.name)}" autocomplete="off"></div>
    <div class="field"><label>Категория <span class="opt">необязательно</span></label>
      ${CATEGORY_GROUPS.map(g => `<div class="cat-group"><small>${g.icon} ${esc(g.label)}</small><div class="chips tight">
        ${g.items.map(c => `<button type="button" class="chip${d.category === c.key ? ' on' : ''}" data-cat="${c.key}">${c.icon} ${esc(c.label)}</button>`).join('')}
      </div></div>`).join('')}</div>
    <div class="field"><label>Иконка <span class="hicon sm inline" style="--c:${d.color}">${esc(d.icon)}</span></label>
      <div class="tabs-mini">${ICON_GROUPS.map((g, i) => `<button type="button" data-igroup="${i}" class="${i === iconGroup ? 'on' : ''}">${esc(g.label)}</button>`).join('')}</div>
      <div class="pick icons">${ICON_GROUPS[iconGroup].icons.map(i => `<button type="button" data-icon="${i}" class="${i === d.icon ? 'sel' : ''}">${i}</button>`).join('')}</div></div>
    <div class="field"><label>Цвет</label>
      <div class="tabs-mini">${COLOR_GROUPS.map((g, i) => `<button type="button" data-cgroup="${i}" class="${i === colorGroup ? 'on' : ''}">${esc(g.label)}</button>`).join('')}</div>
      <div class="pick colors">${COLOR_GROUPS[colorGroup].colors.map(c => `<button type="button" data-color="${c}" class="${c === d.color ? 'sel' : ''}" style="--sw:${c}" aria-label="Цвет ${c}"></button>`).join('')}</div></div>`;

  const stepGoal = () => `
    <h3>Цель</h3>
    <label class="toggle"><span>Без цели — просто считать<small>Только суммы: сколько всего, в среднем, рекорд. Без плана и процентов.</small></span>
      <input type="checkbox" id="fCounter" ${d.counter ? 'checked' : ''}></label>
    <div class="${d.counter ? 'hidden' : ''}">
      <div class="field"><label for="fTarget">Цель в день</label>
        <input id="fTarget" type="text" inputmode="decimal" placeholder="50" value="${esc(d.target_value)}"></div>
    </div>
    <div class="field"><label>Единица${habit ? ' <span class="opt">не меняется</span>' : ''}</label>
      ${habit ? `<div class="locked">${esc(d.unit)}</div>` : `
      <div class="chips tight">${UNITS.map(u => `<button type="button" class="chip${!d.customUnit && d.unit === u.u ? ' on' : ''}" data-unit="${u.u}">${u.u}</button>`).join('')}
        <button type="button" class="chip${d.customUnit ? ' on' : ''}" data-unit="__custom">Своя…</button></div>
      ${d.customUnit ? `<div class="row3">
        <input id="fForm1" maxlength="20" placeholder="1 партия" value="${esc(d.unit_forms?.[0] || '')}">
        <input id="fForm2" maxlength="20" placeholder="2 партии" value="${esc(d.unit_forms?.[1] || '')}">
        <input id="fForm5" maxlength="20" placeholder="5 партий" value="${esc(d.unit_forms?.[2] || '')}"></div>
        <div class="muted">Как сказать про 1, 2 и 5 штук. Хватит и первого поля.</div>` : ''}`}
    </div>`;

  // Выбранный срок помним отдельно: «7 дней» остаются 7 днями и после смены даты старта
  let term = (() => {
    if (!d.end_day) return 'none';
    const n = daysBetween(d.created_day, d.end_day) + 1;
    return TERMS.includes(n) ? String(n) : 'date';
  })();
  const termChoice = () => term;
  const applyTerm = () => {
    if (term === 'none') d.end_day = null;
    else if (term !== 'date') d.end_day = addDays(d.created_day, Number(term) - 1);
  };
  const stepSchedule = () => `
    <h3>${isCounter() ? 'Срок' : 'Расписание и срок'}</h3>
    ${isCounter() ? '' : `
    <div class="seg" id="fSched">
      <button type="button" data-sched="daily" class="${d.schedule === 'daily' ? 'sel' : ''}">Каждый день</button>
      <button type="button" data-sched="days" class="${d.schedule === 'days' ? 'sel' : ''}">По дням</button>
      <button type="button" data-sched="weekly" class="${d.schedule === 'weekly' ? 'sel' : ''}">N в неделю</button>
    </div>
    ${d.schedule === 'days' ? `<div class="seg days">${WD_SHORT.map((w, i) => `<button type="button" data-wd="${i}" class="${d.active_days.includes(i) ? 'sel' : ''}">${w}</button>`).join('')}</div>` : ''}
    ${d.schedule === 'weekly' ? `<div class="seg days">${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" data-dpw="${n}" class="${d.days_per_week === n ? 'sel' : ''}">${n}</button>`).join('')}</div>
      <div class="muted">${d.days_per_week} раз(а) в неделю, в любые дни</div>` : ''}`}
    <div class="field"><label>Срок</label>
      <div class="chips tight">
        <button type="button" class="chip${termChoice() === 'none' ? ' on' : ''}" data-term="none">Бессрочно</button>
        ${TERMS.map(n => `<button type="button" class="chip${termChoice() === String(n) ? ' on' : ''}" data-term="${n}">${n} ${plural(n, DAY_WORDS)}</button>`).join('')}
        <button type="button" class="chip${termChoice() === 'date' ? ' on' : ''}" data-term="date">До даты</button>
      </div>
      ${termChoice() === 'date' ? `<input id="fEnd" type="date" value="${d.end_day}" min="${d.created_day}">` : ''}
      ${d.end_day ? `<div class="muted">До ${esc(dayShort(d.end_day, true))}</div>` : ''}</div>
    ${isCounter() ? '' : `
    <label class="toggle"><span>🔔 Напоминать<small>Придёт, если к этому времени ещё не сделано</small></span>
      <input type="checkbox" id="fRemind" ${d.reminder_enabled ? 'checked' : ''}></label>
    ${d.reminder_enabled ? `<div class="field"><label for="fTime">Время напоминания</label>
      <input id="fTime" type="time" step="300" value="${d.reminder_time || '09:00'}"></div>` : ''}`}
    <div class="field"><label for="fStart">Дата старта</label>
      <input id="fStart" type="date" value="${d.created_day}" min="${addDays(today, -3650)}" max="${today}"></div>
    <div class="field"><label for="fDesc">Зачем мне это <span class="opt">необязательно</span></label>
      <textarea id="fDesc" maxlength="150" rows="2" placeholder="Чтобы больше успевать">${esc(d.description)}</textarea></div>`;

  const RENDER = { 1: stepType, 2: stepName, 3: stepGoal, 4: stepSchedule };

  // Сохранить введённое в полях текущего шага
  function collect() {
    const $ = (s) => document.querySelector('#sheetBody ' + s);
    if ($('#fName')) d.name = $('#fName').value.trim();
    if ($('#fTarget')) d.target_value = $('#fTarget').value.trim().replace(',', '.');
    if ($('#fForm1')) {
      const f = [$('#fForm1').value.trim(), $('#fForm2').value.trim(), $('#fForm5').value.trim()];
      d.unit = f[0];
      d.unit_forms = f[0] ? [f[0], f[1] || f[0], f[2] || f[1] || f[0]] : null;
    }
    if ($('#fStart') && $('#fStart').value) { d.created_day = $('#fStart').value; applyTerm(); }
    if ($('#fEnd') && $('#fEnd').value) d.end_day = $('#fEnd').value;
    if ($('#fDesc')) d.description = $('#fDesc').value.trim();
    if ($('#fTime') && $('#fTime').value) d.reminder_time = $('#fTime').value;
  }

  function check(s) {
    if (s === 2 && !(d.name.length >= 3 || (habit && d.name === habit.name && d.name.length))) return 'Название — от 3 символов';
    if (s === 3 && !isCounter()) {
      const t = Number(d.target_value);
      const cap = d.unit === 'мин' ? 1440 : d.unit === 'ч' ? 24 : 10000;
      if (!(t > 0) || t > cap) return `Цель — число от 1 до ${cap}`;
      if (INT_UNITS.has(d.unit) && !Number.isInteger(t)) return 'Для этой единицы цель — целое число';
    }
    if (s === 3 && !d.unit) return 'Выбери единицу';
    if (s === 4 && d.schedule === 'days' && !d.active_days.length) return 'Выбери хотя бы один день';
    if (s === 4 && d.end_day && d.end_day < d.created_day) return 'Срок раньше даты старта';
    if (s === 4 && (d.created_day > today || d.created_day < addDays(today, -3650))) return 'Дата старта — не в будущем и не раньше чем 10 лет назад';
    return null;
  }

  function paint() {
    const list = steps();
    const i = list.indexOf(step);
    const canCreate = step >= 2;
    const body = ctx.openSheet(`
      <div class="stepper-dots">${list.map(s => `<i class="${s <= step ? 'on' : ''}"></i>`).join('')}</div>
      ${RENDER[step]()}
      <p class="err" id="fErr"></p>
      <div class="row2 form-nav">
        ${i > 0 ? '<button class="btn line" id="back">Назад</button>' : ''}
        ${i < list.length - 1 ? `<button class="btn${canCreate ? ' line' : ''}" id="next">Далее</button>` : ''}
        ${canCreate ? `<button class="btn" id="save">${habit ? 'Сохранить' : 'Создать'}</button>` : ''}
      </div>`);
    body.onclick = onClick;
    if (step === 2 && !habit) setTimeout(() => body.querySelector('#fName')?.focus(), 50);
  }

  const err = (m) => { const el = document.querySelector('#fErr'); if (el) el.textContent = m || ''; return !m; };

  async function save(btn) {
    for (const s of steps()) {
      const m = check(s);
      if (m) { step = s; paint(); err(m); return; }
    }
    btn.disabled = true;
    const counter = isCounter();
    const payload = {
      ...(habit ? { id: habit.id } : {}),
      name: d.name, description: d.description, icon: d.icon, color: d.color, category: d.category,
      type: d.type, target_value: d.type === 'number' && !counter ? Number(d.target_value) : null,
      unit: d.type === 'number' ? d.unit : '', unit_forms: d.customUnit ? d.unit_forms : null,
      schedule: counter ? 'daily' : d.schedule, active_days: d.active_days, days_per_week: d.days_per_week,
      created_day: d.created_day, end_day: d.end_day,
      reminder_enabled: !counter && d.reminder_enabled, reminder_time: d.reminder_enabled ? (d.reminder_time || '09:00') : d.reminder_time
    };
    if (habit) delete payload.type;
    const ok = await ctx.run(() => ctx.post('/api/habits', payload), habit ? 'Сохранил' : `Добавил «${d.name}»`);
    if (!ok) btn.disabled = false;
  }

  function onClick(e) {
    const t = e.target.closest('button, input[type=checkbox]');
    if (!t) return;
    collect();
    const ds = t.dataset;
    if (ds.type) { d.type = ds.type; step = 2; return paint(); }
    if (ds.cat !== undefined) {
      d.category = d.category === ds.cat ? '' : ds.cat;
      const c = categoryOf(d.category);
      if (c && !picked.icon) d.icon = c.icon;
      if (c && !picked.color) d.color = c.color;
      return paint();
    }
    if (ds.igroup) { iconGroup = Number(ds.igroup); return paint(); }
    if (ds.cgroup) { colorGroup = Number(ds.cgroup); return paint(); }
    if (ds.icon) { d.icon = ds.icon; picked.icon = true; return paint(); }
    if (ds.color) { d.color = ds.color; picked.color = true; return paint(); }
    if (t.id === 'fCounter') { d.counter = t.checked; return paint(); }
    if (t.id === 'fRemind') {
      d.reminder_enabled = t.checked;
      if (t.checked) {
        d.reminder_time = d.reminder_time || '09:00';
        // разрешение спрашиваем сразу — это действие пользователя (иначе браузер не покажет запрос)
        pushStatus().then(async (st) => {
          if (st === 'on') return;
          if (st === 'ios-browser') return ctx.toast(IOS_HINT);
          ctx.toast(await enablePush(ctx));
        });
      }
      return paint();
    }
    if (ds.unit) {
      d.customUnit = ds.unit === '__custom';
      if (!d.customUnit) { d.unit = ds.unit; d.unit_forms = null; } else { d.unit = ''; }
      return paint();
    }
    if (ds.sched) { d.schedule = ds.sched; return paint(); }
    if (ds.wd) {
      const n = Number(ds.wd);
      d.active_days = d.active_days.includes(n) ? d.active_days.filter(x => x !== n) : [...d.active_days, n].sort();
      return paint();
    }
    if (ds.dpw) { d.days_per_week = Number(ds.dpw); return paint(); }
    if (ds.term) {
      term = ds.term;
      if (term === 'date') d.end_day = d.end_day || addDays(d.created_day, 29);
      else applyTerm();
      return paint();
    }
    if (t.id === 'back') { const l = steps(); step = l[l.indexOf(step) - 1]; return paint(); }
    if (t.id === 'next') {
      if (!err(check(step))) return;
      const l = steps(); step = l[l.indexOf(step) + 1]; return paint();
    }
    if (t.id === 'save') save(t);
  }

  paint();
}
