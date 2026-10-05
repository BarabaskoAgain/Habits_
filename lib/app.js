// Сборка express-приложения. Отдельно от server.js, чтобы тесты поднимали его на базе в памяти.
import express from 'express';
import { fileURLToPath } from 'url';
import { apiAuth, loginHandler, logoutHandler, hasSession } from './auth.js';
import compression from 'compression';
import { habitsRouter } from '../routes/habits.js';
import { settingsRouter } from '../routes/settings.js';
import { pushRouter } from '../routes/push.js';
import { diaryRouter } from '../routes/diary.js';
import { dataRouter } from '../routes/data.js';
import { createPusher } from './push.js';

// CSRF: изменяющие запросы — только со своей страницы и только JSON-телом
function sameSiteJsonOnly(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'forbidden' });
  if (req.method !== 'DELETE' && !req.is('application/json')) return res.status(415).json({ error: 'json only' });
  next();
}

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

export function createApp(db, { pusher = createPusher(db) } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
  app.use(compression());
  // Импорт файла экспорта — со своим лимитом 5 МБ (routes/data.js), остальным хватает 100 КБ
  const json = express.json({ limit: '100kb' });
  app.use((req, res, next) => (req.path === '/api/import' ? next() : json(req, res, next)));

  app.get('/health', async (_req, res) => {
    try { await db.query('SELECT 1'); res.json({ ok: true }); }
    catch { res.status(500).json({ ok: false }); }
  });

  app.post('/login', express.urlencoded({ extended: false }), loginHandler);
  app.post('/logout', logoutHandler);
  // Уже вошёл — страница входа не нужна (иначе «Назад» с главной ведёт на форму входа)
  app.get('/login.html', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (hasSession(req)) return res.redirect('/');
    next();
  });

  // /api/* — только с cookie; вся статика открыта (нужно для установки PWA)
  app.use('/api', apiAuth, sameSiteJsonOnly);
  app.use(habitsRouter(db));
  app.use(settingsRouter(db));
  app.use(pushRouter(db, pusher));
  app.use(diaryRouter(db));
  app.use(dataRouter(db));

  // sw.js без кэша браузера: иначе обновление service worker может застрять
  app.use(express.static(PUBLIC_DIR, {
    setHeaders: (res, file) => { if (file.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache'); }
  }));

  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad json' });
    // Ошибки разбора тела (слишком большое, не та кодировка) — их собственный 4xx, а не 500
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.type || 'bad request' });
    console.error('api err:', err.message);
    res.status(500).json({ error: 'server' });
  });
  return app;
}
