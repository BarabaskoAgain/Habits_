// ====================================
// КОМПОНЕНТ МЕСЯЧНОЙ СТАТИСТИКИ С ФИКСИРОВАННЫМИ ЗАГОЛОВКАМИ
// MonthStatistics.js - МЕСЯЦ (ИСПРАВЛЕННАЯ ЛОГИКА ПЛАНОВ)
// ====================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { THEMES, SPACING, BORDER_RADIUS, TYPOGRAPHY, MEASUREMENT_UNITS } from './constants';

import { 
  dateUtils, 
  statsUtils
} from './utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MonthStatistics = ({
  habitsData = { activeHabits: [], archivedHabits: [] },
  selectedMonth,
  selectedYear,
  onHabitToggle = () => {},
  onHabitUpdateValue = () => {},
  theme = 'blue',
  isDarkMode = false,
  monthNames = [],
  // Общие функции от родителя
  calculateAverageWeight,
  calculatePlanFromCreation,
  calculateDayStats,
  getDayStatsColor,
  getDayCellColor,
  getDayCellTextColor,
  getFactValueColor,
  formatCompactValue,
  formatStatValue
}) => {
  const colors = THEMES[theme][isDarkMode ? 'dark' : 'light'];
  
  // === ИЗВЛЕЧЕНИЕ АКТИВНЫХ И АРХИВИРОВАННЫХ ПРИВЫЧЕК ===
  const { activeHabits, archivedHabits } = habitsData;
  const allHabits = [...activeHabits, ...archivedHabits];
  
  // === СОСТОЯНИЕ ДЛЯ МОДАЛЬНОГО ОКНА ДНЯ ===
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  
  // === СОСТОЯНИЕ ДЛЯ МОДАЛЬНОГО ОКНА ДЕТАЛЬНОГО ОТЧЁТА ПРИВЫЧКИ ===
  const [selectedHabitData, setSelectedHabitData] = useState(null);
  const [showHabitModal, setShowHabitModal] = useState(false);
  
  // === СОСТОЯНИЕ ДЛЯ РАСКРЫВАЮЩИХСЯ БЛОКОВ ===
  const [expandedSections, setExpandedSections] = useState({
    stats: true,      // Статистика открыта по умолчанию
    info: false,      // Информация свернута
    insights: false,  // Анализ свернут
    daily: false,     // Ежедневные итоги свернуты
    monthSummary: true // Итоги месяца ОТКРЫТЫ по умолчанию
  });

  // === ДНИ НЕДЕЛИ ===
  const weekDayNames = useMemo(() => ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'], []);

  // === ИСПРАВЛЕННАЯ ФУНКЦИЯ РАСЧЕТА СТАТИСТИКИ ДНЯ С УЧЕТОМ АРХИВИРОВАНИЯ ===
  const calculateDayStatsWithArchive = useCallback((date, allHabits) => {
    if (!allHabits || allHabits.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    let completed = 0;
    let total = 0;

    allHabits.forEach(habit => {
      // ✅ ИСПРАВЛЕНИЕ: Проверяем была ли привычка активна на эту дату
      const habitCreated = new Date(habit.createdAt);
      const currentDate = new Date(date);
      const habitCreatedDate = new Date(habitCreated.getFullYear(), habitCreated.getMonth(), habitCreated.getDate());
      const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      
      // Если привычка еще не была создана на эту дату - пропускаем
      if (habitCreatedDate > currentDateOnly) {
        return;
      }
      
      // Если привычка была архивирована ДО этой даты - пропускаем
      if (habit.archivedAt) {
        const archivedDate = new Date(habit.archivedAt);
        const archivedDateOnly = new Date(archivedDate.getFullYear(), archivedDate.getMonth(), archivedDate.getDate());
        if (archivedDateOnly < currentDateOnly) {
          return;
        }
      }
      
      // Привычка была активна на эту дату - учитываем в плане
      total++;
      
      const completion = habit.completions?.[date];
      
      if (habit.type === 'boolean') {
        if (completion) completed++;
      } else if (habit.type === 'weight') {
        if (completion && typeof completion === 'object' && completion.weight > 0) completed++;
      } else if (habit.type === 'number') {
        if (completion && completion.completed) completed++;
      }
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, []);

  // ✅ НОВАЯ ФУНКЦИЯ: Более светлые цвета для календаря месяца
  const getCalendarDayCellColor = useCallback((percentage, colors) => {
    if (percentage === 100) {
      return colors.success + '30'; // 30% прозрачность - очень светлый зеленый
    } else if (percentage >= 50) {
      return colors.warning + '25'; // 25% прозрачность - очень светлый оранжевый
    } else if (percentage > 0) {
      return colors.error + '20'; // 20% прозрачность - очень светлый красный
    } else {
      return colors.surface; // Нейтральный цвет
    }
  }, []);

  // === ОБРАБОТЧИК НАЖАТИЯ НА ДЕНЬ В КАЛЕНДАРЕ ===
  const handleDayPress = useCallback((day) => {
    if (!day.isCurrentMonth) return;
    
    console.log('🔍 Day pressed:', day.date, 'Today:', dateUtils.today());
    
    // ✅ ИСПРАВЛЕНИЕ: Используем новую функцию с учетом архивирования
    const dayStats = calculateDayStatsWithArchive(day.date, allHabits);
    console.log('🔍 Day stats:', dayStats);
    
    // Формируем подробные данные для каждой привычки
    const dayHabitsData = allHabits.map(habit => {
      // ✅ ИСПРАВЛЕНИЕ: Проверяем активность привычки на эту дату
      const habitCreated = new Date(habit.createdAt);
      const currentDate = new Date(day.date);
      const habitCreatedDate = new Date(habitCreated.getFullYear(), habitCreated.getMonth(), habitCreated.getDate());
      const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      
      // Если привычка еще не была создана - не показываем
      if (habitCreatedDate > currentDateOnly) {
        return null;
      }
      
      // Если привычка была архивирована до этой даты - не показываем
      if (habit.archivedAt) {
        const archivedDate = new Date(habit.archivedAt);
        const archivedDateOnly = new Date(archivedDate.getFullYear(), archivedDate.getMonth(), archivedDate.getDate());
        if (archivedDateOnly < currentDateOnly) {
          return null;
        }
      }
      
      const completion = habit.completions?.[day.date];
      console.log(`🔍 Habit "${habit.name}" completion for ${day.date}:`, completion);
      
      let status = 'not_completed';
      let displayValue = '';
      let factValue = 0;
      let planValue = 1;
      
      // Определяем план и факт в зависимости от типа привычки
      if (habit.type === 'boolean') {
        planValue = 1;
        factValue = completion ? 1 : 0;
        status = completion === true ? 'completed' : 'not_completed';
        displayValue = completion ? '✓' : null;
        status = completion === true ? 'completed' : 'empty';
      } else if (habit.type === 'weight') {
        planValue = 1;
        if (typeof completion === 'object' && completion.weight && completion.weight > 0) {
          factValue = 1;
          displayValue = completion.weight.toFixed(1);
          status = 'completed';
        } else {
          factValue = 0;
          status = 'not_completed';
          displayValue = '-';
        }
      } else if (habit.type === 'number') {
        planValue = habit.targetValue || 1;
        if (completion && completion.value && completion.value > 0) {
          factValue = completion.value;
          status = completion.completed ? 'completed' : 'partial';
const unitLabel = habit.unit && MEASUREMENT_UNITS[habit.unit] 
  ? MEASUREMENT_UNITS[habit.unit].shortLabel 
  : '';
displayValue = `${completion.value}${unitLabel ? ' ' + unitLabel : ''}`;
        } else {
          factValue = 0;
          status = 'not_completed';
          displayValue = '-';
        }
      }
      
      return {
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        type: habit.type,
        unit: habit.unit,
        status,
        displayValue,
        planValue,
        factValue,
        isArchived: habit.archivedAt ? true : false
      };
    }).filter(habit => habit !== null); // Убираем null значения
    
    setSelectedDayData({
      day: day.day,
      date: day.date,
      isToday: day.date === dateUtils.today(),
      stats: dayStats,
      habits: dayHabitsData
    });
    setShowDayModal(true);
  }, [allHabits, calculateDayStatsWithArchive]);

  // === ОБРАБОТЧИК НАЖАТИЯ НА ПРИВЫЧКУ ===
  const handleHabitPress = useCallback((habit) => {
    // Добавляем completions к данным привычки для детального анализа
    const habitWithCompletions = {
      ...habit,
      completions: allHabits.find(h => h.id === habit.id)?.completions || {}
    };
    setSelectedHabitData(habitWithCompletions);
    setShowHabitModal(true);
    // Сбрасываем состояние раскрытых секций
    setExpandedSections({
      stats: true,
      info: false,
      insights: false,
      daily: false,
      monthSummary: true // сохраняем календарь открытым
    });
  }, [allHabits]);

  // === ПЕРЕКЛЮЧЕНИЕ РАСКРЫТЫХ СЕКЦИЙ ===
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // === ФУНКЦИЯ ПЕРЕВОДА ЕДИНИЦ ИЗМЕРЕНИЯ ===
  const translateUnit = useCallback((unit, value = 1) => {
    if (!unit) return '';
    
    const unitTranslations = {
      'times': value === 1 ? 'раз' : 'раз',
      'pieces': value === 1 ? 'штука' : value < 5 ? 'штуки' : 'штук',
      'glasses': value === 1 ? 'стакан' : value < 5 ? 'стакана' : 'стаканов',
      'minutes': value === 1 ? 'минута' : value < 5 ? 'минуты' : 'минут',
      'hours': value === 1 ? 'час' : value < 5 ? 'часа' : 'часов',
      'pages': value === 1 ? 'страница' : value < 5 ? 'страницы' : 'страниц',
      'exercises': value === 1 ? 'упражнение' : value < 5 ? 'упражнения' : 'упражнений',
      'steps': value === 1 ? 'шаг' : value < 5 ? 'шага' : 'шагов',
      'km': 'км',
      'kg': 'кг',
      'ml': 'мл',
      'l': 'л',
      'раз': 'раз',
      'мин': 'мин',
      'ч': 'ч'
    };
    
    return unitTranslations[unit.toLowerCase()] || unit;
  }, []);

  // === ФУНКЦИЯ ФОРМАТИРОВАНИЯ ЗНАЧЕНИЙ С ПЕРЕВОДОМ ===
  const formatLocalizedValue = useCallback((value, type, unit) => {
    if (type === 'boolean') {
      return value ? 'Да' : 'Нет';
    }
    
    if (type === 'weight') {
      return typeof value === 'object' && value.weight ? 
        `${value.weight.toFixed(1)} кг` : 
        typeof value === 'number' ? `${value.toFixed(1)} кг` : '0 кг';
    }
    
    if (type === 'number') {
      const translatedUnit = translateUnit(unit, value);
      return `${value}${translatedUnit ? ' ' + translatedUnit : ''}`;
    }
    
    return value.toString();
  }, [translateUnit]);

  // === ФУНКЦИЯ РАСЧЕТА ЛУЧШЕЙ СЕРИИ ЗА МЕСЯЦ ===
  const calculateBestStreakForMonth = useCallback((habit, dates) => {
    if (!habit.completions || !dates || dates.length === 0) return 0;
    
    let maxStreak = 0;
    let currentStreak = 0;
    
    // Сортируем даты по порядку
    const sortedDates = [...dates].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedDates.forEach(({ date }) => {
      const completion = habit.completions[date];
      let isCompleted = false;
      
      if (habit.type === 'boolean') {
        isCompleted = completion === true;
      } else if (habit.type === 'weight') {
        isCompleted = completion && typeof completion === 'object' && completion.weight > 0;
      } else if (habit.type === 'number') {
        isCompleted = completion && completion.completed;
      }
      
      if (isCompleted) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    
    return maxStreak;
  }, []);

  // === ВЫЧИСЛЕНИЕ ДАННЫХ ДЛЯ МЕСЯЦА ===
  const statisticsData = useMemo(() => {
    if (!allHabits || allHabits.length === 0) return { 
      dates: [], 
      activeHabitsStats: [], 
      archivedHabitsStats: [], 
      weeks: [] 
    };

    try {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      
      const dates = [];
      const weeks = [];
      
      // Генерируем даты месяца и недели
      const currentWeekStart = new Date(startDate);
      currentWeekStart.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
      
      const todayStr = dateUtils.today();
      
      while (currentWeekStart <= endDate) {
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(currentWeekStart);
          date.setDate(currentWeekStart.getDate() + i);
          const dateStr = dateUtils.formatDateLocal(date);
          
          // ВАЖНО: проверяем isToday только если смотрим на текущий месяц и год
          const now = new Date();
          const isViewingCurrentMonthYear = (selectedMonth === now.getMonth() && selectedYear === now.getFullYear());
          const isToday = isViewingCurrentMonthYear && (dateStr === todayStr);
          
          weekDays.push({
            date: dateStr,
            day: date.getDate(),
            weekday: weekDayNames[i],
            isCurrentMonth: date.getMonth() === selectedMonth,
            isToday: isToday
          });
          
          // Отладка для каждого дня
          if (date.getMonth() === selectedMonth && date.getDate() >= 25 && date.getDate() <= 28) {
            console.log(`📊 GENERATE Day ${date.getDate()}:`);
            console.log(`    dateStr: ${dateStr}`);
            console.log(`    todayStr: ${todayStr}`);
            console.log(`    isViewingCurrentMonthYear: ${isViewingCurrentMonthYear}`);
            console.log(`    isToday: ${isToday}`);
            console.log(`    selectedMonth: ${selectedMonth}, currentMonth: ${now.getMonth()}`);
            console.log(`    selectedYear: ${selectedYear}, currentYear: ${now.getFullYear()}`);
          }
          
          if (date.getMonth() === selectedMonth) {
            dates.push({
              date: dateStr,
              day: date.getDate(),
              weekday: weekDayNames[i],
              isToday: dateStr === todayStr
            });
          }
        }
        
        weeks.push(weekDays);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }

      // ФУНКЦИЯ ВЫЧИСЛЕНИЯ СТАТИСТИКИ ДЛЯ ГРУППЫ ПРИВЫЧЕК
      const calculateHabitsStats = (habits) => {
        return habits.map(habit => {
          const completions = habit.completions || {};
          let weightEntries = [];
          
          const planValue = calculatePlanFromCreation(habit, startDate, endDate);
          
          let factValue = 0;
          let completedDays = 0;
          
          dates.forEach(({ date }) => {
            const completion = completions[date];
            
            if (habit.type === 'boolean') {
              if (completion === true) {
                factValue++;
                completedDays++;
              }
            } else if (habit.type === 'weight') {
              if (typeof completion === 'object' && completion.weight && completion.weight > 0) {
                weightEntries.push(completion.weight);
                factValue++;
                completedDays++;
              }
            } else if (habit.type === 'number') {
              if (completion && completion.value && completion.value > 0) {
                factValue += completion.value;
                if (completion.completed) completedDays++;
              }
            }
          });
          
          // Для весовых привычек используем среднее значение как факт
          if (habit.type === 'weight' && weightEntries.length > 0) {
            factValue = parseFloat(calculateAverageWeight(weightEntries).toFixed(1));
          }
          
          const percentage = planValue > 0 ? Math.round((factValue / planValue) * 100) : 0;
          
          // Генерируем ежедневные данные для модального окна
          const dailyData = dates.map(({ date }) => {
            const completion = completions[date];
            let value = null;
            let status = 'empty';
            
            if (completion) {
              if (habit.type === 'boolean') {
                value = completion === true ? '✓' : null;
                status = completion === true ? 'completed' : 'empty';
              } else if (habit.type === 'weight') {
                if (typeof completion === 'object' && completion.weight && completion.weight > 0) {
                  value = completion.weight.toFixed(1);
                  status = 'completed';
                }
              } else if (habit.type === 'number') {
                if (completion.value && completion.value > 0) {
                  value = completion.value;
                  status = completion.completed ? 'completed' : 'partial';
                }
              }
            }
            
            return { date, value, status };
          });

          return {
            id: habit.id,
            name: habit.name,
            icon: habit.icon,
            color: habit.color,
            type: habit.type,
            unit: habit.unit,
            targetValue: habit.targetValue,
            targetWeight: habit.targetWeight,
            planValue,
            factValue,
            percentage,
            completedDays,
            dailyData,
            streak: statsUtils.getStreak(habit),
            createdAt: habit.createdAt,
            isArchived: habit.isArchived || false
          };
        });
      };

      // ВЫЧИСЛЯЕМ СТАТИСТИКУ ДЛЯ АКТИВНЫХ И АРХИВИРОВАННЫХ ПРИВЫЧЕК
      const activeHabitsStats = calculateHabitsStats(activeHabits);
      const archivedHabitsStats = calculateHabitsStats(archivedHabits);

      return { dates, activeHabitsStats, archivedHabitsStats, weeks };
    } catch (error) {
      console.error('Ошибка вычисления статистики месяца:', error);
      return { dates: [], activeHabitsStats: [], archivedHabitsStats: [], weeks: [] };
    }
  }, [allHabits, activeHabits, archivedHabits, selectedMonth, selectedYear, calculateAverageWeight, calculatePlanFromCreation, weekDayNames]);

  // === РЕНДЕР ОБЩЕГО КАЛЕНДАРЯ МЕСЯЦА С ИТОГАМИ ===
  const renderMonthSummaryCalendar = () => {
    const { weeks } = statisticsData;
    const availableWidth = SCREEN_WIDTH - (SPACING.md * 4) - (1 * 14);
    const dayWidth = Math.floor(availableWidth / 7);
    
    console.log('🔍 RENDER CALENDAR START');
    console.log('🔍 Selected month/year:', selectedMonth, selectedYear);
    
    return (
      <View style={[styles.monthSummaryContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.monthSummaryHeader}>
          <Text style={[styles.monthSummaryTitle, { color: colors.text }]}>
            📊 Итоги {monthNames[selectedMonth]?.toLowerCase() || 'месяца'}
          </Text>
        </View>
        
        <View style={styles.monthSummaryCalendar}>
          {/* Заголовок с днями недели */}
          <View style={styles.summaryWeekHeader}>
            {weekDayNames.map((day, index) => (
              <View key={index} style={[styles.summaryDayHeader, { width: dayWidth }]}>
                <Text style={[styles.summaryWeekdayText, { color: colors.textSecondary }]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>
          
          {/* Недели */}
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.summaryWeekRow}>
              {week.map((day, dayIndex) => {
                // ✅ ИСПРАВЛЕНИЕ: Показываем только дни текущего месяца
                if (!day.isCurrentMonth) {
                  return (
                    <View key={dayIndex} style={[styles.summaryDayColumn, { width: dayWidth }]}>
                      {/* Пустая ячейка для дней других месяцев */}
                    </View>
                  );
                }

                // ✅ ИСПРАВЛЕНИЕ: Используем новую функцию расчета статистики дня
                const dayStats = calculateDayStatsWithArchive(day.date, allHabits);
                
                // ✅ ИСПРАВЛЕНИЕ: Используем более светлые цвета для лучшей читаемости
                const backgroundColor = getCalendarDayCellColor(dayStats.percentage, colors);
                
                // Отладка для дней около текущей даты
                if (day.day >= 25 && day.day <= 28) {
                  console.log(`🔍 RENDER Day ${day.day}:`);
                  console.log(`    day.date: ${day.date}`);
                  console.log(`    day.isToday: ${day.isToday}`);
                  console.log(`    day.isCurrentMonth: ${day.isCurrentMonth}`);
                }
                
                return (
                  <View key={dayIndex} style={[styles.summaryDayColumn, { width: dayWidth }]}>
                    <TouchableOpacity
                      style={[
                        styles.summaryDayCell,
                        { 
                          backgroundColor,
                          borderWidth: day.isToday ? 2 : 0,
                          borderColor: day.isToday ? colors.primary : 'transparent'
                        }
                      ]}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.summaryDayNumber,
                        { 
                          color: day.isToday ? colors.primary : colors.text,
                          fontWeight: day.isToday ? 'bold' : '600'
                        }
                      ]}>
                        {day.day}
                      </Text>
                      <Text style={[
                        styles.summaryDayStats,
                        { 
                          color: dayStats.percentage === 100 ? colors.success :
                                 dayStats.percentage >= 50 ? colors.warning :
                                 dayStats.percentage > 0 ? colors.error : colors.textSecondary
                        }
                      ]}>
                        {dayStats.total > 0 ? `${dayStats.completed}/${dayStats.total}` : '-'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        
        {/* Легенда */}
        <View style={styles.summaryLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.success + '30' }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>100%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.warning + '25' }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>50%+</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.error + '20' }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>0%+</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.surface }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>0%</Text>
          </View>
        </View>
      </View>
    );
  };

  // === РЕНДЕР ГРУППЫ ПРИВЫЧЕК ===
  const renderHabitsGroup = (habitsStats, title, titleColor) => {
    if (!habitsStats || habitsStats.length === 0) return null;
    
    return (
      <>
        {/* Заголовок группы */}
        <View style={[styles.groupHeader, { 
          backgroundColor: titleColor + '20',
          borderLeftColor: titleColor 
        }]}>
          <Text style={[styles.groupTitle, { color: titleColor }]}>
            {title} ({habitsStats.length})
          </Text>
        </View>
        
        {/* Карточки привычек */}
        {habitsStats.map((habitStat) => (
          <TouchableOpacity
            key={habitStat.id}
            style={[
              styles.monthHabitCard,
              { 
                backgroundColor: colors.card,
                borderColor: habitStat.color + '60'
              }
            ]}
            onPress={() => handleHabitPress(habitStat)}
            activeOpacity={0.7}
          >
            <View style={styles.monthHabitHeader}>
              <View style={styles.monthHabitInfo}>
                <View style={styles.monthHabitTitleRow}>
                  <Text style={styles.monthHabitIcon}>{habitStat.icon}</Text>
                  <Text style={[styles.monthHabitName, { color: colors.text }]} numberOfLines={1}>
                    {habitStat.name}
                  </Text>
                  {habitStat.isArchived && (
                    <View style={[styles.archivedBadge, { backgroundColor: colors.textSecondary }]}>
                      <Text style={styles.archivedText}>ЗАВЕРШЕНО</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.monthHabitStats}>
                  {/* ЕДИНАЯ СТРОКА: Факт - План - Лучшая серия - % выполнения */}
                  <View style={styles.monthHabitStatsRow}>
                    {/* Факт */}
                    <View style={styles.monthHabitStatItem}>
                      <Text style={[styles.monthHabitStatLabel, { color: colors.textSecondary }]}>
                        Факт:
                      </Text>
                      <Text style={[styles.monthHabitStatValue, { color: colors.text }]}>
                        {formatLocalizedValue(habitStat.factValue, habitStat.type, habitStat.unit)}
                      </Text>
                    </View>

                    {/* Сепаратор */}
                    <View style={[styles.monthHabitSeparator, { backgroundColor: colors.border }]} />

                    {/* План */}
                    <View style={styles.monthHabitStatItem}>
                      <Text style={[styles.monthHabitStatLabel, { color: colors.textSecondary }]}>
                        План:
                      </Text>
                      <Text style={[styles.monthHabitStatValue, { color: colors.text }]}>
                        {formatLocalizedValue(habitStat.planValue, habitStat.type, habitStat.unit)}
                      </Text>
                    </View>

                    {/* Сепаратор */}
                    <View style={[styles.monthHabitSeparator, { backgroundColor: colors.border }]} />

                    {/* Лучшая серия */}
                    <View style={styles.monthHabitStatItem}>
                      <Text style={[styles.monthHabitStatLabel, { color: colors.textSecondary }]}>
                        Лучшая серия:
                      </Text>
                      <Text style={[styles.monthHabitStatValue, { color: colors.text }]}>
                        {calculateBestStreakForMonth(allHabits.find(h => h.id === habitStat.id), statisticsData.dates)}
                      </Text>
                    </View>

                    {/* Сепаратор */}
                    <View style={[styles.monthHabitSeparator, { backgroundColor: colors.border }]} />

                    {/* % выполнения */}
                    <View style={styles.monthHabitStatItem}>
                      <Text style={[styles.monthHabitStatLabel, { color: colors.textSecondary }]}>
                        Вып:
                      </Text>
                      <Text style={[styles.monthHabitStatValue, { 
                        color: habitStat.percentage === 100 ? colors.success :
                               habitStat.percentage >= 75 ? colors.warning :
                               habitStat.percentage >= 50 ? '#FF6B35' :
                               habitStat.percentage >= 25 ? colors.error : '#8B0000'
                      }]}>
                        {habitStat.percentage}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </>
    );
  };

  // === ОСНОВНОЙ РЕНДЕР ===
  const renderMonthView = () => {
    const { activeHabitsStats, archivedHabitsStats } = statisticsData;
    
    return (
      <ScrollView style={styles.monthContainer} showsVerticalScrollIndicator={false}>
        {/* Общий календарь с итогами месяца */}
        {renderMonthSummaryCalendar()}
        
        {/* Разделитель */}
        <View style={styles.monthDivider}>
          <Text style={[styles.monthDividerText, { color: colors.text }]}>
            📋 Итоги по привычкам
          </Text>
        </View>
        
        {/* АКТИВНЫЕ ПРИВЫЧКИ */}
        {renderHabitsGroup(
          activeHabitsStats, 
          "🎯 Активные привычки", 
          colors.success
        )}
        
        {/* АРХИВИРОВАННЫЕ ПРИВЫЧКИ (если есть) */}
        {renderHabitsGroup(
          archivedHabitsStats, 
          "📁 Завершенные в этом месяце", 
          colors.textSecondary
        )}
        
        {/* Пустое состояние */}
        {activeHabitsStats.length === 0 && archivedHabitsStats.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              В этом месяце у вас не было привычек
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // === МОДАЛЬНОЕ ОКНО С ФИКСИРОВАННЫМИ ЗАГОЛОВКАМИ ===
  const renderDayDetailsModal = () => (
    <Modal
      visible={showDayModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDayModal(false)}
    >
      <View style={styles.modalFullOverlay}>
        <View style={[styles.modalFullContainer, { backgroundColor: colors.card }]}>
          
          {/* ЗАГОЛОВОК - ФИКСИРОВАННЫЙ */}
          <View style={[styles.modalFixedHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.error }]}
              onPress={() => setShowDayModal(false)}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            {selectedDayData && (
              <View style={styles.dayModalHeaderContent}>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                  {selectedDayData.day} {monthNames[selectedMonth]?.toLowerCase()}
                </Text>
                {selectedDayData.isToday && (
                  <View style={[styles.modalTodayBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.modalTodayText}>СЕГОДНЯ</Text>
                  </View>
                )}
                
                <View style={[styles.modalStatsRow, { backgroundColor: colors.card }]}>
                  <Text style={[styles.modalStatsLabel, { color: colors.text }]}>
                    Выполнено:
                  </Text>
                  <Text style={[styles.modalStatsValue, { 
                    color: selectedDayData.stats.percentage === 100 ? colors.success :
                           selectedDayData.stats.percentage >= 50 ? colors.warning : colors.error
                  }]}>
                    {selectedDayData.stats.completed} из {selectedDayData.stats.total} ({selectedDayData.stats.percentage}%)
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* СОДЕРЖИМОЕ */}
          <ScrollView 
            style={styles.modalScrollableContent}
            contentContainerStyle={styles.modalScrollPadding}
            showsVerticalScrollIndicator={false}
          >
            {selectedDayData && (
              <>
                {/* Таблица привычек */}
                <View style={[styles.modalTableHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.modalHeaderText, { color: colors.text, flex: 2.5 }]}>
                    Привычка
                  </Text>
                  <Text style={[styles.modalHeaderText, { color: colors.text, flex: 2 }]}>
                    Факт
                  </Text>
                  <Text style={[styles.modalHeaderText, { color: colors.text, flex: 2 }]}>
                    План
                  </Text>
                  <Text style={[styles.modalHeaderText, { color: colors.text, flex: 1.5 }]}>
                    Статус
                  </Text>
                </View>

                {selectedDayData.habits.length > 0 ? selectedDayData.habits.map((habit) => {
                  // Определяем статус выполнения для иконки
                  let statusIcon = 'close-circle';
                  let statusColor = colors.error;
                  let isOverachieved = false;

                  if (habit.status === 'completed') {
                    // Проверяем перевыполнение для количественных привычек
                    if (habit.type === 'number' && habit.factValue > habit.planValue) {
                      isOverachieved = true;
                      statusIcon = 'flame';
                      statusColor = '#FF4500'; // Оранжевый цвет огонька
                    } else {
                      statusIcon = 'checkmark-circle';
                      statusColor = colors.success;
                    }
                  } else if (habit.status === 'partial') {
                    statusIcon = 'remove-circle';
                    statusColor = colors.warning;
                  }

                  return (
                    <View key={habit.id} style={[styles.modalHabitRow, { 
                      backgroundColor: colors.card,
                      borderBottomColor: colors.border,
                      alignItems: 'center' // Центрируем всю строку вертикально
                    }]}>
                      {/* ПРИВЫЧКА */}
                      <View style={[styles.modalHabitCell, { flex: 2.5, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start' }]}>
                        <Text style={styles.modalHabitIcon}>{habit.icon}</Text>
                        <View style={styles.modalHabitNameContainer}>
                          <Text style={[styles.modalHabitName, { color: colors.text }]} numberOfLines={3}>
                            {habit.name}
                          </Text>
                          {habit.isArchived && (
                            <Text style={[styles.modalArchivedNote, { color: colors.textSecondary }]}>
                              (архивирована)
                            </Text>
                          )}
                        </View>
                      </View>
                      
                      {/* ФАКТ */}
                      <View style={[styles.modalHabitCell, { flex: 2 }]}>
                        <Text style={[styles.modalCellText, { 
                          color: habit.factValue > 0 ? colors.text : colors.textSecondary
                        }]}>
                          {habit.factValue > 0 ? formatLocalizedValue(habit.factValue, habit.type, habit.unit) : '0'}
                        </Text>
                      </View>

                      {/* ПЛАН */}
                      <View style={[styles.modalHabitCell, { flex: 2 }]}>
                        <Text style={[styles.modalCellText, { color: colors.textSecondary }]} numberOfLines={2}>
                          {habit.type === 'boolean' ? 'Выполнить' :
                           habit.type === 'weight' ? 'Записать' :
                           formatLocalizedValue(habit.planValue, habit.type, habit.unit)}
                        </Text>
                      </View>
                      
                      {/* СТАТУС */}
                      <View style={[styles.modalHabitCell, { flex: 1.5 }]}>
                        <Ionicons 
                          name={statusIcon}
                          size={24}
                          color={statusColor}
                        />
                      </View>
                    </View>
                  );
                }) : (
                  <View style={styles.modalEmptyState}>
                    <Text style={styles.modalEmptyIcon}>📝</Text>
                    <Text style={[styles.modalEmptyText, { color: colors.textSecondary }]}>
                      В этот день у вас не было активных привычек
                    </Text>
                  </View>
                )}

                {/* Отступ снизу для комфортного скролла */}
                <View style={styles.modalBottomSpace} />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // === МОДАЛЬНОЕ ОКНО ДЕТАЛЬНОГО ОТЧЁТА ПРИВЫЧКИ ===
  const renderHabitDetailsModal = () => (
    <Modal
      visible={showHabitModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowHabitModal(false)}
    >
      <View style={styles.modalFullOverlay}>
        <View style={[styles.modalFullContainer, { backgroundColor: colors.card }]}>
          
          {/* ЗАГОЛОВОК */}
          <View style={[styles.modalFixedHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.error }]}
              onPress={() => setShowHabitModal(false)}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            {selectedHabitData && (
              <View style={styles.habitModalHeaderContent}>
                <Text style={styles.habitModalIcon}>{selectedHabitData.icon}</Text>
                <Text style={[styles.modalHeaderTitle, { color: colors.text, textAlign: 'center', fontSize: 18 }]}>
                  {selectedHabitData.name}
                </Text>
                {selectedHabitData.isArchived && (
                  <View style={[styles.archivedBadge, { backgroundColor: colors.textSecondary }]}>
                    <Text style={styles.archivedText}>ЗАВЕРШЕНО</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* СОДЕРЖИМОЕ */}
          <ScrollView 
            style={styles.modalScrollableContent}
            contentContainerStyle={styles.modalScrollPadding}
            showsVerticalScrollIndicator={false}
          >
            {selectedHabitData && (
              <>
                {/* СЕКЦИЯ 1: Основная статистика */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => toggleSection('stats')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                        📊 Статистика месяца
                      </Text>
                      <Ionicons 
                        name={expandedSections.stats ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {expandedSections.stats && (
                    <View style={styles.modalStatsContainer}>
                      {/* ПЕРВАЯ СТРОКА: Факт - План - % выполнения */}
                      <View style={styles.modalStatsRow}>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            📊 Факт
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.success }]}>
                            {formatLocalizedValue(selectedHabitData.factValue, selectedHabitData.type, selectedHabitData.unit)}
                          </Text>
                        </View>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            🎯 План
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.primary }]}>
                            {formatLocalizedValue(selectedHabitData.planValue, selectedHabitData.type, selectedHabitData.unit)}
                          </Text>
                        </View>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            📈 % вып
                          </Text>
                          <Text style={[styles.modalStatValue, { 
                            color: selectedHabitData.percentage === 100 ? colors.success :
                                   selectedHabitData.percentage >= 75 ? colors.warning :
                                   selectedHabitData.percentage >= 50 ? '#FF6B35' :
                                   selectedHabitData.percentage >= 25 ? colors.error : '#8B0000'
                          }]}>
                            {selectedHabitData.percentage}%
                          </Text>
                        </View>
                      </View>

                      {/* СЕПАРАТОР */}
                      <View style={[styles.modalStatsSeparator, { backgroundColor: colors.border }]} />

                      {/* ВТОРАЯ СТРОКА: Дней выполнено - Лучшая серия - Текущая серия */}
                      <View style={styles.modalStatsRow}>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            📅 Дней вып
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.warning }]}>
                            {selectedHabitData.completedDays}
                          </Text>
                        </View>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            🏆 Лучшая серия
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.primary }]}>
                            {calculateBestStreakForMonth(selectedHabitData, statisticsData.dates)}
                          </Text>
                        </View>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            🔥 Текущая серия
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.error }]}>
                            {selectedHabitData.streak}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* СЕКЦИЯ 2: Ежедневные итоги (ПЕРЕНЕСЕНА ВПЕРЕД) */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => toggleSection('daily')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                        📈 Ежедневные итоги
                      </Text>
                      <Ionicons 
                        name={expandedSections.daily ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {expandedSections.daily && (
                    <View style={styles.dailyStatsContainer}>
                      {/* СУММАРНАЯ СТАТИСТИКА */}
                      <View style={[styles.dailyStatsSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.summaryItem}>
                          <Text style={[styles.summaryValue, { color: colors.primary }]}>
                            {selectedHabitData.planValue}
                          </Text>
                          <Text style={[styles.summaryLabel, { color: colors.text }]}>
                            План
                          </Text>
                        </View>
                        <View style={styles.summaryItem}>
                          <Text style={[styles.summaryValue, { color: colors.success }]}>
                            {formatLocalizedValue(selectedHabitData.factValue, selectedHabitData.type, selectedHabitData.unit)}
                          </Text>
                          <Text style={[styles.summaryLabel, { color: colors.text }]}>
                            Факт
                          </Text>
                        </View>
                        <View style={styles.summaryItem}>
                          <Text style={[styles.summaryValue, { color: colors.warning }]}>
                            {selectedHabitData.percentage}%
                          </Text>
                          <Text style={[styles.summaryLabel, { color: colors.text }]}>
                            Выполнено
                          </Text>
                        </View>
                      </View>

                      {/* ЗАГОЛОВОК ТАБЛИЦЫ */}
                      <View style={[styles.dailyStatsHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.dailyStatsCell, { flex: 1 }]}>
                          <Text style={[styles.dailyStatsHeaderText, { color: colors.text }]}>
                            День
                          </Text>
                        </View>
                        <View style={[styles.dailyStatsCell, { flex: 1.5 }]}>
                          <Text style={[styles.dailyStatsHeaderText, { color: colors.text }]}>
                            План
                          </Text>
                        </View>
                        <View style={[styles.dailyStatsCell, { flex: 1.5 }]}>
                          <Text style={[styles.dailyStatsHeaderText, { color: colors.text }]}>
                            Факт
                          </Text>
                        </View>
                        <View style={[styles.dailyStatsCell, { flex: 1 }]}>
                          <Text style={[styles.dailyStatsHeaderText, { color: colors.text }]}>
                            %
                          </Text>
                        </View>
                      </View>

                      {/* ДАННЫЕ ПО ДНЯМ */}
                      <ScrollView style={[styles.dailyStatsList, { backgroundColor: colors.card }]} nestedScrollEnabled>
                        {(() => {
                          const { dates } = statisticsData;
                          return dates.map((dayDate, index) => {
                            // Получаем данные выполнения для этого дня
                            const completion = selectedHabitData.completions?.[dayDate.date];
                            
                            // Рассчитываем план, факт и процент для этого дня
                            let planValue = 1;
                            let factValue = 0;
                            let percentage = 0;
                            let factDisplay = '-';
                            let planDisplay = '-';
                            
                            // Проверяем что привычка была активна в этот день
                            const habitCreated = new Date(selectedHabitData.createdAt);
                            const currentDate = new Date(dayDate.date);
                            const habitCreatedDate = new Date(habitCreated.getFullYear(), habitCreated.getMonth(), habitCreated.getDate());
                            const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                            
                            // Если привычка еще не была создана на эту дату - не показываем план
                            if (habitCreatedDate > currentDateOnly) {
                              planDisplay = 'Не создана';
                              factDisplay = '-';
                              percentage = 0;
                            } 
                            // Если привычка была архивирована до этой даты - не показываем план
                            else if (selectedHabitData.isArchived && selectedHabitData.archivedAt) {
                              const archivedDate = new Date(selectedHabitData.archivedAt);
                              const archivedDateOnly = new Date(archivedDate.getFullYear(), archivedDate.getMonth(), archivedDate.getDate());
                              if (archivedDateOnly < currentDateOnly) {
                                planDisplay = 'Архивирована';
                                factDisplay = '-';
                                percentage = 0;
                              }
                            } else {
                              // Привычка была активна в этот день - показываем нормальный план/факт
                              if (selectedHabitData.type === 'boolean') {
                                planValue = 1;
                                planDisplay = 'Выполнить';
                                if (completion === true) {
                                  factValue = 1;
                                  factDisplay = '✓';
                                  percentage = 100;
                                } else {
                                  factDisplay = '✗';
                                  percentage = 0;
                                }
                              } else if (selectedHabitData.type === 'weight') {
                                planValue = 1;
                                planDisplay = 'Записать';
                                if (typeof completion === 'object' && completion.weight && completion.weight > 0) {
                                  factValue = 1;
                                  factDisplay = `${completion.weight.toFixed(1)} кг`;
                                  percentage = 100;
                                } else {
                                  factDisplay = 'Не записан';
                                  percentage = 0;
                                }
                              } else if (selectedHabitData.type === 'number') {
                                planValue = selectedHabitData.targetValue || 1;
                                planDisplay = `${planValue} ${translateUnit(selectedHabitData.unit, planValue)}`;
                                if (completion && completion.value && completion.value > 0) {
                                  factValue = completion.value;
                                  factDisplay = `${factValue} ${translateUnit(selectedHabitData.unit, factValue)}`;
                                  percentage = Math.round((factValue / planValue) * 100);
                                } else {
                                  factDisplay = '0';
                                  percentage = 0;
                                }
                              }
                            }

                            const percentageColor = percentage === 100 ? colors.success :
                                                  percentage >= 50 ? colors.warning :
                                                  percentage > 0 ? colors.error : colors.textSecondary;

                            return (
                              <View key={index} style={[styles.dailyStatsRow, { borderBottomColor: colors.border }]}>
                                <View style={[styles.dailyStatsCell, { flex: 1 }]}>
                                  <Text style={[
                                    styles.dailyStatsDayText,
                                    { 
                                      color: dayDate.isToday ? colors.primary : colors.text,
                                      fontWeight: dayDate.isToday ? 'bold' : '600'
                                    }
                                  ]}>
                                    {dayDate.day}
                                  </Text>
                                </View>
                                
                                <View style={[styles.dailyStatsCell, { flex: 1.5 }]}>
                                  <Text style={[
                                    styles.dailyStatsText,
                                    { 
                                      color: colors.textSecondary,
                                      fontWeight: 'normal'
                                    }
                                  ]} numberOfLines={2}>
                                    {planDisplay}
                                  </Text>
                                </View>
                                
                                <View style={[styles.dailyStatsCell, { flex: 1.5 }]}>
                                  <Text style={[
                                    styles.dailyStatsText,
                                    { 
                                      color: factValue > 0 ? colors.text : colors.textSecondary,
                                      fontWeight: factValue > 0 ? '600' : 'normal'
                                    }
                                  ]} numberOfLines={2}>
                                    {factDisplay}
                                  </Text>
                                </View>
                                
                                <View style={[styles.dailyStatsCell, { flex: 1 }]}>
                                  <Text style={[
                                    styles.dailyStatsPercentage,
                                    { 
                                      color: percentageColor,
                                      fontWeight: 'bold'
                                    }
                                  ]}>
                                    {percentage}%
                                  </Text>
                                </View>
                              </View>
                            );
                          });
                        })()}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* СЕКЦИЯ 3: Подробная информация о привычке */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => toggleSection('info')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                        📋 Информация о привычке
                      </Text>
                      <Ionicons 
                        name={expandedSections.info ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {expandedSections.info && (
                    <View style={styles.habitInfoGrid}>
                      <View style={styles.habitInfoRow}>
                        <Text style={[styles.habitInfoLabel, { color: colors.textSecondary }]}>Тип:</Text>
                        <Text style={[styles.habitInfoValue, { color: colors.text }]}>
                          {selectedHabitData.type === 'boolean' ? 'Булевая (да/нет)' :
                           selectedHabitData.type === 'weight' ? 'Вес' : 'Количественная'}
                        </Text>
                      </View>
                      
                      {selectedHabitData.type !== 'boolean' && (
                        <View style={styles.habitInfoRow}>
                          <Text style={[styles.habitInfoLabel, { color: colors.textSecondary }]}>Цель:</Text>
                          <Text style={[styles.habitInfoValue, { color: colors.text }]}>
                            {selectedHabitData.targetValue} {translateUnit(selectedHabitData.unit, selectedHabitData.targetValue)}
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.habitInfoRow}>
                        <Text style={[styles.habitInfoLabel, { color: colors.textSecondary }]}>План/Факт:</Text>
                        <Text style={[styles.habitInfoValue, { color: colors.text }]}>
                          {formatLocalizedValue(selectedHabitData.factValue, selectedHabitData.type, selectedHabitData.unit)} из {formatLocalizedValue(selectedHabitData.planValue, selectedHabitData.type, selectedHabitData.unit)}
                        </Text>
                      </View>
                      
                      <View style={styles.habitInfoRow}>
                        <Text style={[styles.habitInfoLabel, { color: colors.textSecondary }]}>Создана:</Text>
                        <Text style={[styles.habitInfoValue, { color: colors.text }]}>
                          {new Date(selectedHabitData.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* СЕКЦИЯ 4: Анализ и инсайты */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => toggleSection('insights')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                        💡 Анализ выполнения
                      </Text>
                      <Ionicons 
                        name={expandedSections.insights ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {expandedSections.insights && (
                    <View style={styles.insightsContainer}>
                      {selectedHabitData.percentage >= 90 && (
                        <View style={[styles.insightItem, { backgroundColor: colors.success + '20' }]}>
                          <Text style={styles.insightIcon}>🎉</Text>
                          <Text style={[styles.insightText, { color: colors.text }]}>
                            Отличный результат! Вы почти идеально следуете этой привычке.
                          </Text>
                        </View>
                      )}
                      
                      {selectedHabitData.percentage >= 70 && selectedHabitData.percentage < 90 && (
                        <View style={[styles.insightItem, { backgroundColor: colors.warning + '20' }]}>
                          <Text style={styles.insightIcon}>👍</Text>
                          <Text style={[styles.insightText, { color: colors.text }]}>
                            Хороший прогресс! Немного больше последовательности - и результат будет отличным.
                          </Text>
                        </View>
                      )}
                      
                      {selectedHabitData.percentage < 70 && (
                        <View style={[styles.insightItem, { backgroundColor: colors.error + '20' }]}>
                          <Text style={styles.insightIcon}>💪</Text>
                          <Text style={[styles.insightText, { color: colors.text }]}>
                            Есть потенциал для улучшения. Попробуйте начать с малого и постепенно увеличивать нагрузку.
                          </Text>
                        </View>
                      )}
                      
                      {selectedHabitData.streak >= 7 && (
                        <View style={[styles.insightItem, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={styles.insightIcon}>🔥</Text>
                          <Text style={[styles.insightText, { color: colors.text }]}>
                            У вас серия в {selectedHabitData.streak} дней! Продолжайте в том же духе.
                          </Text>
                        </View>
                      )}
                      
                      {selectedHabitData.factValue > selectedHabitData.planValue && (
                        <View style={[styles.insightItem, { backgroundColor: colors.success + '20' }]}>
                          <Text style={styles.insightIcon}>🚀</Text>
                          <Text style={[styles.insightText, { color: colors.text }]}>
                            {selectedHabitData.type === 'boolean' ? 
                              'Вы выполняете эту привычку стабильно!' :
                              selectedHabitData.factValue > selectedHabitData.planValue ?
                              `Цель перевыполнена на ${Math.round(((selectedHabitData.factValue - selectedHabitData.planValue) / selectedHabitData.planValue) * 100)}%!` :
                             `До цели осталось ${selectedHabitData.planValue - selectedHabitData.factValue} ${translateUnit(selectedHabitData.unit, selectedHabitData.planValue - selectedHabitData.factValue)}.`}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Отступ снизу для комфортного скролла */}
                <View style={styles.modalBottomSpace} />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // === ОСНОВНОЙ РЕНДЕР ===
  return (
    <View style={styles.container}>
      {renderMonthView()}
      {renderDayDetailsModal()}
      {renderHabitDetailsModal()}
    </View>
  );
};

// === ПОЛНЫЕ СТИЛИ ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // === МЕСЯЧНЫЙ КОНТЕЙНЕР ===
  monthContainer: {
    flex: 1,
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },

  // === ОБЩИЙ КАЛЕНДАРЬ МЕСЯЦА С ИТОГАМИ ===
  monthSummaryContainer: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },

  monthSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },

  monthSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  monthSummaryCalendar: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },

  summaryWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },

  summaryDayHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0.5,
  },

  summaryWeekdayText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  summaryWeekRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },

  summaryDayColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0.5,
  },

  summaryDayCell: {
    width: '95%',
    minHeight: 32,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },

  summaryDayNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 1,
  },

  summaryDayStats: {
    fontSize: 9,
    fontWeight: 'bold',
  },

  summaryLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },

  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },

  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },

  monthDivider: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  monthDividerText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // === ГРУППЫ ПРИВЫЧЕК ===
  groupHeader: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.xs,
    borderLeftWidth: 4,
  },

  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // === КАРТОЧКИ ПРИВЫЧЕК МЕСЯЦА ===
  monthHabitCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  monthHabitHeader: {
    flexDirection: 'column',
  },

  monthHabitInfo: {
    flex: 1,
  },

  monthHabitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },

  monthHabitIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },

  monthHabitName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  monthHabitStats: {
    marginTop: SPACING.xs,
  },

  monthHabitStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xs,
  },

  monthHabitStatItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: SPACING.xs,
    minHeight: 45,
    justifyContent: 'center',
  },

  monthHabitStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 12,
  },

  monthHabitStatValue: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },

  monthHabitSeparator: {
    width: 1,
    height: 35,
    marginHorizontal: SPACING.xs,
    opacity: 0.3,
  },

  // === ПУСТОЕ СОСТОЯНИЕ ===
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },

  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // === МОДАЛЬНЫЕ ОКНА ===
  modalFullOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  modalFullContainer: {
    flex: 1,
    marginTop: 40, // Отступ от статус бара
  },

  modalFixedHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    minHeight: 80,
    position: 'relative',
  },

  modalCloseBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // ✅ ИСПРАВЛЕНИЕ 1: Центрирование заголовка модального окна дня
  dayModalHeaderContent: {
    alignItems: 'center', // Центрируем по горизонтали
    justifyContent: 'center', // Центрируем по вертикали
    paddingTop: SPACING.sm,
    paddingHorizontal: 60, // Отступы с обеих сторон для кнопки закрытия
  },

  habitModalHeaderContent: {
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginRight: 60, // Место для кнопки закрытия
    paddingVertical: SPACING.sm,
  },

  modalTableHeader: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },

  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
    textAlign: 'center', // Центрируем заголовок
  },

  modalTodayBadge: {
    alignSelf: 'center', // Центрируем badge
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },

  modalTodayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center', // Центрируем строку статистики
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md, // Добавляем промежуток между элементами
  },

  modalStatsLabel: {
    fontSize: 16,
    fontWeight: '600',
  },

  modalStatsValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  modalHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  modalScrollableContent: {
    flex: 1,
  },

  modalScrollPadding: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  // ✅ ИСПРАВЛЕНИЕ 2 и 3: Улучшенная структура строки привычки
  modalHabitRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.xs,
    marginVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    borderBottomWidth: 1,
    minHeight: 50, // Минимальная высота для удобства
  },

  modalHabitCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },

  modalHabitIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
    marginTop: 2, // Небольшой отступ сверху для выравнивания с текстом
  },

  modalHabitNameContainer: {
    flex: 1,
    justifyContent: 'flex-start', // Выравниваем текст по верху
  },

  modalHabitName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
    lineHeight: 18, // Улучшаем читаемость при переносе
  },

  modalArchivedNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },

  modalCellText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },

  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },

  modalEmptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },

  modalEmptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: SPACING.lg,
  },

  modalBottomSpace: {
    height: SPACING.xxxl,
  },

  // === МОДАЛЬНОЕ ОКНО ДЕТАЛЬНОГО ОТЧЕТА ПРИВЫЧКИ ===
  habitModalIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },

  archivedBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.sm,
    alignSelf: 'center',
  },

  archivedText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },

  modalSection: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.xs,
  },

  // === РАСКРЫВАЮЩИЕСЯ СЕКЦИИ ===
  sectionHeader: {
    marginBottom: SPACING.md,
  },

  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
  },

  modalStatsContainer: {
    marginTop: SPACING.sm,
  },

  modalStatsSeparator: {
    height: 1,
    marginVertical: SPACING.md,
    opacity: 0.3,
  },

  modalStatItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: SPACING.xs,
  },

  modalStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },

  modalStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },

  // === ЕЖЕДНЕВНЫЕ ИТОГИ ===
  dailyStatsContainer: {
    marginTop: SPACING.sm,
  },

  dailyStatsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },

  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },

  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },

  dailyStatsHeader: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },

  dailyStatsHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  dailyStatsList: {
    maxHeight: 280,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },

  dailyStatsRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 0.5,
    minHeight: 50,
    alignItems: 'center',
  },

  dailyStatsCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },

  dailyStatsDayText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },

  dailyStatsText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  dailyStatsPercentage: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  // === ДОПОЛНИТЕЛЬНЫЕ ЭЛЕМЕНТЫ МОДАЛЬНОГО ОКНА ПРИВЫЧКИ ===
  habitInfoGrid: {
    gap: SPACING.md,
  },

  habitInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },

  habitInfoLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },

  habitInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },

  insightsContainer: {
    gap: SPACING.md,
  },

  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },

  insightIcon: {
    fontSize: 24,
  },

  insightText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
});

export default MonthStatistics;