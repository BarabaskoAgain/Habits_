#!/usr/bin/env bash
# Запуск на Railway одной командой: проект + Postgres + сервис из GitHub + переменные + домен.
#   bash scripts/deploy-railway.sh
# Нужно: Railway CLI (railway login уже выполнен), Node 20+, GitHub подключён к Railway.
# Секреты (SESSION_SECRET, VAPID-ключи) генерируются здесь и уходят только в переменные Railway.
set -euo pipefail

REPO="${REPO:-BarabaskoAgain/Habits_}"
DOMAIN="${DOMAIN:-habits.keepsimple.com.ua}"
PROJECT="${PROJECT:-habits}"
SERVICE="${SERVICE:-habits}"

cd "$(dirname "$0")/.."
railway whoami >/dev/null || { echo "Сначала: railway login"; exit 1; }
[ -d node_modules/web-push ] || npm ci --omit=dev

# Пароль входа: из APP_PASSWORD или спросить (не показывается при вводе)
PASS="${APP_PASSWORD:-}"
while [ "${#PASS}" -lt 8 ]; do
  read -r -s -p "Пароль для входа в приложение (от 8 символов): " PASS; echo
done

SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
VAPID=$(node -e "const k=require('web-push').generateVAPIDKeys();console.log(k.publicKey+' '+k.privateKey)")
VAPID_PUB=${VAPID% *}
VAPID_PRIV=${VAPID#* }

echo "→ Проект $PROJECT"
railway init -n "$PROJECT"
echo "→ Postgres"
railway add -d postgres
echo "→ Сервис $SERVICE из GitHub $REPO (автодеплой по push в main)"
railway add -s "$SERVICE" -r "$REPO" \
  -v 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  -v "APP_PASSWORD=$PASS" \
  -v "SESSION_SECRET=$SECRET" \
  -v "NODE_ENV=production" \
  -v "PUBLIC_URL=https://$DOMAIN" \
  -v "VAPID_PUBLIC_KEY=$VAPID_PUB" \
  -v "VAPID_PRIVATE_KEY=$VAPID_PRIV" \
  -v "VAPID_SUBJECT=https://$DOMAIN"
echo "→ Домен $DOMAIN"
railway domain "$DOMAIN" -s "$SERVICE"

cat <<EOF

Готово. Осталось у Ukr.Host (DNS-зона keepsimple.com.ua) добавить две записи, которые Railway
вывел выше: CNAME «habits» и TXT «_railway-verify.habits». Через 5–30 минут откроется https://$DOMAIN
Проверь в Railway: сервис $SERVICE → Settings → «Serverless / App Sleeping» выключен
(иначе напоминания и сводки не придут, пока сервис спит).
EOF
