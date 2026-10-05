// Данные дневника: грузятся отдельно от /api/data, по диапазонам дат, с кэшем до следующей правки.
import { DIARY_KINDS } from './logic.js';

export const KIND = Object.fromEntries(DIARY_KINDS.map(k => [k.code, k]));

const cache = new Map(); // 'from|to' -> { data, gen, pending, failedAt }
let gen = 0;             // поколение данных: каждая правка его поднимает
let epoch = 0;           // смена всего дневника (импорт, сброс): ответы, начатые раньше, выбрасываются
// день -> несохранённый текст описания: перерисовка не стирает ввод
export const drafts = new Map();
const RETRY_MS = 30_000;

// Синхронно отдаёт данные диапазона (или null) и при необходимости догружает с сервера.
// Устаревшие после правки данные показываются, пока не пришли свежие — экран не мигает.
// Ответ, начатый до правки, приходит с прошлым поколением и сразу считается устаревшим.
export function diaryRange(ctx, from, to) {
  const key = from + '|' + to;
  const c = cache.get(key) || {};
  const fresh = c.data && c.gen === gen;
  const recentFail = c.failedAt && Date.now() - c.failedAt < RETRY_MS;
  if (!fresh && !c.pending && !recentFail) {
    const asked = gen, askedEpoch = epoch;
    cache.set(key, { ...c, pending: true });
    ctx.get(`/api/diary?from=${from}&to=${to}`)
      .then((data) => {
        if (askedEpoch !== epoch) return;
        cache.set(key, { data, gen: asked });
        ctx.rerender();
      })
      .catch((e) => {
        if (askedEpoch !== epoch) return;
        cache.set(key, { ...c, pending: false, failedAt: Date.now() });
        if (e.message !== 'auth') ctx.toast('Дневник не загрузился: ' + e.message);
      });
  }
  return c.data || null;
}

// После правки: всё загруженное устарело (перезагрузится при следующем показе)
export const invalidateDiary = () => { gen++; };
// Импорт или сброс данных — дневник другой целиком
export const clearDiary = () => { gen++; epoch++; cache.clear(); drafts.clear(); };

// Правка прошла: сразу меняем загруженные диапазоны с этим днём (без мигания старого),
// а свежая версия с сервера подтянется в фоне
export function patchDiary(day, fn) {
  for (const [key, c] of cache) {
    const [from, to] = key.split('|');
    if (c.data && day >= from && day <= to) cache.set(key, { ...c, data: fn(c.data) });
  }
  invalidateDiary();
}
