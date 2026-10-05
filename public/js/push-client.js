// Подписка устройства на push (VAPID), как в family-budget, плюс подсказка для iPhone.
const b64ToU8 = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

export const IOS_HINT = 'На iPhone уведомления работают только из приложения на экране «Домой»: '
  + 'в Safari нажми «Поделиться» → «На экран „Домой“», открой оттуда и войди заново.';

// 'on' | 'off' | 'denied' | 'unsupported' | 'ios-browser'
export async function pushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !standalone() ? 'ios-browser' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription()) ? 'on' : 'off';
  } catch { return 'off'; }
}

export const STATUS_TEXT = {
  on: 'включены на этом устройстве',
  off: 'выключены на этом устройстве',
  denied: 'запрещены в настройках телефона',
  unsupported: 'браузер не поддерживает уведомления',
  'ios-browser': 'нужно установить приложение на экран «Домой»'
};

// Включить: разрешение → подписка → сервер. Возвращает текст для тоста.
export async function enablePush(ctx) {
  const st = await pushStatus();
  if (st === 'ios-browser') return IOS_HINT;
  if (st === 'unsupported') return 'Этот браузер не поддерживает уведомления';
  try {
    const { enabled, key } = await ctx.get('/api/push/pubkey');
    if (!enabled) return 'На сервере не настроены ключи уведомлений';
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'Разрешение на уведомления не выдано';
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription()
      || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
    await ctx.post('/api/push/subscribe', { subscription: sub.toJSON() });
    return 'Уведомления включены';
  } catch (e) {
    return 'Не получилось: ' + e.message;
  }
}

export async function disablePush(ctx) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await ctx.post('/api/push/unsubscribe', { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    return 'Уведомления на этом устройстве выключены';
  } catch (e) {
    return 'Не получилось: ' + e.message;
  }
}
