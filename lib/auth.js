// Авторизация: один пароль из ENV -> HttpOnly cookie с HMAC-токеном (как в family-budget).
// Статика отдаётся без auth (нужно для установки PWA), защищён только /api/*.
import crypto from 'crypto';

const COOKIE = 'hb_s';
const YEAR = 365 * 24 * 3600;

// Пароль в HMAC-строке: смена APP_PASSWORD гасит все выданные сессии
const sign = (ts) =>
  crypto.createHmac('sha256', process.env.SESSION_SECRET)
    .update('hb1.' + ts + '.' + process.env.APP_PASSWORD).digest('base64url');

// Secure — по факту https (req.secure за прокси Railway, trust proxy включён) или по ENV.
// На http://localhost браузер отбросил бы Secure-cookie.
export const isSecure = (req) =>
  !!req?.secure || (process.env.PUBLIC_URL || '').startsWith('https') || process.env.NODE_ENV === 'production';

const cookie = (req, value, maxAge) =>
  `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly${isSecure(req) ? '; Secure' : ''}; SameSite=Lax`;

export function makeToken() {
  const ts = String(Date.now());
  return `${ts}.${sign(ts)}`;
}

export function tokenValid(token) {
  const [ts, sig] = String(token || '').split('.');
  if (!ts || !sig) return false;
  const expect = sign(ts);
  if (sig.length !== expect.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false;
  return Date.now() - Number(ts) < YEAR * 1000;
}

function readCookie(req) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? m[1] : null;
}

export const hasSession = (req) => tokenValid(readCookie(req));

export function apiAuth(req, res, next) {
  if (hasSession(req)) return next();
  res.status(401).json({ error: 'auth' });
}

// Rate-limit /login: 5 неудачных попыток в минуту на IP (в памяти, с чисткой).
// Общего лимита нет: иначе посторонний перебором с чужих IP заблокировал бы вход владельцу.
const PER_IP = 5, WINDOW = 60_000;
const fails = new Map();
function blocked(ip) {
  const now = Date.now();
  for (const [k, v] of fails) {
    const alive = v.filter(t => now - t < WINDOW);
    if (alive.length) fails.set(k, alive); else fails.delete(k);
  }
  return (fails.get(ip) || []).length >= PER_IP;
}
const recordFail = (ip) => fails.set(ip, [...(fails.get(ip) || []), Date.now()]);

// Сравнение через sha256: равная длина в байтах при любом алфавите (кириллица) и не светит длину пароля
const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();

export function loginHandler(req, res) {
  if (blocked(req.ip)) return res.redirect('/login.html?e=rate');
  const given = typeof req.body?.p === 'string' ? req.body.p : '';
  const ok = crypto.timingSafeEqual(digest(given), digest(process.env.APP_PASSWORD));
  if (!ok) { recordFail(req.ip); return res.redirect('/login.html?e=1'); }
  res.setHeader('Set-Cookie', cookie(req, makeToken(), YEAR));
  res.redirect('/');
}

// Выход только со своей страницы: чужой сайт не может разлогинить.
// Clear-Site-Data стирает кэш и localStorage, чтобы «Назад» после выхода не показал данные.
export function logoutHandler(req, res) {
  if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'forbidden' });
  res.setHeader('Set-Cookie', cookie(req, '', 0));
  res.setHeader('Clear-Site-Data', '"cache", "storage"');
  res.redirect('/login.html');
}
