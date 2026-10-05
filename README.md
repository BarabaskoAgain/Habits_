# Привычки · KeepSimple

Веб-трекер привычек: одна страница за паролем, мобильная, ставится на телефон как приложение (PWA).
Адрес: https://habits.keepsimple.com.ua

Старая Expo/React Native версия лежит в ветке `legacy-expo`.

## Запуск на Railway (один шаг)

```
bash scripts/deploy-railway.sh
```

Скрипт спросит пароль входа и сам сделает остальное: проект и Postgres на Railway, сервис из этого репо
(автодеплой по push в `main`), секреты и push-ключи, домен `habits.keepsimple.com.ua`. В конце выведет
две DNS-записи для Ukr.Host (CNAME `habits` и TXT `_railway-verify.habits`).

Нужно заранее: `railway login`, Node 20+, GitHub-аккаунт подключён к Railway.
После запуска проверь, что у сервиса выключен «Serverless / App Sleeping»: иначе, пока он спит,
не придут напоминания и сводки.

## Что умеет
- **Сегодня**: прогресс дня, отметка тапом, для количественных привычек ввод суммы за день
  (отжимания +20 +30, чтение в минутах, партии в шахматы). Листание дней, карточка «Как прошёл день?».
- **Статистика**: неделя, месяц, год, всё время. План/факт и проценты по единой формуле.
- **Дневник**: описание дня, события с оценкой 1–10, сводки за неделю/месяц/год, копирование текстом.
- **Экран привычки**: итоги, серии, рекорд, график, календарь, анализ выполнения и рекомендация.
- Режимы: каждый день, по дням недели, N раз в неделю. Счётчик без цели: чистый учёт.
- Срок привычки, архив и восстановление, напоминания и сводки (push), достижения, тёмная тема.
- Данные: экспорт JSON/CSV, импорт «заменить всё» с предпросмотром, полный сброс.

## Стек
Node 20+ (ESM) + Express + Postgres. Фронт: чистый HTML/CSS/ES-модули без сборки, service worker.
Push: web-push (VAPID), расписание: node-cron внутри процесса.

## Локально
```
npm install
cp .env.example .env   # заполнить APP_PASSWORD и SESSION_SECRET
npm run dev            # http://localhost:3000, база в памяти
npm test
```

## Переменные
| Имя | Что |
|---|---|
| `DATABASE_URL` | Postgres (`memory` — база в памяти для разработки) |
| `APP_PASSWORD` | пароль входа; смена разлогинивает все устройства |
| `SESSION_SECRET` | длинная случайная строка для подписи cookie |
| `PUBLIC_URL` | адрес сайта, `https://…` включает Secure-cookie |
| `NODE_ENV` | `production` на сервере |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | push-уведомления; без них приложение работает, но без push |

## Правила
- При каждом деплое фронта поднимать `CACHE_VERSION` в `public/sw.js` и держать `SHELL` в согласии с файлами (проверяет `test/fmt.test.js`).
- Схема БД меняется только новым файлом `migrations/NNN_*`, старые не трогать.
- Дни везде строки `YYYY-MM-DD` по Киеву (`lib/time.js`, `todayKey()` в `app.js`). `toISOString` для дней не использовать.
- Спецификация: `SPEC.md`. Известные грабли: `gotchas.md`.

## Где что
- `server.js` — старт: проверка ENV, миграции, cron, listen.
- `lib/app.js` — express, CSP, CSRF, роуты. `lib/auth.js` — пароль и cookie. `lib/db.js` — пул и миграции.
- `lib/scheduler.js`, `lib/reminders.js`, `lib/push.js` — напоминания, сводки, автоархив по сроку.
- `routes/habits.js` (привычки и отметки), `routes/diary.js`, `routes/data.js` (экспорт/импорт/сброс), `routes/settings.js`, `routes/push.js`.
- `public/js/logic/*` — вся расчётная логика (общая для клиента и сервера), покрыта тестами.
- `public/js/*.js` — экраны: today, stats-*, habit-screen, diary*, settings, data-io и т.д.
