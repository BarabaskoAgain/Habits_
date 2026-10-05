// Service worker: офлайн-shell + push-уведомления. При каждом деплое поднимай CACHE_VERSION.
const CACHE_VERSION = 'hb-v5';
// Список обязан совпадать с файлами в public/: один 404 — и новый SW не установится (addAll атомарный).
// /login.html здесь нет: вошедшего пользователя сервер редиректит, а редирект-ответ из кэша ломает навигацию.
const SHELL = [
  '/', '/css/app.css', '/manifest.json',
  '/js/app.js', '/js/api.js', '/js/logic.js', '/js/fmt.js', '/js/consts.js', '/js/login.js', '/js/theme.js',
  '/js/logic/dates.js', '/js/logic/life.js', '/js/logic/plan.js', '/js/logic/streaks.js', '/js/logic/totals.js', '/js/logic/achievements.js',
  '/js/logic/diary.js', '/js/logic/insights.js',
  '/js/today.js', '/js/input-sheet.js', '/js/form.js', '/js/habit-screen.js', '/js/chart.js', '/js/archive.js',
  '/js/stats.js', '/js/stats-week.js', '/js/stats-month.js', '/js/stats-year.js', '/js/stats-all.js',
  '/js/settings.js', '/js/push-client.js', '/js/data-io.js',
  '/js/diary.js', '/js/diary-store.js', '/js/diary-summary.js',
  '/fonts/manrope-cyr.woff2', '/fonts/manrope-latin.woff2',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE_VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/health' || url.pathname === '/login.html') return; // только сеть

  // Медленная сеть («lie-fi»): через 4 с сдаёмся и берём из кэша, а не висим
  const net = (req) => fetch(req, { signal: AbortSignal.timeout(4000) });

  // Навигация: сеть в приоритете (свежий index), офлайн — из кэша
  if (e.request.mode === 'navigate') {
    e.respondWith(net(e.request).catch(() => caches.match('/')));
    return;
  }
  // Статика: сеть в приоритете, кэш — для офлайна. Так модули после деплоя
  // никогда не смешиваются старые с новыми, даже если забыть поднять версию.
  e.respondWith(
    net(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});

// Push: напоминания и сводки. tag схлопывает повторные уведомления одной привычки.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { /* битый payload — покажем общее */ }
  e.waitUntil(self.registration.showNotification(data.title || 'Привычки', {
    body: data.body || '',
    tag: data.tag || 'hb',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' }
  }));
});

// Тап по уведомлению: открыть приложение (уже открытое — вывести вперёд)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) if ('focus' in w) { w.navigate(url); return w.focus(); }
    return self.clients.openWindow(url);
  })());
});
