# Промпт: Спринт 1 — Стабилизация и критические баги

> Скопируй **весь этот файл** в сессию AI-агента (Claude Code / Cursor / другой), у которого есть доступ к репозиторию `BarabaskoAgain/Habits_`.
> Работай в отдельной ветке `sprint/1-stabilization`. По завершении — открой PR в `main`.

---

## Контекст проекта

Приложение: Android-трекер привычек на Expo (SDK 53) + React Native 0.79 + React 19.

Все исходники лежат в корне (без папок), файлы:

- `App.js` — корневой контейнер, весь state.
- `MainApp.js` — оболочка с header, tab bar, FAB.
- `HabitCard.js` — карточка привычки.
- `HabitFormModal.js` — форма создания/редактирования.
- `HomeScreen.js` — **дубликат MainApp, не подключён, удалить**.
- `StatisticsScreen.js` + `WeekStatistics.js` + `MonthStatistics.js` + `YearStatistics.js` — статистика.
- `ArchiveScreen.js`, `SettingsScreen.js`, `NotificationManager.js`.
- `constants.js`, `utils.js`, `demoData.js`.
- `settingsStorage.js` — **дубликат constants.js, не подключён, удалить**.
- `eslintrc.js`, `prettierrc.js` — сломанные имена файлов.
- `app.json` — плейсхолдеры вместо bundleIdentifier / projectId.

Типы привычек: `boolean`, `number`, `weight`. В коде местами встречается `quantitative` вместо `number` — это баг B6, нужно унифицировать.

Схемы completion (source of truth — нужно закрепить в одном модуле):
- `boolean`: `completions[date] === true`
- `number`: `completions[date] = { value, completed, timestamp }`
- `weight`: `completions[date] = { weight, timestamp, targetWeight }`

Локальное хранилище: `AsyncStorage`, ключи: `@habits`, `@archivedHabits`, `@achievements`, `@settings`, `@onboarding_complete`.

---

## Цель спринта

Привести приложение в состояние "не крашится, уведомления работают, кодовая база готова к развитию". После этого спринта **никакие новые фичи не добавляются** — только фикс, рефакторинг, инфраструктура.

---

## Задачи (порядок обязательный)

### 1. Миграция файлов в структуру `src/`

Цель — все следующие правки идут уже по нормальной структуре.

Перенести файлы:

```
src/
  screens/
    MainAppScreen.js       (было MainApp.js)
    ArchiveScreen.js
    SettingsScreen.js
    StatisticsScreen.js
  components/
    HabitCard.js
    HabitFormModal.js
    stats/
      WeekStatistics.js
      MonthStatistics.js
      YearStatistics.js
  services/
    NotificationManager.js
    storage.js             (новый — обёртка над AsyncStorage с миграцией)
    logger.js              (новый — замена console.log)
  utils/
    date.js
    stats.js
    weight.js
    completion.js          (новый — единый API для completions)
    streak.js              (новый — единый API для streak с поддержкой skip)
    validation.js
    format.js
  constants/
    themes.js
    typography.js
    categories.js
    achievements.js
    units.js
  data/
    demoData.js
 App.js                     (остаётся в корне, только импорты обновить)
```

В `App.js` обновить все импорты.

Удалить:
- `HomeScreen.js` (не используется)
- `settingsStorage.js` (дубликат)

### 2. Починить конфиги линтера/форматтера

- `eslintrc.js` → `.eslintrc.js`
- `prettierrc.js` → `.prettierrc.js`
- В `package.json` добавить скрипты:
  ```json
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "typecheck": "tsc --noEmit"
  ```
- Проверить, что `npm run lint` завершается без ошибок (правь код или конфиг).

### 3. Ввод TypeScript-конфига (мягкий заход)

- Добавить `tsconfig.json` с `"allowJs": true, "checkJs": true, "strict": false, "noImplicitAny": false, "jsx": "react-native"`.
- Добавить `src/types/habit.ts` c интерфейсами:
  ```ts
  export type HabitType = 'boolean' | 'number' | 'weight';
  export type WeightGoal = 'lose' | 'gain' | 'maintain';
  export interface BooleanCompletion { done: true }
  export interface NumberCompletion { value: number; completed: boolean; timestamp: string }
  export interface WeightCompletion { weight: number; timestamp: string; targetWeight?: number }
  export type Completion = BooleanCompletion | NumberCompletion | WeightCompletion;
  export interface Habit {
    id: string;
    name: string;
    description?: string;
    icon: string;
    color: string;
    category: string;
    type: HabitType;
    targetValue?: number;
    targetWeight?: number;
    startWeight?: number;
    weightGoal?: WeightGoal;
    unit?: string;
    targetDaysPerWeek: number;
    activeDays?: number[]; // 0..6, Mon=0
    reminderEnabled?: boolean;
    reminderTime?: string;
    endDate?: string | null;
    createdAt: string;
    updatedAt?: string;
    completions: Record<string, Completion | boolean>;
    logs?: Array<Record<string, unknown>>;
    isRestored?: boolean;
    restoredAt?: string;
    previousArchiveStats?: unknown;
  }
  ```

