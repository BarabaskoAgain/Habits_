# Промпт: Спринт 5 — Полировка, компакт-режим, онбординг, production

> Ветка: `sprint/5-polish-production` от `main` **после мержа Спринта 4**.
> Финальный спринт — после него билд идёт в Play Store.

---

## Контекст (после Спринтов 1–4)

- Уведомления работают.
- Форма привычки полная.
- Графики есть.
- Дневник дня с болезнью/голосом/событиями работает.
- Схема storage — v3.

---

## Цель спринта

Подготовить приложение к production: дизайн 10/10, онбординг, доступность, экспорт данных, README, EAS-конфиг. Плюс — issue #10 (свёртывание привычек).

Покрывает issues: **#10** + все остальные UX-долги.

---

## Задачи

### 1. Issue #10 — свёртывание привычек

**Хранение:** `settings.compactHabits: Record<habitId, boolean>` или общее `settings.compactMode: 'off' | 'all' | 'auto'`.

**Интеракция:**
- Долгое нажатие на пустое место карточки → карточка сворачивается / разворачивается.
- В свёрнутом виде — только иконка, название, статус (кнопка toggle).
- Кнопка в header "Свернуть все / Развернуть все" через icon-button.
- Анимация через `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)`.

### 2. Design system pass

**Темы:**
- Добавить `green`, `orange` (сейчас только blue, purple, а в SettingsScreen подписаны 5 — исправить).
- Каждая тема — light + dark.
- Использовать `WCAG AA` контраст (мин 4.5:1 для body-text).
- Переключатель тем в SettingsScreen — с карточками (иконка + название), а не радио-списком.

**Motion:**
- `src/constants/motion.js` — durations (`fast: 150, normal: 250, slow: 400`), easings.
- Заменить голые `Animated.timing` на пресеты.
- Toggle привычки → короткий scale-bounce.
- FAB → scale-in при первом рендере.
- Модалки → slide-up вместо fade (уже частично).

**Toasts вместо Alerts:**
- Установить `react-native-toast-message`.
- `Alert.alert('Успех!', ...)` → toast success.
- Оставить `Alert` только для деструктивных подтверждений (удалить, сбросить).

**Bottom sheet вместо inline expand:**
- Установить `@gorhom/bottom-sheet` (совместимая версия с RN 0.79 — проверить в docs).
- Меню действий карточки (Завершить/Редактировать/Удалить) вынести в bottom sheet.
- Ту же bottom sheet использовать для "Отметить день" (из Спринта 4).

**Хаптик:**
- `expo-haptics`: `Haptics.selectionAsync()` на toggle привычки, `Haptics.notificationAsync(Success)` на разблокировку достижения.

