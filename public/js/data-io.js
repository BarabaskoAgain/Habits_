// Раздел «Данные» в настройках (SPEC §9b): экспорт JSON/CSV, импорт «заменить всё» с предпросмотром, сброс.
import { esc, num } from './fmt.js';
import { plural } from './logic.js';
import { clearDiary } from './diary-store.js';

const MAX_FILE = 5 * 1024 * 1024;
const RESET_WORD = 'УДАЛИТЬ';

export const dataPanel = () => `
  <h2 class="section-t">Данные</h2>
  <div class="panel">
    <div class="set-row"><span>Скачать всё<small>JSON — для переноса и резервной копии, CSV — для Excel</small></span></div>
    <div class="data-btns">
      <a class="btn line" href="/api/export?format=json" download>⬇ JSON</a>
      <a class="btn line" href="/api/export?format=csv" download>⬇ CSV</a>
    </div>
    <div class="set-row"><span>Загрузить из файла<small>Заменит все текущие данные содержимым файла</small></span>
      <button class="btn small line" id="impBtn">Выбрать</button></div>
    <input type="file" id="impFile" accept=".json,application/json" hidden>
    <div class="reset-box">
      <div class="set-row"><span>Удалить всё<small>Привычки, отметки, дневник, достижения. Отменить нельзя</small></span></div>
      <input id="resetWord" placeholder="Напиши ${RESET_WORD}" autocomplete="off" aria-label="Слово для подтверждения удаления">
      <button class="btn danger" id="resetBtn" disabled>Удалить все данные</button>
    </div>
  </div>`;

// Обработчики раздела; true — событие обработано здесь
export function onDataClick(t, ctx, el) {
  if (t.id === 'impBtn') { el.querySelector('#impFile').click(); return true; }
  if (t.id === 'resetBtn') { reset(ctx); return true; }
  return false;
}
export function onDataInput(t, el) {
  if (t.id !== 'resetWord') return false;
  el.querySelector('#resetBtn').disabled = t.value.trim().toUpperCase() !== RESET_WORD;
  return true;
}
export function onDataChange(t, ctx) {
  if (t.id !== 'impFile') return false;
  const file = t.files?.[0];
  t.value = ''; // тот же файл можно выбрать повторно
  if (file) pickFile(ctx, file);
  return true;
}

async function pickFile(ctx, file) {
  if (file.size > MAX_FILE) return ctx.toast('Файл больше 5 МБ');
  let data;
  try { data = JSON.parse(await file.text()); } catch { return ctx.toast('Это не файл экспорта (нужен .json из «Скачать всё»)'); }
  let summary;
  try { ({ summary } = await ctx.post('/api/import', { dry: true, data })); }
  catch (e) { if (e.message !== 'auth') ctx.toast('Файл не подходит: ' + e.message); return; }

  const n = (v, w) => `${num(v, 0)} ${plural(v, w)}`;
  const body = ctx.openSheet(`
    <h3>Заменить все данные?</h3>
    <p class="muted mt8">В файле: ${esc(n(summary.habits, ['привычка', 'привычки', 'привычек']))}${summary.archived ? ` (${summary.archived} в архиве)` : ''},
      ${esc(n(summary.completions, ['отметка', 'отметки', 'отметок']))}, ${esc(n(summary.diaryDays, ['день', 'дня', 'дней']))} дневника.</p>
    ${summary.skipped ? `<p class="muted mt8">${esc(n(summary.skipped, ['отметку', 'отметки', 'отметок']))} пропущу: они вне срока жизни привычки или больше лимита.</p>` : ''}
    <p class="muted mt8">Всё, что сейчас в приложении, удалится и заменится файлом. Если текущее нужно сохранить, сначала скачай JSON.</p>
    <button class="btn" id="impGo">Заменить всё</button>
    <button class="btn line" id="impNo">Отмена</button>`);
  body.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'impNo') return ctx.closeSheet();
    if (b.id !== 'impGo') return;
    b.disabled = true;
    const ok = await ctx.run(() => ctx.post('/api/import', { data }), 'Данные загружены из файла');
    if (ok) { clearDiary(); ctx.rerender(); } else b.disabled = false;
  };
}

async function reset(ctx) {
  const ok = await ctx.run(() => ctx.post('/api/reset', { confirm: RESET_WORD }), 'Все данные удалены');
  if (ok) { clearDiary(); ctx.rerender(); }
}
