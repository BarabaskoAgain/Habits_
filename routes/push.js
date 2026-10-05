// Push-подписки устройств: ключ, подписка, отписка, тест.
import express from 'express';
import { pushEnabled } from '../lib/push.js';

const validSub = (s) =>
  s && typeof s.endpoint === 'string' && s.endpoint.startsWith('https://') && s.endpoint.length <= 500 &&
  s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string' &&
  s.keys.p256dh.length <= 200 && s.keys.auth.length <= 100;

export function pushRouter(db, pusher) {
  const r = express.Router();

  r.get('/api/push/pubkey', (_req, res) =>
    res.json({ enabled: pushEnabled(), key: pushEnabled() ? process.env.VAPID_PUBLIC_KEY : null }));

  r.post('/api/push/subscribe', async (req, res, next) => {
    try {
      const s = req.body?.subscription;
      if (!validSub(s)) return res.status(400).json({ error: 'bad subscription' });
      await db.query(
        `INSERT INTO push_subscriptions (endpoint, keys) VALUES ($1,$2)
         ON CONFLICT (endpoint) DO UPDATE SET keys=EXCLUDED.keys`,
        [s.endpoint, JSON.stringify({ p256dh: s.keys.p256dh, auth: s.keys.auth })]);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  r.post('/api/push/unsubscribe', async (req, res, next) => {
    try {
      const ep = req.body?.endpoint;
      if (typeof ep !== 'string') return res.status(400).json({ error: 'bad endpoint' });
      await db.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [ep]);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  r.post('/api/push/test', async (_req, res, next) => {
    try {
      if (!pushEnabled()) return res.status(503).json({ error: 'push off' });
      await pusher.sendAll({ title: '🎉 Тест уведомлений', body: 'Уведомления работают!', tag: 'test', url: '/' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return r;
}
