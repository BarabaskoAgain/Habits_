import cron from 'node-cron';
import { createPool, migrate } from './lib/db.js';
import { createApp } from './lib/app.js';
import { createPusher, pushEnabled } from './lib/push.js';
import { tick } from './lib/scheduler.js';

const missing = ['DATABASE_URL', 'APP_PASSWORD', 'SESSION_SECRET'].filter(k => !process.env[k]);
if (missing.length) {
  console.error('Не заданы обязательные переменные окружения:', missing.join(', '));
  process.exit(1);
}
if (!pushEnabled()) console.warn('VAPID_* не заданы — push-напоминания выключены');

const PORT = process.env.PORT || 3000;
try {
  const db = await createPool();
  await migrate(db);
  const pusher = createPusher(db);
  createApp(db, { pusher }).listen(PORT, () => console.log('up on', PORT));
  // Планировщик только здесь (не в createApp): тесты не держат живой таймер.
  // Раз в минуту: автоархив по сроку, напоминания, сводки. Время считается по Киеву внутри tick.
  let running = false;
  cron.schedule('* * * * *', async () => {
    if (running) return; // прошлый тик ещё идёт — не накладываемся
    running = true;
    try { await tick(db, pusher); } catch (e) { console.error('scheduler:', e.message); } finally { running = false; }
  });
} catch (e) {
  console.error('startup failed:', e.message);
  process.exit(1);
}
