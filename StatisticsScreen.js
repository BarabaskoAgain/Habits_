// ====================================
// КОНТЕЙНЕР СТАТИСТИКИ - ОБЩИЕ ФУНКЦИИ И ПЕРЕКЛЮЧЕНИЕ
// StatisticsScreen.js - ГЛАВНЫЙ КОМПОНЕНТ (ИСПРАВЛЕННЫЙ РАСЧЕТ ПЛАНОВ)
// ====================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Импорт компонентов статистики
import WeekStatistics from './WeekStatistics';
import MonthStatistics from './MonthStatistics';
import YearStatistics from './YearStatistics';
import { MEASUREMENT_UNITS } from './constants';


import { 
  THEMES, 
  SPACING, 
  BORDER_RADIUS, 
  TYPOGRAPHY,
  WEIGHT_UTILS
} from './constants';
import { 
  dateUtils, 
  statsUtils, 
  formatUtils
} from './utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const StatisticsScreen = ({
  habits = [],
  archivedHabits = [],
  selectedPeriod = 'week',
  onPeriodChange = () => {},
  onHabitToggle = () => {},
  onHabitUpdateValue = () => {},
  theme = 'blue',
  isDarkMode = false
}) => {
  const colors = THEMES[theme][isDarkMode ? 'dark' : 'light'];
  
  // === СОСТОЯНИЕ СЕЛЕКТОРОВ ===
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // === ПЕРИОДЫ ===
  const periods = [
    { id: 'week', label: 'Неделя', icon: 'calendar-outline' },
    { id: 'month', label: 'Месяц', icon: 'calendar' },
    { id: 'year', label: 'Год', icon: 'calendar-sharp' }
  ];

  // === НАЗВАНИЯ МЕСЯЦЕВ ===
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // === ОБЩИЕ УТИЛИТЫ (ПЕРЕДАЮТСЯ В ДОЧЕРНИЕ КОМПОНЕНТЫ) ===
  
  // Функция разделения активных и архивированных привычек для периода
  const getHabitsForPeriod = useCallback((startDate, endDate) => {
    console.log('🔍 StatisticsScreen: getHabitsForPeriod вызвана', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalHabits: habits.length,
      totalArchivedHabits: archivedHabits.length
    });

    // ИСПРАВЛЕННАЯ ЛОГИКА: Фильтруем активные привычки - показываем только те, которые существовали в этом периоде
    const periodActiveHabits = habits.filter(habit => {
      if (!habit.createdAt) return true; // Если нет даты создания, показываем
      
      const createdDate = new Date(habit.createdAt);
      const localCreatedDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
      const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      // Показываем активную привычку если она была создана до конца периода
      return localCreatedDate <= localEndDate;
    });
    
    // Фильтруем архивированные привычки: показываем только те, которые были заархивированы в этом периоде
    const periodArchivedHabits = archivedHabits.filter(habit => {
      if (!habit.archivedAt) return false;
      
      const archivedDate = new Date(habit.archivedAt);
      const localArchivedDate = new Date(archivedDate.getFullYear(), archivedDate.getMonth(), archivedDate.getDate());
      const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      // Показываем архивированную привычку только если она была заархивирована в отображаемом периоде
      return localArchivedDate >= localStartDate && localArchivedDate <= localEndDate;
    });
    
    // Добавляем признак архивированности
    const markedArchivedHabits = periodArchivedHabits.map(habit => ({
      ...habit,
      isArchived: true
    }));
    
    console.log('✅ StatisticsScreen: результат фильтрации', {
      periodActiveHabits: periodActiveHabits.length,
      periodArchivedHabits: markedArchivedHabits.length
    });
    
    return {
      activeHabits: periodActiveHabits,
      archivedHabits: markedArchivedHabits
    };
  }, [habits, archivedHabits]);
  
  // Расчет прогресса дня (используется в оригинальном проекте)
  const calculateDayProgress = useCallback((habits, date) => {
    let completed = 0;
    let total = 0;
    
    habits.forEach(habit => {
      if (habit.isActive === false) return;
      
      total++;
      const completion = habit.completions?.[date];
      
      if (habit.type === 'boolean') {
        if (completion) completed++;
      } else if (habit.type === 'weight') {
        if (completion?.weight) completed++;
      } else if (habit.type === 'number') {
        const value = completion?.value || 0;
        const target = habit.targetValue || 1;
        if (value >= target) completed++;
      }
    });
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, []);

  // Функция расчета среднего веса
  const calculateAverageWeight = useCallback((weightEntries) => {
    if (!weightEntries || weightEntries.length === 0) return 0;
    const validWeights = weightEntries.filter(w => w > 0);
    if (validWeights.length === 0) return 0;
    const sum = validWeights.reduce((acc, weight) => acc + weight, 0);
    return Math.round(sum / validWeights.length * 10) / 10;
  }, []);

  // 🔥 ОБНОВЛЕННАЯ ФУНКЦИЯ С ПОДДЕРЖКОЙ АРХИВНЫХ ДАННЫХ
  const calculatePlanFromCreation = useCallback((habit, startDate, endDate) => {
    try {
      // === ПРОВЕРКА НА ВОССТАНОВЛЕННУЮ ПРИВЫЧКУ ===
      if (habit.isRestored && habit.previousArchiveStats) {
        console.log('📊 Восстановленная привычка:', habit.name);
        console.log('📦 Архивные данные:', habit.previousArchiveStats);
        
        // Для восстановленной привычки рассчитываем план только для нового периода
        const restoredDate = new Date(habit.restoredAt || habit.createdAt);
        const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const localRestoredDate = new Date(restoredDate.getFullYear(), restoredDate.getMonth(), restoredDate.getDate());
        
        // Если восстановление произошло после конца периода, возвращаем 0
        if (localRestoredDate > localEndDate) {
          return 0;
        }
        
        // Определяем начало периода для новых расчетов
        let newPlanStartDate = localRestoredDate >= localStartDate ? localRestoredDate : localStartDate;
        
        // Рассчитываем план для нового периода
        const msPerDay = 1000 * 60 * 60 * 24;
        const totalDays = Math.floor((localEndDate - newPlanStartDate) / msPerDay) + 1;
        
        let newPlan = 0;
        
        if (habit.type === 'boolean') {
          const targetDaysPerWeek = habit.targetDaysPerWeek || 7;
          newPlan = Math.round((totalDays / 7) * targetDaysPerWeek);
        } else if (habit.type === 'weight') {
          newPlan = habit.targetWeight || 70;
        } else if (habit.type === 'number' || habit.type === 'quantitative') {
          const targetDaysPerWeek = habit.targetDaysPerWeek || 7;
          const dailyTarget = habit.targetValue || 1;
          const totalPlanDays = Math.round((totalDays / 7) * targetDaysPerWeek);
          newPlan = dailyTarget * totalPlanDays;
        }
        
        // СУММИРУЕМ С АРХИВНЫМ ПЛАНОМ
        const totalPlan = (habit.previousArchiveStats.totalPlan || 0) + newPlan;
        
        console.log('✅ План для восстановленной привычки:', {
          архивныйПлан: habit.previousArchiveStats.totalPlan,
          новыйПлан: newPlan,
          итоговыйПлан: totalPlan
        });
        
        return totalPlan;
      }
      
      // === СТАНДАРТНЫЙ РАСЧЕТ ДЛЯ ОБЫЧНЫХ ПРИВЫЧЕК ===
      const habitCreated = new Date(habit.createdAt);
      const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const localHabitCreated = new Date(habitCreated.getFullYear(), habitCreated.getMonth(), habitCreated.getDate());
      
      // Определяем период активности привычки
      let planStartDate;
      if (localHabitCreated >= localStartDate && localHabitCreated <= localEndDate) {
        planStartDate = localHabitCreated;
      } else {
        planStartDate = localStartDate;
      }
      
      let planEndDate = localEndDate;
      if (habit.isArchived && habit.archivedAt) {
        const archivedDate = new Date(habit.archivedAt);
        const localArchivedDate = new Date(archivedDate.getFullYear(), archivedDate.getMonth(), archivedDate.getDate());
        planEndDate = localArchivedDate < localEndDate ? localArchivedDate : localEndDate;
      }
      
      // Точный расчет количества дней в периоде (включая оба конца)
      const msPerDay = 1000 * 60 * 60 * 24;
      const totalDays = Math.floor((planEndDate - planStartDate) / msPerDay) + 1;
      
      if (habit.type === 'boolean') {
        const targetDaysPerWeek = habit.targetDaysPerWeek || 7;
        
        // 🎯 ПРОСТАЯ ГЕНИАЛЬНАЯ ФОРМУЛА
        return Math.round((totalDays / 7) * targetDaysPerWeek);
        
      } else if (habit.type === 'weight') {
        return habit.targetWeight || 70;
        
      } else if (habit.type === 'number') {
        const targetDaysPerWeek = habit.targetDaysPerWeek || 7;
        const dailyTarget = habit.targetValue || 1;
        
        // 🎯 АНАЛОГИЧНО ДЛЯ ЧИСЛОВЫХ ПРИВЫЧЕК
        const totalPlanDays = Math.round((totalDays / 7) * targetDaysPerWeek);
        return dailyTarget * totalPlanDays;
      }
      
      return totalDays;
    } catch (error) {
      console.error('Ошибка расчета плана:', error);
      return 0;
    }
  }, []);

  // === НОВАЯ ФУНКЦИЯ ДЛЯ РАСЧЕТА ФАКТА С УЧЕТОМ АРХИВНЫХ ДАННЫХ ===
  const calculateFactFromCreation = useCallback((habit, startDate, endDate) => {
    try {
      let totalFact = 0;
      
      // Сначала считаем текущий факт из completions
      if (habit.completions) {
        const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        Object.entries(habit.completions).forEach(([date, completion]) => {
          const completionDate = new Date(date);
          const localCompletionDate = new Date(completionDate.getFullYear(), completionDate.getMonth(), completionDate.getDate());
          
          // Проверяем, попадает ли дата в период
          if (localCompletionDate >= localStartDate && localCompletionDate <= localEndDate) {
            if (habit.type === 'boolean') {
              if (completion) totalFact++;
            } else if (habit.type === 'weight') {
              if (completion?.weight) totalFact++;
            } else if (habit.type === 'number' || habit.type === 'quantitative') {
              totalFact += completion?.value || 0;
            }
          }
        });
      }
      
      // Если это восстановленная привычка, добавляем архивный факт
      if (habit.isRestored && habit.previousArchiveStats) {
        const archiveFact = habit.previousArchiveStats.totalFact || 0;
        totalFact += archiveFact;
        
        console.log('✅ Факт для восстановленной привычки:', {
          архивныйФакт: archiveFact,
          новыйФакт: totalFact - archiveFact,
          итоговыйФакт: totalFact
        });
      }
      
      return totalFact;
    } catch (error) {
      console.error('Ошибка расчета факта:', error);
      return 0;
    }
  }, []);

  // Расчет итогов дня
  const calculateDayStats = useCallback((date, allHabits) => {
    if (!allHabits || allHabits.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    let completed = 0;
    const total = allHabits.length;

    allHabits.forEach(habit => {
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

  // Получить цвет для итогов дня
  const getDayStatsColor = useCallback((percentage, colors) => {
    if (percentage === 100) return colors.success;
    if (percentage >= 50) return colors.warning;
    if (percentage > 0) return colors.error;
    return colors.surface;
  }, []);

  const getDayCellColor = useCallback((status, habitColor, colors) => {
    switch (status) {
      case 'completed':
        return habitColor + '20';
      case 'partial':
        return colors.warning + '20';
      default:
        return colors.surface;
    }
  }, []);

  const getDayCellTextColor = useCallback((status, colors) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'partial':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  }, []);

  const getFactValueColor = useCallback((factValue, planValue, habitType, colors) => {
    if (habitType === 'weight') {
      return factValue === 0 ? colors.textSecondary : colors.text;
    } else {
      if (factValue === 0) return colors.textSecondary;
      if (factValue >= planValue) return colors.success;
      return colors.error;
    }
  }, []);

  const formatCompactValue = useCallback((value, type, unit) => {
    if (type === 'weight') {
      return value > 0 ? value.toFixed(1) : '0';
    }
    if (value > 999) return '999+';
    if (type === 'boolean') {
      return value.toString();
    }
    if (type === 'number' && unit) {
      return `${value}`;
    }
    return value.toString();
  }, []);

  const formatStatValue = useCallback((value, type, unit) => {
    if (type === 'weight') {
      return value > 0 ? value.toFixed(1) + 'кг' : '0кг';
    } else if (type === 'boolean') {
      return value.toString();
    } else if (type === 'number') {
      return unit ? `${value} ${MEASUREMENT_UNITS[unit]?.shortLabel || unit}` : value.toString();
    }
    return value.toString();
  }, []);

  // === РЕНДЕР СЕЛЕКТОРА ПЕРИОДОВ ===
  const renderPeriodSelector = () => (
    <View style={styles.periodContainer}>
      <View style={styles.periodSelector}>
        {periods.map(period => (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodButton,
              {
                backgroundColor: selectedPeriod === period.id ? colors.primary : colors.surface,
                borderColor: selectedPeriod === period.id ? colors.primary : colors.border,
              }
            ]}
            onPress={() => onPeriodChange(period.id)}
          >
            <Ionicons 
              name={period.icon} 
              size={16} 
              color={selectedPeriod === period.id ? '#ffffff' : colors.text}
              style={{ marginRight: SPACING.xs }}
            />
            <Text style={[
              styles.periodButtonText,
              { color: selectedPeriod === period.id ? '#ffffff' : colors.text }
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // === РЕНДЕР СЕЛЕКТОРА ДАТЫ ===
  const renderDateSelector = () => {
    if (selectedPeriod === 'week') return null;
    
    return (
      <View style={styles.dateSelector}>
        {selectedPeriod === 'month' && (
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowMonthPicker(true)}
          >
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {monthNames[selectedMonth]}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowYearPicker(true)}
        >
          <Text style={[styles.dateButtonText, { color: colors.text }]}>
            {selectedYear}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  // === РЕНДЕР ПИКЕРА МЕСЯЦЕВ ===
  const renderMonthPicker = () => (
    <Modal
      visible={showMonthPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowMonthPicker(false)}
    >
      <View style={[styles.pickerContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[styles.pickerHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
              <Text style={[styles.pickerCancelButton, { color: colors.textSecondary }]}>Отмена</Text>
            </TouchableOpacity>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Выберите месяц</Text>
            <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
              <Text style={[styles.pickerDoneButton, { color: colors.primary }]}>Готово</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.pickerContent, { backgroundColor: colors.background }]}>
            {monthNames.map((month, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pickerItem,
                  {
                    backgroundColor: selectedMonth === index ? colors.primary + '15' : 'transparent',
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setSelectedMonth(index)}
              >
                <Text style={[
                  styles.pickerItemText,
                  { color: selectedMonth === index ? colors.primary : colors.text }
                ]}>
                  {month}
                </Text>
                {selectedMonth === index && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );

  // === РЕНДЕР ПИКЕРА ГОДОВ ===
  const renderYearPicker = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
    
    return (
      <Modal
        visible={showYearPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <View style={[styles.pickerContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <SafeAreaView style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.pickerHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Text style={[styles.pickerCancelButton, { color: colors.textSecondary }]}>Отмена</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Выберите год</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Text style={[styles.pickerDoneButton, { color: colors.primary }]}>Готово</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.pickerContent, { backgroundColor: colors.background }]}>
              {years.map(year => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.pickerItem,
                    {
                      backgroundColor: selectedYear === year ? colors.primary + '15' : 'transparent',
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    { color: selectedYear === year ? colors.primary : colors.text }
                  ]}>
                    {year}
                  </Text>
                  {selectedYear === year && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  // === РЕНДЕР ПУСТОГО СОСТОЯНИЯ ===
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Нет данных для статистики
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Создайте привычки и начните их выполнять, чтобы увидеть статистику
      </Text>
    </View>
  );

  // === ОСНОВНОЙ РЕНДЕР ===
  const weekPeriod = useMemo(() => {
  const weekStart = new Date(dateUtils.getCurrentWeekStart());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { weekStart, weekEnd };
}, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderPeriodSelector()}
      {renderDateSelector()}
      
      {(habits.length > 0 || archivedHabits.length > 0) ? (
        <>
          {/* ПЕРЕКЛЮЧЕНИЕ МЕЖДУ КОМПОНЕНТАМИ */}
          
          {selectedPeriod === 'week' && (
  <WeekStatistics
    habitsData={getHabitsForPeriod(weekPeriod.weekStart, weekPeriod.weekEnd)}

              onHabitToggle={onHabitToggle}
              onHabitUpdateValue={onHabitUpdateValue}
              theme={theme}
              isDarkMode={isDarkMode}
              // Передаем общие функции
              calculateAverageWeight={calculateAverageWeight}
              calculatePlanFromCreation={calculatePlanFromCreation}
              calculateFactFromCreation={calculateFactFromCreation}  // НОВОЕ: передаем функцию расчета факта
              calculateDayStats={calculateDayStats}
              getDayStatsColor={getDayStatsColor}
              getDayCellColor={getDayCellColor}
              getDayCellTextColor={getDayCellTextColor}
              getFactValueColor={getFactValueColor}
              formatCompactValue={formatCompactValue}
              formatStatValue={formatStatValue}
            />
          )}
          
          {selectedPeriod === 'month' && (
            <MonthStatistics
              habitsData={getHabitsForPeriod(
                new Date(selectedYear, selectedMonth, 1),
                new Date(selectedYear, selectedMonth + 1, 0)
              )}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onHabitToggle={onHabitToggle}
              onHabitUpdateValue={onHabitUpdateValue}
              theme={theme}
              isDarkMode={isDarkMode}
              monthNames={monthNames}
              // Передаем общие функции
              calculateAverageWeight={calculateAverageWeight}
              calculatePlanFromCreation={calculatePlanFromCreation}
              calculateFactFromCreation={calculateFactFromCreation}  // НОВОЕ: передаем функцию расчета факта
              calculateDayStats={calculateDayStats}
              getDayStatsColor={getDayStatsColor}
              getDayCellColor={getDayCellColor}
              getDayCellTextColor={getDayCellTextColor}
              getFactValueColor={getFactValueColor}
              formatCompactValue={formatCompactValue}
              formatStatValue={formatStatValue}
            />
          )}
          
          {selectedPeriod === 'year' && (
            <YearStatistics
              habitsData={getHabitsForPeriod(
                new Date(selectedYear, 0, 1),
                new Date(selectedYear, 11, 31)
              )}
              selectedYear={selectedYear}
              onHabitToggle={onHabitToggle}
              onHabitUpdateValue={onHabitUpdateValue}
              theme={theme}
              isDarkMode={isDarkMode}
              // Передаем общие функции
              calculateAverageWeight={calculateAverageWeight}
              calculatePlanFromCreation={calculatePlanFromCreation}
              calculateFactFromCreation={calculateFactFromCreation}  // НОВОЕ: передаем функцию расчета факта
              calculateDayStats={calculateDayStats}
              getDayStatsColor={getDayStatsColor}
              getDayCellColor={getDayCellColor}
              getDayCellTextColor={getDayCellTextColor}
              getFactValueColor={getFactValueColor}
              formatCompactValue={formatCompactValue}
              formatStatValue={formatStatValue}
            />
          )}
        </>
      ) : (
        renderEmptyState()
      )}
      
      {renderMonthPicker()}
      {renderYearPicker()}
    </View>
  );
};

// === СТИЛИ ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  
  // === СЕЛЕКТОР ПЕРИОДА ===
  periodContainer: {
    marginBottom: SPACING.md,
  },

  periodSelector: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  
  periodButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // === СЕЛЕКТОР ДАТЫ ===
  dateSelector: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    justifyContent: 'center',
  },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },

  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // === ПИКЕРЫ ===
  pickerContainer: {
    flex: 1,
  },

  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },

  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  pickerCancelButton: {
    fontSize: 16,
  },

  pickerDoneButton: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  pickerContent: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },

  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.xs,
    borderBottomWidth: 0.5,
  },

  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // === ПУСТОЕ СОСТОЯНИЕ ===
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.lg,
  },
});

export default StatisticsScreen;