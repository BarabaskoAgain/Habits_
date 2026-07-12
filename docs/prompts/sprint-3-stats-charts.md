# Промпт: Спринт 3 — Статистика, графики и прогрессии веса

> Ветка: `sprint/3-stats-charts` от `main` **после мержа Спринта 2**.

---

## Контекст (после Спринтов 1–2)

- Единый completion API (`src/utils/completion.js`) с `getPlannedDaysInPeriod(habit, startDate, endDate)`.
- Streak учитывает `activeDays`.
- Схема Habit v2: `activeDays`, `endDate`, `startWeight`, `weightGoal`, `targetWeight`.
- Форма создания уже собирает `startWeight` и `weightGoal`.
- `react-native-svg` уже в зависимостях (`15.11.2`).

**Файлы к рефакторингу:**
- `src/components/stats/WeekStatistics.js` (37 KB)
- `src/components/stats/MonthStatistics.js` (80 KB)
- `src/components/stats/YearStatistics.js` (60 KB)

Суммарно 177 KB — почти гарантированно ≥60% дублирования.

---

## Цель спринта

Пользователь видит красивые информативные графики и понимает свой прогресс по весу.

Покрывает issues: **#12, #15**.

---

## Задачи

### 1. Рефакторинг статистики (делается ДО добавления графиков)

Выделить общее в хук + компоненты:

```
src/hooks/
  useHabitStats.js         // (habit, period) → { plan, fact, percentage, streaks, byDay, ... }
  usePeriodHabits.js       // (habits, archivedHabits, period) → активные + архивные в периоде

src/components/stats/
  PeriodSelector.js        // Неделя/Месяц/Год + Month/Year pickers
  DayCell.js               // ячейка дня (heatmap style)
  StatsHeader.js
  StatsSummaryRow.js       // строка "итого дня"
  StatsRow.js              // строка привычки со всеми ячейками
  WeekView.js              // (был WeekStatistics)
  MonthView.js             // (был MonthStatistics)
  YearView.js              // (был YearStatistics)
  index.js                 // экспорт StatisticsScreen
```

Логика вычислений полностью переехала в `useHabitStats`. Компоненты — только рендер.

**Целевой размер:** каждый view ≤ 15 KB. Суммарно stats ≤ 85 KB (было 177).

### 2. Компонент `<HabitChart />`

Новый переиспользуемый компонент на `react-native-svg`:

```
src/components/charts/
  HabitChart.js            // <HabitChart habit period type="auto|bar|line|heatmap" />
  BarChart.js              // столбчатый (для boolean/number, факт vs план по дням)
  LineChart.js             // линейный (для weight, вес по дням + линия цели)
  Heatmap.js               // Github-style heatmap (для boolean на год)
  chartUtils.js            // подсчёт tick-ов, форматирование осей

src/components/legend/
  ChartLegend.js           // подпись факт/план/цель
```

Ось X — даты (адаптивно: 7 меток для недели, 4 для месяца по неделям, 12 для года).
Ось Y — единицы привычки (кг для веса, шт для number, none для boolean heatmap).

### 3. Экран деталей привычки — `HabitDetailScreen`

Новый экран, открывается по тапу на карточку привычки (не по toggle — toggle остаётся на большую кнопку). Тап на **тело** карточки (иконка + текст) → детали.

Содержит:
- Заголовок: иконка + название + цвет.
- Текущие метрики: streak / лучший streak / % выполнения (за неделю, месяц, год) — карточками сверху.
- Селектор периода (неделя / месяц / год).
- Основной график (по типу привычки).
- Ниже — календарь с завершениями (в стиле heatmap).
- Для веса — блок "Прогресс к цели": прогресс-бар от `startWeight` к `targetWeight`, текст "осталось 3.2 кг".
- Кнопка "Редактировать" открывает Sprint-2 wizard.
- Кнопка "Архивировать" (пока — через Alert; в Sprint 5 — через bottom sheet).

### 4. Issue #15 — недельный и месячный график

