# Habits Web — план

Цель: веб-трекер привычек (одна страница, мобильный, PWA) за паролем на `habits.keepsimple.com.ua`.
Источники: логика из старой Expo-апки `BarabaskoAgain/Habits_`, скелет из `Desktop/family-budget`, бренд из `keepsimple-site`.

## Решения
- Один пользователь, один пароль (`APP_PASSWORD`), HMAC-cookie как в family-budget.
- UI на русском.
- Типы: `boolean` и `number` (вес не переносим).
- Деплой: GitHub `Habits_` → Railway автодеплой по push в `main`.
  Старый Expo-код сохраняется в ветке `legacy-expo` до перезаписи `main`.

## Стек
Node 20 ESM + Express + pg. Фронт: чистый HTML/CSS/ES-модули, без сборки. PWA (manifest + sw.js).
Бренд: `--bg #FAF6F2`, `--accent #FF6A00`, Manrope (woff2 копируются из keepsimple-site), логотип «ks•».

## Структура
```
server.js            express, trust proxy, /health, /login, /logout, /api/*, static
lib/auth.js          из family-budget + logout
lib/db.js            pg Pool + migrate()
lib/habits.js        чистая логика: isDone, currentStreak, bestStreak, periodStats, weekPlan
migrations/001_init.sql
routes/habits.js     CRUD + archive/restore
routes/completions.js  PUT/DELETE отметки по дате, GET за диапазон
public/index.html, login.html, manifest.json, sw.js, css/app.css, js/{api,app,today,week,month,archive,form,fmt}.js
test/habits.test.js  node:test
```

## Схема
```sql
habits(id serial pk, name text 3..50, description text, icon text, color text, category text,
       type text check in ('boolean','number'), target_value numeric, unit text,
       days_per_week int 1..7 default 7, sort int, created_at timestamptz, archived_at timestamptz null)
completions(habit_id int fk on delete cascade, day date, value numeric null, primary key(habit_id, day))
settings(key text pk, value jsonb)
```
`done` = boolean: строка есть; number: `value >= target_value`.
Даты всегда локальные `YYYY-MM-DD`, клиент присылает свою дату (фикс бага с UTC).

## Экраны
1. **Сегодня** — прогресс дня X/Y, карточки (иконка, цвет, серия). Тап: boolean переключает, number открывает шторку ввода +/−.
2. **Неделя** — таблица привычки × 7 дней, отметка задним числом, план/факт.
3. **Месяц** — календарь-теплокарта %, текущая/лучшая серия по привычке.
4. **Архив** — восстановить / удалить навсегда.
5. Форма создания/редактирования — обычная шторка (имя, иконка, цвет, категория, тип, цель+единица, дней в неделю).

## Логика (с фиксами багов старой апки)
- Серия при `days_per_week=7`: подряд идущие даты; сегодня не отмечено, значит считаем со вчера.
- Серия при `days_per_week<7`: считаем в неделях, где выполнен план недели (фикс: раньше обрывалась на любом пропуске).
- Лучшая серия: по подряд идущим датам, а не записям (фикс).
- План периода: `round(days/7 * days_per_week)`.
- Не переносим: достижения, год, нативные уведомления, «печатную машинку», демо-данные.

## Деплой
1. Railway: новый сервис `habits` (проект keepsimple-examples или отдельный) + Postgres plugin.
2. Env: `DATABASE_URL`, `APP_PASSWORD`, `SESSION_SECRET`, `PUBLIC_URL`, `NODE_ENV=production`. `railway.toml` с healthcheck `/health`.
3. Custom domain `habits.keepsimple.com.ua` на сервис `habits` (проверить лимит Hobby).
4. Ukr.Host: CNAME `habits` → `<x>.up.railway.app`, TXT `_railway-verify.habits`. Это делает пользователь.

## Verification
- `node --test` для серий, плана/факта и isDone (включая граничные: пропуск, частота 5/7, сегодня не отмечено).
- Локально: pg-mem или локальный Postgres, вход/выход, CRUD, отметки, архив.
- Playwright: ширина 390 и 1280, скриншоты всех экранов, консоль без ошибок.
- Прод: `/health` 200, вход, отметка, HTTPS на домене.
