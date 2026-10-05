// Настройки: только ключи из белого списка (импорт и API — через одну проверку).
// Служебные ключи планировщика (sent_*) клиент писать не может.
import express from 'express';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const digest = (v) => !!v && typeof v === 'object' && typeof v.on === 'boolean' && typeof v.time === 'string' && TIME_RE.test(v.time);

export const SETTINGS = {
  onboarded: (v) => typeof v === 'boolean',
  theme: (v) => ['light', 'dark', 'system'].includes(v),
  push_enabled: (v) => typeof v === 'boolean',
  digest_morning: digest,
  digest_evening: digest,
  digest_week: digest
};

// Сводки храним ровно как { on, time } — лишние поля (из файла импорта) отбрасываем
export const normalizeSetting = (key, value) => (digest(value) ? { on: value.on, time: value.time } : value);

export function settingsRouter(db) {
  const r = express.Router();
  r.put('/api/settings', async (req, res, next) => {
    try {
      const { key, value } = req.body || {};
      if (!Object.hasOwn(SETTINGS, key) || !SETTINGS[key](value)) return res.status(400).json({ error: 'bad setting' });
      const v = normalizeSetting(key, value);
      await db.query(
        `INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
        [key, JSON.stringify(v)]);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  return r;
}