**Для boolean:**
- Неделя: 7 ячеек (heatmap), под ними "5/7 выполнено (71%)".
- Месяц: heatmap 5-6 недель × 7 дней.
- Год: heatmap 52 недели (в стиле GitHub contributions).

**Для number:**
- Неделя: bar chart 7 дней, факт (цвет привычки) + план (полупрозрачный).
- Месяц: bar chart по неделям (сумма факта / сумма плана за неделю).
- Год: bar chart по месяцам.

**Для weight:**
- Неделя: line chart с целевой линией (`targetWeight`).
- Месяц: line chart с трендом (linear regression).
- Год: line chart с сглаживанием.

### 5. Issue #12 — прогрессии набора и снижения веса

На `HabitDetailScreen` для веса:

**Секция "Прогресс к цели":**
- Показать `startWeight`, текущий `weight` (последнее заполнение), `targetWeight`.
- Прогресс-бар: 0% (стартовый) → 100% (целевой), маркер текущего.
- Формула прогресса:
  ```
  lose: (start - current) / (start - target)
  gain: (current - start) / (target - start)
  maintain: 1 - abs(current - target) / tolerance   (tolerance=2)
  ```
  clamp [0, 1].
- Ниже — "Осталось: 3.2 кг", "Тренд последних 14 дней: -0.5 кг/нед".

**Логика тренда:**
- Простая линейная регрессия по последним 14 записям.
- Если тренд не в сторону цели — красный текст "Тренд идёт от цели".
- Если в сторону цели — зелёный "Держите темп".

Вынести в `src/utils/weightTrend.js`.

### 6. Сравнение периодов — "эта неделя vs прошлая"

В `WeekView` и `MonthView` добавить переключатель "Сравнить с прошлым периодом":
- Показывается overlay-график полупрозрачной линией прошлого периода.
- В summary внизу: "На 12% лучше, чем на прошлой неделе" (зелёным) или "−5%" (красным).

За компонент отвечает `useHabitStats(period, compareTo)`.

### 7. Микрооптимизации

- `useMemo` для дорогих вычислений `useHabitStats` (по [habit.id, period.startDate, period.endDate, habit.completions]).
- `React.memo` для `DayCell`, `StatsRow`.
- Проверить, что после перехода на месяц с 300+ ячейками нет лагов (тестируется на среднем Android).

### 8. Тесты

- `useHabitStats`: 6 кейсов на разные комбинации типов и периодов.
- `getWeightProgress`: 4 кейса (lose/gain/maintain, крайние значения).
- `weightTrend`: 3 кейса (positive, negative, insufficient data).

---

## Definition of Done

- [ ] `src/components/stats/*` — каждый файл ≤ 15 KB.
- [ ] `WeekStatistics.js`, `MonthStatistics.js`, `YearStatistics.js` **удалены** (переехали в WeekView/MonthView/YearView).
- [ ] Компонент `<HabitChart />` работает для всех 3 типов привычек и 3 периодов.
- [ ] Тап на тело карточки в главном списке → `HabitDetailScreen` открывается.
- [ ] Для weight-привычки виден прогресс к цели с процентом и остатком.
- [ ] Тренд веса рассчитывается и подписан цветом.
- [ ] Сравнение периодов работает (тумблер вкл/выкл overlay).
- [ ] Тесты зелёные.
- [ ] На среднем Android (не флагман) переключение недель/месяцев — без визуальных лагов (≥50 FPS).
- [ ] PR открыт, DoD-чеклист.

---

## Критерий 10/10

1. Владелец открыл привычку "Отжимания" — увидел красивый график недели, столбики по каждому дню, где план = 20 и виден факт.
2. Открыл weight-привычку — увидел линию веса за месяц с целью и понимает, идёт ли к цели.
3. Переключился на "месяц" — не тормозит, график перестроился адекватно.
4. Открыл сравнение с прошлой неделей — сразу понял, лучше или хуже.
5. Код-ревьюер открывает `MonthView.js` и видит компактный (< 15 KB) файл без дублирования.

Если графики "есть, но некрасивые" или "работают, но лагают" — это 7/10, не 10.