### 4. Единый модуль completions — `src/utils/completion.js`

Цель — устранить B6 (mix of 'number'/'quantitative').

API:
```js
// isDone(habit, date) → boolean
// getValue(habit, date) → number (для number/weight, 0/1 для boolean)
// getMeta(habit, date) → object|null (полный completion)
// setCompletion(habit, date, value) → new completions object
// clearCompletion(habit, date) → new completions object
```

Внутри модуля — **вся** логика проверки типа привычки. Все места в коде (`HabitCard`, `MainApp` `todayProgress`, `App` `checkForNewAchievements`, статистика) переписать на использование этого API.

Поле `habit.type` нормализовать: если встречается `'quantitative'` при чтении из storage — конвертировать в `'number'` в миграции (см. п. 8).

### 5. Единый модуль streak — `src/utils/streak.js`

API:
```js
// getCurrentStreak(habit, today, options) → number
// getBestStreak(habit) → number
// isSkipDay(habit, date) → boolean  // на будущее — в Спринте 4 расширяется
```

Пока `isSkipDay` возвращает `false` для всех дат — но контракт заложен.

**Важно:** учитывать `habit.activeDays` — если день не в `activeDays`, он не ломает серию (аналогично skip).

Исправить B7/B8 — timezone-safe. Все преобразования дат — через `date.js`.

### 6. Timezone-safe даты — `src/utils/date.js`

Запретить `.toISOString().split('T')[0]` во всём коде — искать grep-ом.

Все преобразования только через:
```js
function toLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

Прогнать `grep -rn "toISOString" src/` и убрать все использования, где нужна локальная дата.

### 7. Логгер — `src/services/logger.js`

```js
const enabled = __DEV__;
export const logger = {
  debug: (...args) => enabled && console.log(...args),
  info: (...args) => enabled && console.info(...args),
  warn: (...args) => enabled && console.warn(...args),
  error: (...args) => console.error(...args),
};
```

Заменить все `console.log` в проекте на `logger.debug`.
Удалить эмодзи-мусор `🗂️🗂️🗂️`, `🎯🎯🎯` — оставить нейтральные префиксы (`[archive]`, `[habit]`).

### 8. Storage-обёртка с версией и миграциями — `src/services/storage.js`

```js
export const STORAGE_VERSION = 1;

export const storage = {
  async loadAll() { /* читает все ключи + version, применяет миграции */ },
  async save(key, value) { /* сохраняет с version */ },
};

const migrations = {
  0: (data) => {
    // конвертирует habits[].type === 'quantitative' → 'number'
    return { ...data, version: 1 };
  },
};
```

В `App.js` перевести `loadHabits`/`saveHabits`/`loadSettings`/`loadArchivedHabits` на `storage`. Первичный запуск = `version: STORAGE_VERSION`.

### 9. Починить конкретные баги

| Баг | Правка |
|---|---|
| B1 | В `MainApp.js` добавить `import { Alert } from 'react-native'` |
| B2 | В `SettingsScreen.js` добавить `import NotificationManager from '../services/NotificationManager'` |
| B3 | В `HabitCard.getWeightStatusColor` сверять `status.status === 'on_target'/'above_target'/'below_target'` (соответствует WEIGHT_UTILS.getWeightStatus) |
| B4 | В `NotificationManager.sendAchievementNotification` заменить `achievement.title` → `achievement.name` |
| B5 | Раскомментировать `unlockAchievement` в App.js, зафиксировать зависимости useCallback |
| B14 | В `SettingsScreen.getThemeDescription` оставить только blue/purple или добавить темы в `THEMES` (2 темы — оставить как есть в S1, дизайн — S5) |
| B15 | Убрать хардкод `reminderTime: '09:00'` из addHabit — брать из `settings.reminders.defaultTime` |
| B17 | В `NotificationManager.setNotificationHandler` вернуть `{ shouldShowBanner, shouldShowList, shouldPlaySound, shouldSetBadge }` для SDK 53 |
| B18 | Вынести генерацию демо-привычек из loadHabits в отдельный `bootstrap()`, вызываемый только один раз |

### 10. Issue #11 — меню действий закрывается по тапу вне карточки

В `HabitCard`:
- Обернуть `showActions=true`-раскрытие в overlay-listener на уровне `MainAppScreen` (или через `Modal` с `transparent`, но лучше — общий `TouchWithoutFeedback` на родительском ScrollView, который при тапе вне карточки сбрасывает `showActionsFor` state).
- Хранить `showActionsForHabitId` в `MainAppScreen`, а не в самой карточке — тогда открытие меню одной карточки закрывает у другой.

### 11. Issue #13 — уведомления

Пошагово:
1. Проверить, что `app.json` содержит `plugins: ["expo-notifications"]` — уже да.
2. Убедиться, что `expo-notifications` в `package.json` соответствует SDK 53 (сейчас `~0.31.4`, ок).
3. Handler в `NotificationManager.setNotificationHandler` вернуть в формате SDK 53:
   ```js
   handleNotification: async () => ({
     shouldShowBanner: true,
     shouldShowList: true,
     shouldPlaySound: true,
     shouldSetBadge: false,
   })
   ```
4. Убедиться, что `NotificationChannel` создаётся до первого `scheduleNotificationAsync`.
5. Проверить, что `trigger` использует новый формат SDK 53:
   ```js
   trigger: {
     type: Notifications.SchedulableTriggerInputTypes.DAILY,
     hour, minute,
     channelId: 'habits',
   }
   ```
6. Добавить `SettingsScreen` — кнопка "Открыть системные настройки уведомлений" через `Linking.openSettings()`.
7. Тестовое уведомление в `SettingsScreen` — уже есть, оживить (см. B2).
8. Проверка ручная на физическом Android-устройстве:
   - Разрешения выданы?
   - Тест-уведомление приходит немедленно?
   - Расписанное на +1 минуту приходит?
   - После закрытия приложения — приходит?

### 12. Error boundary

Создать `src/components/ErrorBoundary.js`:
```js
import React from 'react';
import { View, Text, Button } from 'react-native';
import { logger } from '../services/logger';