**Иллюстрации:**
- Заменить эмодзи empty states на SVG-иллюстрации.
- Использовать бесплатные из [undraw.co](https://undraw.co) с purple/blue-палитрой.
- Файлы в `src/assets/illustrations/*.svg` + inline import через `react-native-svg-transformer` (нужен `metro.config.js` update).

**Splash-экран:**
- Заменить "✓" в круге на настоящий логотип.
- SVG-бейдж: круг с градиентом + иконка `checkmark-done` + текст `Habits` под ним.
- Экспортировать PNG для splash через Figma / Design tool.

**Иконка приложения:**
- Сгенерировать через `expo-image-picker` / Figma.
- `adaptive-icon.png`, `icon.png`, `favicon.png`, `splash.png`.

### 3. Онбординг (первый запуск)

Экран `OnboardingScreen`, показывается, если `settings.onboardingComplete !== true`.

**3 слайда:**
1. "Отслеживай привычки" — картинка, короткий текст, кнопка "Далее".
2. "Начни с первой" — 3 preset-привычки ("Стакан воды", "10 отжиманий", "Читать 20 мин") с чекбоксами → создаются автоматически при переходе.
3. "Не забывай" — запрос разрешения на уведомления, объяснение зачем, кнопки "Разрешить" / "Пропустить".

После завершения — `settings.onboardingComplete = true`, редирект на главную.

**Тултип-хинт:**
- Первый раз при открытии карточки — тултип "Долгое нажатие → меню".
- Хранится флаг `settings.hintsShown.longPress = true`.

### 4. Accessibility

- Все `TouchableOpacity`, `Pressable` — `accessibilityLabel`, `accessibilityRole="button"`, `accessibilityHint` (где неочевидно).
- Иконки-only кнопки — обязательный label.
- Textinput — `accessibilityLabel` + `accessibilityHint`.
- Проверить в `AccessibilityScanner` (Android) — 0 критических warnings.
- Font scaling — проверить, что при системном шрифте 130% ничего не ломается.

### 5. Экспорт / импорт данных (backup)

В `SettingsScreen`:
- Кнопка "Экспортировать все данные (JSON)" — сохраняет `.json` через `expo-document-picker` / `expo-sharing`.
- Кнопка "Импортировать данные" — открывает file picker, парсит JSON, проверяет version, мержит или заменяет (спросить).
- Показать summary перед импортом: "5 привычек, 3 архивных, 12 достижений — импортировать?"
- Обработка ошибок: битый JSON, версия несовместима.

**Формат экспорта:**
```json
{
  "app": "Habits",
  "version": 3,
  "exportedAt": "2026-07-12T10:00:00Z",
  "data": {
    "habits": [...],
    "archivedHabits": [...],
    "achievements": [...],
    "settings": {...},
    "dayEntries": {...}
  }
}
```

### 6. Приватность

В `SettingsScreen`:
- Секция "Приватность":
  - Текст: "Все данные хранятся только на этом устройстве. Мы ничего не отправляем в облако."
  - Кнопка "Показать что мы храним" → экран с полным списком ключей AsyncStorage и их назначением.

### 7. Unit-тесты (обязательный минимум)

Jest + `jest-expo` preset.

```
src/__tests__/
  utils/date.test.js
  utils/completion.test.js
  utils/streak.test.js
  utils/weightTrend.test.js
  services/storage.test.js
```

Цель — покрытие ≥ 70% для `src/utils/*` и `src/services/*`.

### 8. README (важно, влияет на восприятие проекта)

`README.md` в корне:

```markdown
# Habits — трекер привычек для Android

![screenshots]

## Что умеет
- 3 типа привычек: сделал/не сделал, количественные, отслеживание веса
- Гибкое расписание по дням недели, срок привычки
- Графики и статистика: неделя/месяц/год
- Дневник дня: заметки текстом и голосом, события с оценками
- Больничный и отпуск не ломают серию
- Push-уведомления
- Тёмная тема, 4 цветовые схемы
- 100% локально — никакого облака

## Стек
- Expo SDK 53 / React Native 0.79 / React 19
- react-native-svg для графиков
- expo-notifications, expo-audio, expo-haptics
- AsyncStorage

## Как запустить
```bash
npm install
npx expo start
# сканировать QR через Expo Go на Android
```

## Сборка
```bash
npx eas build --platform android --profile production
```

## Тесты
```bash
npm test
```

## Структура
```
src/
  screens/
  components/
  hooks/
  services/
  utils/
  constants/
  types/
```
```

Добавить `docs/screenshots/*.png` (снять с эмулятора).

### 9. Play Store checklist

Добавить `docs/play-store-checklist.md`:
- Скриншоты 4 размеров.
- Описание для стора (short + full).
- Feature graphic 1024×500.
- Privacy policy URL (можно сгенерировать через termsfeed.com или разместить в repo как MD и линковать на raw.githubusercontent).
- Тестирование Internal Track перед production.

### 10. Финальный QA

Чек-лист ручного QA перед мержем:
- [ ] Онбординг проходит с нуля (уданил приложение, поставил заново).
- [ ] Все 3 типа привычек создаются и работают.
- [ ] Уведомления приходят.
- [ ] Все 4 темы переключаются, обе стороны (light/dark) — читаемы.
- [ ] Онбординг больше не показывается после завершения.
- [ ] Экспорт JSON → импорт JSON → данные восстановлены.
- [ ] Компакт-режим сворачивает/разворачивает по долгому нажатию.
- [ ] Bottom sheet меню открывается и закрывается плавно.
- [ ] Тост "Привычка создана" вместо Alert.
- [ ] Все Alerts остались только на деструктивные подтверждения.
- [ ] На эмуляторе с системным шрифтом 130% — ничего не обрезано.
- [ ] Talkback (Android) читает основные кнопки корректно.

---

## Definition of Done

- [ ] Все пункты из "Финальный QA" — зелёные.
- [ ] `npm test` — coverage ≥ 70% для utils / services.
- [ ] `npm run lint` / `typecheck` — 0 ошибок.
- [ ] README с скриншотами.
- [ ] `eas build --platform android --profile production` собирается локально.
- [ ] Export/import прошёл круговой тест (экспорт → удалить приложение → установить → импорт → данные вернулись).
- [ ] Все 12 issues (#10-#21) закрыты в GitHub с ссылкой на commit / PR.
- [ ] PR открыт, DoD-чеклист.

---

## Критерий 10/10

1. Владелец удалил приложение и установил заново — прошёл онбординг, разрешил уведомления, за 30 секунд создал первую привычку.
2. Открыл настройки — перебрал 4 темы, все выглядят достойно.
3. Экспортировал данные, удалил приложение, установил заново, импортировал — всё вернулось.
4. Сжал все привычки одной кнопкой — экран стал компактным.
5. Открыл в TalkBack — все ключевые кнопки озвучены.
6. Открыл README на GitHub — понятно, что это за проект, за 30 секунд.
7. Собрал EAS билд — apk / aab получился, установился, запустился.
8. Показал приложение другу — тот сказал "выглядит как настоящее приложение", не "хобби-проект".

Если хоть один пункт не выполнен — не 10/10, дорабатывать.
