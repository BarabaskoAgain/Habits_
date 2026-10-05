// Web-push (как в family-budget). Ключи VAPID настраиваются лениво: без них пуши выключены,
// а сервер не падает (иначе restartPolicy ALWAYS зациклит деплой).
import webpush from 'web-push';

let configured = null;
export function pushEnabled() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:habits@keepsimple.com.ua', pub, priv);
    configured = true;
  } catch (e) {
    console.error('VAPID: неверные ключи —', e.message);
    configured = false;
  }
  return configured;
}

// Отправщик для планировщика и /api/push/test. Мёртвые подписки (403/404/410) удаляются.
export function createPusher(db) {
  return {
    enabled: pushEnabled,
    async sendAll(payload) {
      if (!pushEnabled()) return;
      const subs = await db.query(`SELECT id, endpoint, keys FROM push_subscriptions`);
      const body = JSON.stringify(payload).slice(0, 3500); // лимит payload ~4 КБ
      await Promise.allSettled(subs.rows.map(async (s) => {
        const keys = typeof s.keys === 'string' ? JSON.parse(s.keys) : s.keys;
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys }, body, { TTL: 6 * 3600 });
        } catch (e) {
          if ([403, 404, 410].includes(e.statusCode)) await db.query(`DELETE FROM push_subscriptions WHERE id=$1`, [s.id]);
          else console.error('push err', e.statusCode || e.message);
        }
      }));
    }
  };
}