export class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { logger.error('[boundary]', error, info); }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <Text>Что-то пошло не так</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>{String(this.state.error)}</Text>
          <Button title="Перезапустить" onPress={() => this.setState({ error: null })} />
        </View>
      );
    }
    return this.props.children;
  }
}
```

В `App.js` обернуть `<AppContent />` в `<ErrorBoundary>`.

### 13. app.json — заменить плейсхолдеры

- `ios.bundleIdentifier`, `android.package`: `com.barabaskoagain.habits` (или что решит владелец).
- `extra.eas.projectId`: получить через `eas init` — оставить `TODO` комментарием, если владелец не готов.
- Поднять `version` до `1.0.0`, `android.versionCode` до `1`.

### 14. Проверить handleAppStateChange (B12)

При переходе `background → active` пересчитывать `dateUtils.today()` — если изменилось (пересекли полночь при открытом приложении), обновить `selectedDate` в `MainAppScreen`.

---

## Файлы, которые не трогать (в этом спринте)

- `WeekStatistics.js`, `MonthStatistics.js`, `YearStatistics.js` — переносим в `src/components/stats/`, но не рефакторим (это Спринт 3).
- `HabitFormModal.js` — переносим, не рефакторим (это Спринт 2).

---

## Definition of Done (все пункты обязательны)

- [ ] `npm run lint` — 0 ошибок.
- [ ] `npm run typecheck` — 0 ошибок (при `checkJs: true`).
- [ ] Приложение запускается: `npx expo start`, открывается на Android без warnings в консоли (кроме info-уровневых от Expo).
- [ ] На реальном Android-устройстве: создать привычку с напоминанием на +1 минуту → уведомление приходит.
- [ ] Тап на пустое место при открытом меню карточки → меню закрывается.
- [ ] `HomeScreen.js` и `settingsStorage.js` удалены, история git чистая.
- [ ] Все файлы в `src/`, `App.js` — единственный файл в корне (кроме конфигов).
- [ ] `grep -rn "console.log" src/` — 0 результатов.
- [ ] `grep -rn "toISOString.*split" src/` — 0 результатов.
- [ ] `grep -rn "quantitative" src/` — 0 результатов (или только в комментарии "deprecated").
- [ ] Разблокировка первого достижения через код-путь (`checkForNewAchievements`) не бросает `ReferenceError`.
- [ ] `app.json` без плейсхолдеров `yourcompany` / `your-project-id`.
- [ ] Крашится приложение? Error boundary показывает fallback вместо белого экрана.
- [ ] Один commit / несколько commits с осмысленными сообщениями (feat/fix/refactor/chore).
- [ ] Открыт PR c описанием "Sprint 1 done", в описании — checklist DoD.

---

## Критерий 10/10

Спринт заслуживает 10/10, если:
1. Владелец скачал ветку, запустил на своём Android, поставил напоминание — оно пришло. **Без этого — не 10/10**, что бы ни говорил линтер.
2. Ни один из багов B1–B18 больше не воспроизводится (проверить ручным сценарием).
3. Кодовая база готова: следующий спринт не будет тратить время на дозачистку.

Если какой-то пункт DoD не выполнен — отчитайся в PR-описании честно, не делай вид что 10/10.
