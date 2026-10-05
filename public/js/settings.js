// Настройки (SPEC §9): тема, уведомления (устройство, тест, общий выключатель, сводки), достижения,
// «Ваш прогресс» и «Поделиться», данные (экспорт/импорт/сброс), архив, выход.
import { achievementProgress, allTime, isArchived } from './logic.js';
import { esc, fmtValue, dayShort } from './fmt.js';
import { pushStatus, enablePush, disablePush, STATUS_TEXT, IOS_HINT } from './push-client.js';
import { openArchive } from './archive.js';
import { clearCache } from './api.js';
import { dataPanel, onDataClick, onDataChange, onDataInput } from './data-io.js';

const DIGESTS = [
  ['digest_morning', '☀️ Утренняя сводка', 'Что сегодня по плану', '08:00'],
  ['digest_evening', '🌙 Вечерняя сводка', 'Если что-то осталось несделанным', '21:00'],
  ['digest_week', '📊 Итог недели', 'По воскресеньям: выполнено и объёмы', '20:00']
];

export function openSettings(ctx) {
  let pushSt = null;
  pushStatus().then((s) => { pushSt = s; if (ctx.state.screen) render(document.querySelector('#screen')); });
  ctx.openScreen((el) => render(el));

  const save = async (key, value) => {
    ctx.state.settings[key] = value;
    try { await ctx.put('/api/settings', { key, value }); } catch (e) { ctx.toast('Не сохранилось: ' + e.message); }
  };

  function render(el) {
    const { state } = ctx;
    const s = state.settings;
    const theme = window.hbTheme ? window.hbTheme() : 'system';
    const ach = ctx.memo('ach', () => achievementProgress(state.habits, state.comp, state.today));
    const unlocked = new Map((state.achievements || []).map(a => [a.code, a.unlocked_at]));
    const active = state.habits.filter(h => !isArchived(h, state.today));
    const pushOn = s.push_enabled !== false;

    el.innerHTML = `<div class="screen-in">
      <div class="screen-head">
        <button class="hbtn" id="setBack" aria-label="Назад">‹</button>
        <div class="screen-t">Настройки</div><span class="hbtn ghost"></span>
      </div>

      <h2 class="section-t">Оформление</h2>
      <div class="seg mx">
        ${[['light', '☀️ Светлая'], ['dark', '🌙 Тёмная'], ['system', '⚙ Как в системе']].map(([k, l]) =>
          `<button data-theme="${k}" class="${theme === k ? 'sel' : ''}">${l}</button>`).join('')}
      </div>

      <h2 class="section-t">Уведомления</h2>
      <div class="panel">
        <div class="set-row"><span>На этом устройстве<small>${pushSt ? esc(STATUS_TEXT[pushSt]) : 'проверяю…'}</small></span>
          ${pushSt === 'on' ? '<button class="btn small line" id="pushOff">Выключить</button>'
            : '<button class="btn small" id="pushOn">Включить</button>'}</div>
        ${pushSt === 'ios-browser' ? `<p class="muted">${esc(IOS_HINT)}</p>` : ''}
        ${pushSt === 'on' ? '<div class="set-row"><span>Проверка<small>Пришлёт тестовое уведомление</small></span><button class="btn small line" id="pushTest">Тест</button></div>' : ''}
        <label class="set-row"><span>Все уведомления<small>Общий выключатель напоминаний и сводок</small></span>
          <input type="checkbox" id="pushAll" ${pushOn ? 'checked' : ''}></label>
        ${DIGESTS.map(([key, title, sub, def]) => {
          const v = { on: true, time: def, ...(s[key] || {}) };
          return `<div class="set-row${pushOn ? '' : ' off'}"><span>${title}<small>${sub}</small></span>
            <span class="set-ctl"><input type="time" step="300" data-dtime="${key}" value="${v.time}" ${pushOn ? '' : 'disabled'} aria-label="Время: ${title}">
            <input type="checkbox" data-don="${key}" ${v.on ? 'checked' : ''} ${pushOn ? '' : 'disabled'} aria-label="${title}"></span></div>`;
        }).join('')}
        <p class="muted">Напоминание о конкретной привычке включается в её настройках: ✎ → «Расписание и срок».</p>
      </div>

      <h2 class="section-t">Достижения · ${ach.filter(a => unlocked.has(a.code)).length} из ${ach.length}</h2>
      <div class="ach-list">${ach.map(a => {
        const got = unlocked.get(a.code);
        const pct = Math.min(100, Math.round((a.value / a.goal) * 100));
        return `<div class="ach${got ? ' got' : ''}">
          <span class="ach-ic">${a.icon}</span>
          <span class="ach-t"><b>${esc(a.name)}</b><small>${esc(a.desc)}${got ? ` · получено ${esc(dayShort(String(got).slice(0, 10), true))}` : ''}</small>
            ${got ? '' : `<span class="bar thin"><i style="width:${pct}%"></i></span><small>${Math.min(a.value, a.goal)} из ${a.goal}</small>`}</span>
          ${got ? '<span class="ach-ok">✓</span>' : ''}</div>`;
      }).join('')}</div>

      <h2 class="section-t">Ваш прогресс</h2>
      <div class="panel">
        <div class="set-row"><span>Привычек в работе</span><b>${active.length}</b></div>
        <div class="set-row"><span>Получено достижений</span><b>${unlocked.size}</b></div>
        <button class="btn line" id="share">📤 Поделиться прогрессом</button>
      </div>

      ${dataPanel()}

      <div class="screen-actions">
        <button class="btn line" id="toArchive">📁 Архив привычек</button>
        <form method="POST" action="/logout" class="logout"><button class="btn line">Выйти из аккаунта</button></form>
      </div></div>`;

    el.querySelector('.logout').addEventListener('submit', () => clearCache());
    el.onclick = (e) => onClick(e, el);
    el.onchange = (e) => onChange(e, el);
    el.oninput = (e) => onDataInput(e.target, el);
  }

  async function onClick(e, el) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.id === 'setBack') return ctx.closeScreen();
    if (onDataClick(t, ctx, el)) return;
    if (t.dataset.theme) {
      window.hbSetTheme?.(t.dataset.theme);
      save('theme', t.dataset.theme);
      return render(el);
    }
    if (t.id === 'pushOn' || t.id === 'pushOff') {
      t.disabled = true;
      ctx.toast(t.id === 'pushOn' ? await enablePush(ctx) : await disablePush(ctx));
      pushSt = await pushStatus();
      return render(el);
    }
    if (t.id === 'pushTest') {
      try { await ctx.post('/api/push/test', {}); ctx.toast('Отправил — уведомление должно прийти'); }
      catch (err) { ctx.toast('Не получилось: ' + err.message); }
      return;
    }
    if (t.id === 'share') return share();
    if (t.id === 'toArchive') { ctx.closeScreen(); openArchive(ctx); }
  }

  function onChange(e, el) {
    const t = e.target;
    if (onDataChange(t, ctx)) return;
    if (t.id === 'pushAll') { save('push_enabled', t.checked); return render(el); }
    const key = t.dataset.don || t.dataset.dtime;
    if (!key) return;
    const row = t.closest('.set-row');
    const time = row.querySelector('[data-dtime]').value || '08:00';
    const on = row.querySelector('[data-don]').checked;
    save(key, { on, time });
  }

  // «Поделиться прогрессом» (текст из старой апки + главные объёмы)
  async function share() {
    const { state } = ctx;
    const active = state.habits.filter(h => !isArchived(h, state.today));
    const volumes = state.habits.filter(h => h.type === 'number')
      .map(h => ({ h, sum: allTime(h, state.comp[h.id] || {}, state.today).sum }))
      .filter(x => x.sum > 0).sort((a, b) => b.sum - a.sum).slice(0, 3)
      .map(x => `• ${x.h.name}: ${fmtValue(x.h, x.sum)}`);
    const [y, m, d] = state.today.split('-');
    const text = `🎯 Мой прогресс в привычках:\n\n📊 Привычек: ${active.length}\n🏆 Достижений: ${(state.achievements || []).length}\n`
      + `${volumes.length ? `\n${volumes.join('\n')}\n` : ''}\n📅 На дату: ${d}.${m}.${y}\n\nПродолжаю в том же духе! 🎯`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); ctx.toast('Текст скопирован — вставь в мессенджер'); }
    } catch { /* пользователь закрыл окно «Поделиться» */ }
  }
}
