// ====================================
// НОВАЯ ГОДОВАЯ СТАТИСТИКА - DASHBOARD КОНЦЕПЦИЯ
// YearStatistics.js - В СТИЛЕ MonthStatistics
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
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { THEMES, SPACING, BORDER_RADIUS, TYPOGRAPHY, HABIT_CATEGORIES, MEASUREMENT_UNITS } from './constants';
import { dateUtils, statsUtils } from './utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const YearStatistics = ({
  habitsData = { activeHabits: [], archivedHabits: [] },
  selectedYear,
  onHabitToggle = () => {},
  onHabitUpdateValue = () => {},
  theme = 'blue',
  isDarkMode = false,
  // Общие функции от родителя
  calculateAverageWeight,
  calculatePlanFromCreation,
  calculateFactFromCreation,
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
  
  // === HELPER: Проверка выполнения привычки ===
  const isHabitCompleted = useCallback((habit, completion) => {
    if (!completion) return false;
    
    if (habit.type === 'boolean') {
      return completion === true;
    } else if (habit.type === 'weight') {
      return completion && typeof completion === 'object' && completion.weight > 0;
    } else if (habit.type === 'number' || habit.type === 'quantitative') {
      return completion && completion.completed;
    }
    return false;
  }, []);
  
  // === HELPER: Получение значения выполнения ===
  const getCompletionValue = useCallback((habit, completion) => {
    if (!completion) return 0;
    
    if (habit.type === 'boolean') {
      return completion === true ? 1 : 0;
    } else if (habit.type === 'weight') {
      return (completion && typeof completion === 'object' && completion.weight) || 0;
    } else if (habit.type === 'number' || habit.type === 'quantitative') {
      return (completion && completion.value) || 0;
    }
    return 0;
  }, []);
  
  // === СОСТОЯНИЕ ДЛЯ МОДАЛЬНЫХ ОКОН ===
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [showQuarterModal, setShowQuarterModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  
  // === НОВОЕ: СОСТОЯНИЕ ДЛЯ РАСКРЫВАЮЩИХСЯ СЕКЦИЙ ===
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    quarters: false,
    achievements: false,
    months: false
  });

  // === НАЗВАНИЯ МЕСЯЦЕВ ===
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const shortMonthNames = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];

  // === ФУНКЦИЯ ПЕРЕВОДА ЕДИНИЦ ===
  const translateUnit = useCallback((unit, value) => {
    const unitTranslations = {
      'minutes': value === 1 ? 'минута' : value < 5 ? 'минуты' : 'минут',
      'hours': value === 1 ? 'час' : value < 5 ? 'часа' : 'часов',
      'times': 'раз',
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
    return unitTranslations[unit?.toLowerCase()] || unit;
  }, []);

  // === ФУНКЦИЯ ФОРМАТИРОВАНИЯ ЗНАЧЕНИЙ ===
  const formatLocalizedValue = useCallback((value, type, unit) => {
    if (type === 'boolean') {
      return value ? 'Да' : 'Нет';
    }
    
    if (type === 'weight') {
      return typeof value === 'object' && value.weight ? 
        `${value.weight.toFixed(1)} кг` : 
        typeof value === 'number' ? `${value.toFixed(1)} кг` : '0 кг';
    }
    
    if (type === 'number' || type === 'quantitative') {
      const translatedUnit = translateUnit(unit, value);
      return `${value}${translatedUnit ? ' ' + translatedUnit : ''}`;
    }
    
    return value.toString();
  }, [translateUnit]);

  // === НОВАЯ ФУНКЦИЯ: ПЕРЕКЛЮЧЕНИЕ СЕКЦИЙ ===
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // === 1. ГОДОВАЯ СВОДКА ===
  const yearSummary = useMemo(() => {
    if (!allHabits || allHabits.length === 0) return {
      totalHabits: 0,
      totalPlan: 0,
      totalFact: 0,
      successRate: 0,
      maxStreak: 0,
      totalActiveDays: 0
    };

    let totalCompletedActions = 0;
    let totalPossibleActions = 0;
    let maxStreak = 0;
    let totalActiveDays = 0;

    allHabits.forEach(habit => {
      const completions = habit.completions || {};
      let habitMaxStreak = 0;
      let currentStreak = 0;
      let habitActiveDays = 0;

      // Подсчитываем за весь год
      for (let month = 0; month < 12; month++) {
        const monthEnd = new Date(selectedYear, month + 1, 0);
        for (let day = 1; day <= monthEnd.getDate(); day++) {
          const date = dateUtils.formatDateLocal(new Date(selectedYear, month, day));
          const dateObj = new Date(date);
          
          // Проверяем активность привычки на эту дату
          const habitCreated = new Date(habit.createdAt);
          const habitArchived = habit.archivedAt ? new Date(habit.archivedAt) : null;
          
          if (dateObj >= habitCreated && (!habitArchived || dateObj <= habitArchived)) {
            totalPossibleActions++;
            habitActiveDays++;
            
            const completion = completions[date];
            const isCompleted = isHabitCompleted(habit, completion);
            
            if (isCompleted) {
              totalCompletedActions++;
              currentStreak++;
              habitMaxStreak = Math.max(habitMaxStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          }
        }
      }
      
      maxStreak = Math.max(maxStreak, habitMaxStreak);
      totalActiveDays = Math.max(totalActiveDays, habitActiveDays);
    });

    const successRate = totalPossibleActions > 0 ? 
      Math.round((totalCompletedActions / totalPossibleActions) * 100) : 0;

    return {
      totalHabits: allHabits.length,
      totalPlan: totalPossibleActions,
      totalFact: totalCompletedActions,
      successRate,
      maxStreak,
      totalActiveDays
    };
  }, [allHabits, selectedYear]);

  // === 2. СТАТИСТИКА ПО КВАРТАЛАМ ===
  const quarterlyStats = useMemo(() => {
    const quarters = [
      { name: 'Q1', emoji: '🌱', months: [0, 1, 2], color: colors.success },
      { name: 'Q2', emoji: '☀️', months: [3, 4, 5], color: colors.warning },
      { name: 'Q3', emoji: '🍂', months: [6, 7, 8], color: colors.error },
      { name: 'Q4', emoji: '❄️', months: [9, 10, 11], color: colors.primary }
    ];

    return quarters.map((quarter, qIndex) => {
      let quarterFact = 0;
      let quarterPlan = 0;
      let quarterActiveDays = 0;

      allHabits.forEach(habit => {
        const completions = habit.completions || {};
        
        quarter.months.forEach(month => {
          const monthEnd = new Date(selectedYear, month + 1, 0);
          for (let day = 1; day <= monthEnd.getDate(); day++) {
            const date = dateUtils.formatDateLocal(new Date(selectedYear, month, day));
            const dateObj = new Date(date);
            
            const habitCreated = new Date(habit.createdAt);
            const habitArchived = habit.archivedAt ? new Date(habit.archivedAt) : null;
            
            if (dateObj >= habitCreated && (!habitArchived || dateObj <= habitArchived)) {
              quarterPlan++;
              quarterActiveDays++;
              
              const completion = completions[date];
              const isCompleted = isHabitCompleted(habit, completion);
              
              if (isCompleted) quarterFact++;
            }
          }
        });
      });

      const percentage = quarterPlan > 0 ? Math.round((quarterFact / quarterPlan) * 100) : 0;
      
      return {
        ...quarter,
        qIndex,
        percentage,
        fact: quarterFact,
        plan: quarterPlan,
        activeDays: quarterActiveDays
      };
    });
  }, [allHabits, selectedYear, colors]);

  // === 3. МЕСЯЧНАЯ СТАТИСТИКА ===
  const monthlyStats = useMemo(() => {
    return monthNames.map((monthName, month) => {
      let monthFact = 0;
      let monthPlan = 0;
      let monthActiveDays = 0;

      allHabits.forEach(habit => {
        const completions = habit.completions || {};
        const monthEnd = new Date(selectedYear, month + 1, 0);
        
        for (let day = 1; day <= monthEnd.getDate(); day++) {
          const date = dateUtils.formatDateLocal(new Date(selectedYear, month, day));
          const dateObj = new Date(date);
          
          const habitCreated = new Date(habit.createdAt);
          const habitArchived = habit.archivedAt ? new Date(habit.archivedAt) : null;
          
          if (dateObj >= habitCreated && (!habitArchived || dateObj <= habitArchived)) {
            monthPlan++;
            monthActiveDays++;
            
            const completion = completions[date];
            const isCompleted = isHabitCompleted(habit, completion);
            
            if (isCompleted) monthFact++;
          }
        }
      });

      const percentage = monthPlan > 0 ? Math.round((monthFact / monthPlan) * 100) : 0;
      
      return {
        month,
        monthName,
        shortName: shortMonthNames[month],
        percentage,
        fact: monthFact,
        plan: monthPlan,
        activeDays: monthActiveDays
      };
    });
  }, [allHabits, selectedYear, monthNames, shortMonthNames]);

  // === 4. СТАТИСТИКА ПО ПРИВЫЧКАМ ===
  const habitsYearStats = useMemo(() => {
    return allHabits.map(habit => {
      const completions = habit.completions || {};
      let yearFact = 0;
      let yearPlan = 0;
      let completedDays = 0;
      let maxStreak = 0;
      let currentStreak = 0;
      let monthlyData = [];

      // Считаем за весь год и собираем данные по месяцам
      for (let month = 0; month < 12; month++) {
        const monthEnd = new Date(selectedYear, month + 1, 0);
        let monthFact = 0;
        let monthPlan = 0;
        
        for (let day = 1; day <= monthEnd.getDate(); day++) {
          const date = dateUtils.formatDateLocal(new Date(selectedYear, month, day));
          const dateObj = new Date(date);
          
          const habitCreated = new Date(habit.createdAt);
          const habitArchived = habit.archivedAt ? new Date(habit.archivedAt) : null;
          
          if (dateObj >= habitCreated && (!habitArchived || dateObj <= habitArchived)) {
            yearPlan++;
            monthPlan++;
            
            const completion = completions[date];
            const isCompleted = isHabitCompleted(habit, completion);
            const value = getCompletionValue(habit, completion);
            
            if (habit.type === 'boolean' || habit.type === 'weight') {
              if (isCompleted) {
                yearFact++;
                monthFact++;
              }
            } else if (habit.type === 'number' || habit.type === 'quantitative') {
              yearFact += value;
              monthFact += value;
            }
            
            if (isCompleted) {
              completedDays++;
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          }
        }
        
        monthlyData.push({
          month,
          fact: monthFact,
          plan: monthPlan,
          percentage: monthPlan > 0 ? Math.round((monthFact / monthPlan) * 100) : 0
        });
      }

      const percentage = yearPlan > 0 ? Math.round((yearFact / yearPlan) * 100) : 0;

      return {
        ...habit,
        yearFact,
        yearPlan,
        percentage,
        completedDays,
        maxStreak,
        monthlyData,
        isArchived: habit.isArchived || false
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [allHabits, selectedYear]);

  // === ОБРАБОТЧИКИ НАЖАТИЙ ===
  const handleQuarterPress = useCallback((quarter) => {
    setSelectedQuarter(quarter);
    setShowQuarterModal(true);
  }, []);

  const handleMonthPress = useCallback((month) => {
    setSelectedMonth(month);
    setShowMonthModal(true);
  }, []);

  const handleHabitPress = useCallback((habit) => {
    setSelectedHabit(habit);
    setShowHabitModal(true);
  }, []);

  // === РЕНДЕР ГОДОВОЙ СВОДКИ ===
  const renderYearSummary = () => (
    <View style={[styles.yearSummaryContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.yearSummaryHeader}>
        <Text style={[styles.yearSummaryTitle, { color: colors.text }]}>
          🎯 {selectedYear} ГОД В ОБЗОРЕ
        </Text>
      </View>
      
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.success }]}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {yearSummary.successRate}%
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            Общий успех
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            🔥{yearSummary.maxStreak}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            Лучшая серия
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.warning }]}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {yearSummary.totalHabits}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            Привычек всего
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.error }]}>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            {yearSummary.totalFact}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            Дней выполнено
          </Text>
        </View>
      </View>
    </View>
  );

  // === РЕНДЕР КВАРТАЛОВ ===
  const renderQuarters = () => (
    <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        📊 Кварталы {selectedYear}
      </Text>
      
      <View style={styles.quartersGrid}>
        {quarterlyStats.map((quarter, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.quarterCard, { backgroundColor: colors.card, borderColor: quarter.color }]}
            onPress={() => handleQuarterPress(quarter)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Квартал ${quarter.name}, выполнено ${quarter.percentage} процентов`}
          >
            <Text style={styles.quarterEmoji}>{quarter.emoji}</Text>
            <Text style={[styles.quarterName, { color: colors.text }]}>{quarter.name}</Text>
            <Text style={[styles.quarterPercent, { color: quarter.color }]}>
              {quarter.percentage}%
            </Text>
            <Text style={[styles.quarterDays, { color: colors.textSecondary }]}>
              {quarter.activeDays} дн
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // === РЕНДЕР ТЕПЛОВОЙ КАРТЫ МЕСЯЦЕВ ===
  const renderMonthlyHeatmap = () => {
    const getHeatmapColor = (percentage) => {
      if (percentage >= 90) return colors.success;
      if (percentage >= 70) return colors.warning;
      if (percentage >= 50) return '#FF6B35';
      if (percentage >= 30) return colors.error;
      return colors.textSecondary;
    };

    return (
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🗓️ Тепловая карта года
        </Text>
        
        <View style={styles.heatmapContainer}>
          {monthlyStats.map((month, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.monthHeatCell,
                {
                  backgroundColor: getHeatmapColor(month.percentage) + '20',
                  borderColor: getHeatmapColor(month.percentage)
                }
              ]}
              onPress={() => handleMonthPress(month)}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthHeatName, { color: colors.text }]}>
                {month.shortName}
              </Text>
              <Text style={[styles.monthHeatPercent, { color: getHeatmapColor(month.percentage) }]}>
                {month.percentage}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // === РЕНДЕР ТОП ПРИВЫЧЕК ===
  const renderTopHabits = () => {
    const topHabits = habitsYearStats.slice(0, 5);

    return (
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🏆 Топ привычек года
        </Text>
        
        {topHabits.map((habit, index) => (
          <TouchableOpacity
            key={habit.id}
            style={[
              styles.habitYearCard,
              {
                backgroundColor: colors.card,
                borderColor: habit.isArchived ? colors.textSecondary : colors.border
              }
            ]}
            onPress={() => handleHabitPress(habit)}
            activeOpacity={0.7}
          >
            <View style={styles.habitYearHeader}>
              <View style={styles.habitYearInfo}>
                <Text style={styles.habitYearEmoji}>{habit.icon}</Text>
                <View style={styles.habitYearDetails}>
                  <Text style={[styles.habitYearName, { color: colors.text }]}>
                    {habit.name}
                  </Text>
                  <Text style={[styles.habitYearStats, { color: colors.textSecondary }]}>
                    {formatLocalizedValue(habit.yearFact, habit.type, habit.unit)} • {habit.completedDays} дней
                  </Text>
                </View>
              </View>
              
              <View style={styles.habitYearPercent}>
                <Text style={[
                  styles.habitPercentValue,
                  {
                    color: habit.percentage === 100 ? colors.success :
                           habit.percentage >= 80 ? colors.success :
                           habit.percentage >= 60 ? colors.warning :
                           habit.percentage >= 40 ? colors.error : colors.textSecondary
                  }
                ]}>
                  {habit.percentage}%
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // === НОВЫЙ РАСШИРЕННЫЙ МОДАЛ КВАРТАЛА ===
  const renderQuarterModal = () => (
    <Modal
      visible={showQuarterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowQuarterModal(false)}
    >
      <View style={styles.modalFullOverlay}>
        <View style={[styles.modalFullContainer, { backgroundColor: colors.card }]}>
          {/* ЗАГОЛОВОК */}
          <View style={[styles.modalFixedHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.error }]}
              onPress={() => setShowQuarterModal(false)}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            {selectedQuarter && (
              <View style={styles.modalHeaderContent}>
                <Text style={styles.quarterModalEmoji}>{selectedQuarter.emoji}</Text>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                  {selectedQuarter.name} • {selectedYear}
                </Text>
                <View style={[styles.modalBadge, { backgroundColor: selectedQuarter.color }]}>
                  <Text style={styles.modalBadgeText}>{selectedQuarter.percentage}%</Text>
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
            {selectedQuarter && (
              <>
                {/* Основная статистика */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStatItem}>
                      <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                        📊 Выполнено
                      </Text>
                      <Text style={[styles.modalStatValue, { color: colors.success }]}>
                        {selectedQuarter.fact}
                      </Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                        🎯 План
                      </Text>
                      <Text style={[styles.modalStatValue, { color: colors.primary }]}>
                        {selectedQuarter.plan}
                      </Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                        📅 Активных дней
                      </Text>
                      <Text style={[styles.modalStatValue, { color: colors.warning }]}>
                        {selectedQuarter.activeDays}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Детализация по месяцам */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                    📅 Разбивка по месяцам
                  </Text>
                  
                  {selectedQuarter.months.map(monthIndex => {
                    const monthData = monthlyStats[monthIndex];
                    return (
                      <TouchableOpacity
                        key={monthIndex}
                        style={[styles.monthDetailRow, { backgroundColor: colors.card }]}
                        onPress={() => {
                          setShowQuarterModal(false);
                          handleMonthPress(monthData);
                        }}
                      >
                        <Text style={[styles.monthDetailName, { color: colors.text }]}>
                          {monthData.monthName}
                        </Text>
                        <View style={styles.monthDetailStats}>
                          <Text style={[styles.monthDetailValue, { color: colors.textSecondary }]}>
                            {monthData.fact}/{monthData.plan}
                          </Text>
                          <Text style={[
                            styles.monthDetailPercent,
                            {
                              color: monthData.percentage >= 80 ? colors.success :
                                     monthData.percentage >= 60 ? colors.warning :
                                     monthData.percentage >= 40 ? colors.error : colors.textSecondary
                            }
                          ]}>
                            {monthData.percentage}%
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Топ привычки квартала */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                    🏆 Лучшие привычки квартала
                  </Text>
                  
                  {habitsYearStats.slice(0, 3).map(habit => (
                    <TouchableOpacity
                      key={habit.id}
                      style={[styles.habitQuarterRow, { backgroundColor: colors.card }]}
                      onPress={() => {
                        setShowQuarterModal(false);
                        handleHabitPress(habit);
                      }}
                    >
                      <Text style={styles.habitQuarterEmoji}>{habit.icon}</Text>
                      <Text style={[styles.habitQuarterName, { color: colors.text }]}>
                        {habit.name}
                      </Text>
                      <Text style={[
                        styles.habitQuarterPercent,
                        { color: habit.percentage >= 80 ? colors.success : colors.warning }
                      ]}>
                        {habit.percentage}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalBottomSpace} />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // === РАСШИРЕННЫЙ МОДАЛ МЕСЯЦА ===
  const renderMonthModal = () => (
    <Modal
      visible={showMonthModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowMonthModal(false)}
    >
      <View style={styles.modalFullOverlay}>
        <View style={[styles.modalFullContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.modalFixedHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.error }]}
              onPress={() => setShowMonthModal(false)}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            {selectedMonth && (
              <View style={styles.modalHeaderContent}>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                  {selectedMonth.monthName} {selectedYear}
                </Text>
                <View style={[styles.modalBadge, { 
                  backgroundColor: selectedMonth.percentage >= 80 ? colors.success :
                                   selectedMonth.percentage >= 60 ? colors.warning :
                                   selectedMonth.percentage >= 40 ? colors.error : colors.textSecondary
                }]}>
                  <Text style={styles.modalBadgeText}>{selectedMonth.percentage}%</Text>
                </View>
              </View>
            )}
          </View>
          
          <ScrollView 
            style={styles.modalScrollableContent}
            contentContainerStyle={styles.modalScrollPadding}
            showsVerticalScrollIndicator={false}
          >
            {selectedMonth && (
              <>
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStatItem}>
                      <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                        ✅ Выполнено
                      </Text>
                      <Text style={[styles.modalStatValue, { color: colors.success }]}>
                        {selectedMonth.fact}
                      </Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                        🎯 План
                      </Text>
                      <Text style={[styles.modalStatValue, { color: colors.primary }]}>
                        {selectedMonth.plan}
                      </Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                        📅 Активных дней
                      </Text>
                      <Text style={[styles.modalStatValue, { color: colors.warning }]}>
                        {selectedMonth.activeDays}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Привычки месяца */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                    📊 Статистика привычек
                  </Text>
                  
                  {habitsYearStats.map(habit => {
                    const monthData = habit.monthlyData[selectedMonth.month];
                    if (!monthData || monthData.plan === 0) return null;
                    
                    return (
                      <TouchableOpacity
                        key={habit.id}
                        style={[styles.habitMonthRow, { backgroundColor: colors.card }]}
                        onPress={() => {
                          setShowMonthModal(false);
                          handleHabitPress(habit);
                        }}
                      >
                        <View style={styles.habitMonthInfo}>
                          <Text style={styles.habitMonthEmoji}>{habit.icon}</Text>
                          <View style={styles.habitMonthDetails}>
                            <Text style={[styles.habitMonthName, { color: colors.text }]}>
                              {habit.name}
                            </Text>
                            <Text style={[styles.habitMonthStats, { color: colors.textSecondary }]}>
                              {formatLocalizedValue(monthData.fact, habit.type, habit.unit)}
                            </Text>
                          </View>
                        </View>
                        <Text style={[
                          styles.habitMonthPercent,
                          {
                            color: monthData.percentage >= 80 ? colors.success :
                                   monthData.percentage >= 60 ? colors.warning :
                                   monthData.percentage >= 40 ? colors.error : colors.textSecondary
                          }
                        ]}>
                          {monthData.percentage}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalBottomSpace} />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // === ДЕТАЛЬНЫЙ МОДАЛ ПРИВЫЧКИ ЗА ГОД ===
  const renderHabitModal = () => (
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
            
            {selectedHabit && (
              <View style={styles.habitModalHeaderContent}>
                <Text style={styles.habitModalIcon}>{selectedHabit.icon}</Text>
                <Text style={[styles.modalHeaderTitle, { color: colors.text, textAlign: 'center', fontSize: 18 }]}>
                  {selectedHabit.name}
                </Text>
                {selectedHabit.isArchived && (
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
            {selectedHabit && (
              <>
                {/* СЕКЦИЯ 1: Годовая статистика */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => toggleSection('stats')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                        📊 Годовая статистика
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
                      <View style={styles.modalStatsRow}>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            📊 Факт за год
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.success }]}>
                            {formatLocalizedValue(selectedHabit.yearFact, selectedHabit.type, selectedHabit.unit)}
                          </Text>
                        </View>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            🎯 План года
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.primary }]}>
                            {formatLocalizedValue(selectedHabit.yearPlan, selectedHabit.type, selectedHabit.unit)}
                          </Text>
                        </View>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            📈 % выполнения
                          </Text>
                          <Text style={[styles.modalStatValue, { 
                            color: selectedHabit.percentage === 100 ? colors.success :
                                   selectedHabit.percentage >= 75 ? colors.warning :
                                   selectedHabit.percentage >= 50 ? '#FF6B35' :
                                   selectedHabit.percentage >= 25 ? colors.error : '#8B0000'
                          }]}>
                            {selectedHabit.percentage}%
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.modalStatsSeparator, { backgroundColor: colors.border }]} />

                      <View style={styles.modalStatsRow}>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            📅 Дней выполнено
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.warning }]}>
                            {selectedHabit.completedDays}
                          </Text>
                        </View>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            🏆 Лучшая серия
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.primary }]}>
                            {selectedHabit.maxStreak} дней
                          </Text>
                        </View>
                        <View style={styles.modalStatItem}>
                          <Text style={[styles.modalStatLabel, { color: colors.text }]}>
                            📊 Ср. в месяц
                          </Text>
                          <Text style={[styles.modalStatValue, { color: colors.success }]}>
                            {Math.round(selectedHabit.completedDays / 12)} дней
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* СЕКЦИЯ 2: Динамика по кварталам */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => toggleSection('quarters')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                        📈 Динамика по кварталам
                      </Text>
                      <Ionicons 
                        name={expandedSections.quarters ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {expandedSections.quarters && (
                    <View style={styles.quarterProgressContainer}>
                      {quarterlyStats.map((quarter, index) => {
                        let quarterFact = 0;
                        let quarterPlan = 0;
                        
                        quarter.months.forEach(monthIndex => {
                          const monthData = selectedHabit.monthlyData[monthIndex];
                          if (monthData) {
                            quarterFact += monthData.fact;
                            quarterPlan += monthData.plan;
                          }
                        });
                        
                        const quarterPercentage = quarterPlan > 0 ? 
                          Math.round((quarterFact / quarterPlan) * 100) : 0;
                        
                        return (
                          <View key={index} style={styles.quarterProgressItem}>
                            <View style={styles.quarterProgressHeader}>
                              <Text style={[styles.quarterProgressName, { color: colors.text }]}>
                                {quarter.emoji} {quarter.name}
                              </Text>
                              <Text style={[
                                styles.quarterProgressPercent,
                                { color: quarter.color }
                              ]}>
                                {quarterPercentage}%
                              </Text>
                            </View>
                            <View style={[styles.quarterProgressBar, { backgroundColor: colors.border }]}>
                              <View 
                                style={[
                                  styles.quarterProgressFill,
                                  { 
                                    backgroundColor: quarter.color,
                                    width: `${quarterPercentage}%`
                                  }
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* СЕКЦИЯ 3: Детализация по месяцам */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => toggleSection('months')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                        📅 Детализация по месяцам
                      </Text>
                      <Ionicons 
                        name={expandedSections.months ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {expandedSections.months && (
                    <View style={styles.monthsChartContainer}>
                      {/* График по месяцам */}
                      <View style={styles.monthsChart}>
                        {selectedHabit.monthlyData.map((monthData, index) => {
                          const barHeight = monthData.plan > 0 ? 
                            (monthData.percentage / 100) * 120 : 0;
                          
                          return (
                            <TouchableOpacity
                              key={index}
                              style={styles.monthBarContainer}
                              onPress={() => {
                                setShowHabitModal(false);
                                handleMonthPress(monthlyStats[index]);
                              }}
                            >
                              <View 
                                style={[
                                  styles.monthBar,
                                  { 
                                    height: barHeight,
                                    backgroundColor: monthData.percentage >= 80 ? colors.success :
                                                   monthData.percentage >= 60 ? colors.warning :
                                                   monthData.percentage >= 40 ? colors.error : 
                                                   colors.textSecondary
                                  }
                                ]}
                              />
                              <Text style={[styles.monthBarLabel, { color: colors.textSecondary }]}>
                                {shortMonthNames[index]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      
                      {/* Легенда */}
                      <View style={styles.chartLegend}>
                        <Text style={[styles.chartLegendText, { color: colors.textSecondary }]}>
                          Нажмите на месяц для детальной статистики
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* СЕКЦИЯ 4: Достижения и рекорды */}
                <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => toggleSection('achievements')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                        🏆 Достижения и рекорды
                      </Text>
                      <Ionicons 
                        name={expandedSections.achievements ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {expandedSections.achievements && (
                    <View style={styles.achievementsContainer}>
                      {/* Анализ трендов */}
                      <View style={[styles.trendAnalysis, { backgroundColor: colors.card }]}>
                        <Text style={[styles.trendTitle, { color: colors.text }]}>
                          📊 Анализ года
                        </Text>
                        <Text style={[styles.trendText, { color: colors.textSecondary }]}>
                          {selectedHabit.percentage === 100 ? 
                            '🎉 Великолепно! Вы выполнили привычку на 100%!' :
                            selectedHabit.percentage >= 80 ?
                            '💪 Отличный результат! Вы почти у цели!' :
                            selectedHabit.percentage >= 60 ?
                            '👍 Хороший прогресс! Продолжайте в том же духе!' :
                            selectedHabit.percentage >= 40 ?
                            '📈 Есть прогресс, но можно лучше!' :
                            '💡 Нужно больше постоянства для достижения целей.'}
                        </Text>
                      </View>

                      {/* Рекомендации */}
                      <View style={[styles.recommendations, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.recommendationTitle, { color: colors.primary }]}>
                          💡 Рекомендация
                        </Text>
                        <Text style={[styles.recommendationText, { color: colors.text }]}>
                          {selectedHabit.percentage < 50 ?
                            'Попробуйте уменьшить целевое значение или выполнять привычку в одно и то же время каждый день.' :
                            selectedHabit.percentage < 80 ?
                            'Вы на правильном пути! Создайте напоминания для дней, когда забываете о привычке.' :
                            'Отличная работа! Можете увеличить целевое значение для большего прогресса.'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderYearSummary()}
      {renderQuarters()}
      {renderMonthlyHeatmap()}
      {renderTopHabits()}
      
      {renderQuarterModal()}
      {renderMonthModal()}
      {renderHabitModal()}
      
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
};

// === СТИЛИ В СТИЛЕ MonthStatistics ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },

  // === ГОДОВАЯ СВОДКА ===
  yearSummaryContainer: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },

  yearSummaryHeader: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  yearSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },

  summaryCard: {
    width: '47%',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
    minHeight: 70,
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },

  // === СЕКЦИИ ===
  sectionContainer: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },

  // === КВАРТАЛЫ ===
  quartersGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },

  quarterCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm,
    alignItems: 'center',
    minHeight: 80,
  },

  quarterEmoji: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },

  quarterName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },

  quarterPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },

  quarterDays: {
    fontSize: 10,
    fontWeight: '500',
  },

  // === МЕСЯЧНАЯ ТЕПЛОВАЯ КАРТА ===
  heatmapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    justifyContent: 'center',
  },

  monthHeatCell: {
    width: '15%',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    padding: SPACING.xs,
    alignItems: 'center',
    minHeight: 45,
    marginBottom: SPACING.xs,
  },

  monthHeatName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },

  monthHeatPercent: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // === ПРИВЫЧКИ ГОДА ===
  habitYearCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },

  habitYearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  habitYearInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  habitYearEmoji: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },

  habitYearDetails: {
    flex: 1,
  },

  habitYearName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },

  habitYearStats: {
    fontSize: 12,
    fontWeight: '500',
  },

  habitYearPercent: {
    alignItems: 'center',
  },

  habitPercentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // === МОДАЛЬНЫЕ ОКНА ===
  modalFullOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  modalFullContainer: {
    flex: 1,
    marginTop: 40,
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

  modalHeaderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.sm,
    paddingHorizontal: 60,
  },

  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  modalBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
  },

  modalBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  quarterModalEmoji: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },

  habitModalHeaderContent: {
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginRight: 60,
  },

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

  modalScrollableContent: {
    flex: 1,
  },

  modalScrollPadding: {
    paddingBottom: SPACING.xxxl,
  },

  modalSection: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.xs,
  },

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

  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
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

  modalStatsSeparator: {
    height: 1,
    marginVertical: SPACING.md,
    opacity: 0.3,
  },

  // === ДЕТАЛИ КВАРТАЛА ===
  monthDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },

  monthDetailName: {
    fontSize: 14,
    fontWeight: '600',
  },

  monthDetailStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },

  monthDetailValue: {
    fontSize: 12,
    fontWeight: '500',
  },

  monthDetailPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  habitQuarterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },

  habitQuarterEmoji: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },

  habitQuarterName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  habitQuarterPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // === ДЕТАЛИ МЕСЯЦА ===
  habitMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },

  habitMonthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  habitMonthEmoji: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },

  habitMonthDetails: {
    flex: 1,
  },

  habitMonthName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },

  habitMonthStats: {
    fontSize: 11,
    fontWeight: '500',
  },

  habitMonthPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // === ГРАФИКИ И ВИЗУАЛИЗАЦИЯ ===
  quarterProgressContainer: {
    marginTop: SPACING.md,
  },

  quarterProgressItem: {
    marginBottom: SPACING.md,
  },

  quarterProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },

  quarterProgressName: {
    fontSize: 13,
    fontWeight: '600',
  },

  quarterProgressPercent: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  quarterProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },

  quarterProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // === ГРАФИК ПО МЕСЯЦАМ ===
  monthsChartContainer: {
    marginTop: SPACING.md,
  },

  monthsChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    paddingHorizontal: SPACING.xs,
  },

  monthBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  monthBar: {
    width: '70%',
    borderRadius: BORDER_RADIUS.xs,
    marginBottom: SPACING.xs,
  },

  monthBarLabel: {
    fontSize: 9,
    fontWeight: '600',
  },

  chartLegend: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },

  chartLegendText: {
    fontSize: 11,
    fontStyle: 'italic',
  },

  // === ДОСТИЖЕНИЯ И АНАЛИЗ ===
  achievementsContainer: {
    marginTop: SPACING.md,
  },

  trendAnalysis: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },

  trendTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },

  trendText: {
    fontSize: 13,
    lineHeight: 18,
  },

  recommendations: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },

  recommendationTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },

  recommendationText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // === ОТСТУПЫ ===
  modalBottomSpace: {
    height: SPACING.xxxl,
  },

  bottomSpace: {
    height: SPACING.xl,
  },
});

export default React.memo(YearStatistics);