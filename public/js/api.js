// Обёртка над fetch: 401 -> логин, ошибки -> исключение с текстом.
async function call(path, opts = {}) {
  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw new Error('Нет сети');
  }
  if (res.status === 413) throw new Error('Слишком большой файл или текст');
  if (res.status === 401) { clearCache(); location.href = '/login.html'; throw new Error('auth'); }
  let body = null;
  try { body = await res.json(); } catch {}
  // detail — подробность для человека (например, где ошибка в файле импорта)
  if (!res.ok) throw new Error(body?.detail || body?.error || (res.status >= 500 ? 'Ошибка сервера' : 'Не получилось (' + res.status + ')'));
  return body;
}

export const get = (path) => call(path);
export const post = (path, body) => call(path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {})
});
export const put = (path, body) => call(path, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {})
});
export const del = (path) => call(path, { method: 'DELETE' });

// Кэш последних данных: мгновенная отрисовка при открытии и офлайн
export function saveCache(key, data) {
  try { localStorage.setItem('hb_' + key, JSON.stringify({ at: Date.now(), data })); } catch {}
}
// Выход или протухшая сессия: данные не должны оставаться на общем устройстве
export function clearCache() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('hb_')) localStorage.removeItem(k);
  } catch {}
}
export function readCache(key) {
  try {
    const raw = localStorage.getItem('hb_' + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
