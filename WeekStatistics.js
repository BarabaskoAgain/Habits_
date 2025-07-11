// ====================================
// КОМПОНЕНТ НЕДЕЛЬНОЙ СТАТИСТИКИ С BADGE СЕРИИ
// WeekStatistics.js - НЕДЕЛЯ
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
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { 
  THEMES, 
  SPACING, 
  BORDER_RADIUS, 
  TYPOGRAPHY
} from './constants';
import { 
  dateUtils, 
  statsUtils
} from './utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WeekStatistics = ({
  habitsData = { activeHabits: [], archivedHabits: [] },
  onHabitToggle = () => {},
  onHabitUpdateValue = () => {},
  theme = 'blue',
  isDarkMode = false,
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
  
  // === СОСТОЯНИЕ ДЛЯ РЕДАКТИРОВАНИЯ ===
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // === ДНИ НЕДЕЛИ ===
  const weekDayNames = useMemo(() => ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'], []);

  // === ВЫЧИСЛЕНИЕ ДАННЫХ ДЛЯ НЕДЕЛИ ===
  const statisticsData = useMemo(() => {
    if (!allHabits || allHabits.length === 0) return { 
      dates: [], 
      activeHabitsStats: [], 
      archivedHabitsStats: [] 
    };

    try {
      const currentWeekStart = dateUtils.getCurrentWeekStart();
      const startDate = new Date(currentWeekStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      const dates = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dates.push({
date: dateUtils.formatDateLocal(date),
day: date.getDate(),
weekday: weekDayNames[i],
fullWeekday: date.toLocaleDateString('ru-RU', { weekday: 'long' }),
isToday: dateUtils.formatDateLocal(date) === dateUtils.formatDateLocal(today)
        });
      }

      // Функция для вычисления статистики для группы привычек
      const calculateHabitsStats = (habits) => {
        return habits.map(habit => {
          const completions = habit.completions || {};
          let weightEntries = [];
          
          const planValue = calculatePlanFromCreation(habit, startDate, endDate);

          let factValue = 0;
          let completedDays = 0;
          
          dates.forEach(({ date }) => {
            const completion = completions[date];
            if (completion) {
              if (habit.type === 'boolean') {
                if (completion === true) {
                  factValue++;
                  completedDays++;
                }
              } else if (habit.type === 'weight') {
                if (typeof completion === 'object' && completion.weight && completion.weight > 0) {
                  weightEntries.push(completion.weight);
                  completedDays++;
                }
              } else if (habit.type === 'number') {
                if (completion.value && completion.value > 0) {
                  factValue += completion.value;
                  if (completion.completed) completedDays++;
                }
              }
            }
          });

          // Для веса рассчитываем средний вес как факт
          if (habit.type === 'weight') {
            factValue = calculateAverageWeight(weightEntries);
          }

          // РАСЧЕТ ПРОЦЕНТА ВЫПОЛНЕНИЯ
          let percentage = 0;
          if (habit.type === 'weight') {
            if (factValue > 0 && planValue > 0) {
              const deviation = Math.abs(factValue - planValue);
              const tolerance = 2;
              percentage = Math.max(0, Math.round((1 - deviation / tolerance) * 100));
              percentage = Math.min(100, percentage);
            }
          } else {
            percentage = planValue > 0 ? Math.round((factValue / planValue) * 100) : 0;
          }
          
          // ДАННЫЕ ПО ДНЯМ
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

      return { dates, activeHabitsStats, archivedHabitsStats };
    } catch (error) {
      console.error('Ошибка вычисления статистики недели:', error);
      return { dates: [], activeHabitsStats: [], archivedHabitsStats: [] };
    }
  }, [allHabits, activeHabits, archivedHabits, calculateAverageWeight, calculatePlanFromCreation, weekDayNames]);

  // === СВОДНАЯ СТАТИСТИКА ===
  const summaryStats = useMemo(() => {
    const { activeHabitsStats, archivedHabitsStats } = statisticsData;
    const allHabitsStats = [...activeHabitsStats, ...archivedHabitsStats];
    
    if (allHabitsStats.length === 0) {
      return {
        totalHabits: 0,
        todayCompleted: 0,
        todayTotal: 0,
        maxStreak: 0,
        topHabit: null
      };
    }

    let completedCount = 0;
    let totalCount = allHabits.length;
    
    const today = dateUtils.today();
    allHabits.forEach(habit => {
      const completion = habit.completions?.[today];
      if (habit.type === 'boolean') {
        if (completion) completedCount++;
      } else if (habit.type === 'weight') {
        if (completion && typeof completion === 'object' && completion.weight > 0) completedCount++;
      } else if (habit.type === 'number') {
        if (completion && completion.completed) completedCount++;
      }
    });

    const maxStreak = Math.max(...allHabitsStats.map(habit => habit.streak), 0);
    
    const topHabit = allHabitsStats.reduce((best, current) => 
      current.percentage > best.percentage ? current : best
    );

    return {
      totalHabits: totalCount,
      todayCompleted: completedCount,
      todayTotal: totalCount,
      maxStreak,
      topHabit
    };
  }, [statisticsData, allHabits]);

  // === ФУНКЦИИ ДЛЯ РЕДАКТИРОВАНИЯ ===
  const handleCellPress = useCallback((habitStat, date, dayData) => {
    setEditingCell({
      habitId: habitStat.id,
      habitName: habitStat.name,
      habitType: habitStat.type,
      habitUnit: habitStat.unit,
      habitTargetValue: habitStat.targetValue,
      habitTargetWeight: habitStat.targetWeight,
      date: date,
      currentValue: dayData?.value || null,
      currentStatus: dayData?.status || 'empty'
    });
    
    if (habitStat.type === 'boolean') {
      setEditValue(dayData?.status === 'completed' ? 'true' : 'false');
    } else if (habitStat.type === 'weight') {
      setEditValue(dayData?.value || habitStat.targetWeight?.toString() || '70');
    } else if (habitStat.type === 'number') {
      setEditValue(dayData?.value?.toString() || habitStat.targetValue?.toString() || '1');
    }
    
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingCell) return;
    
    try {
      const { habitId, habitType, date } = editingCell;
      
      if (habitType === 'boolean') {
        onHabitToggle(habitId, date);
      } else if (habitType === 'weight') {
        const weight = parseFloat(editValue);
        if (isNaN(weight) || weight <= 0) {
          Alert.alert('Ошибка', 'Введите корректный вес');
          return;
        }
        
        const weightData = {
          weight: weight,
          timestamp: new Date().toISOString(),
          targetWeight: editingCell.habitTargetWeight,
          recorded: true
        };
        
        onHabitUpdateValue(habitId, date, weightData);
      } else if (habitType === 'number') {
        const value = parseInt(editValue);
        if (isNaN(value) || value < 0) {
          Alert.alert('Ошибка', 'Введите корректное значение');
          return;
        }
        
        onHabitUpdateValue(habitId, date, value);
      }
      
      setShowEditModal(false);
      setEditingCell(null);
      setEditValue('');
      
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить изменения');
    }
  }, [editingCell, editValue, onHabitToggle, onHabitUpdateValue]);

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
    setEditingCell(null);
    setEditValue('');
  }, []);

  // === РЕНДЕР СВОДНЫХ КАРТОЧЕК ===
  const renderSummaryCards = () => {
    const truncateName = (name, maxLength = 8) => {
      if (name.length <= maxLength) return name;
      return name.substring(0, maxLength - 1) + '…';
    };

    return (
      <View style={styles.compactSummaryContainer}>
        <View style={[styles.compactSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.compactSummaryLabel, { color: colors.textSecondary }]}>
            Всего
          </Text>
          <Text style={[styles.compactSummaryValue, { color: colors.primary }]}>
            {summaryStats.totalHabits}
          </Text>
        </View>
        
        <View style={[styles.compactSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.compactSummaryLabel, { color: colors.textSecondary }]}>
            Сегодня
          </Text>
          <Text style={[styles.compactSummaryValue, { color: colors.success }]}>
            {summaryStats.todayCompleted}/{summaryStats.todayTotal}
          </Text>
        </View>
        
        <View style={[styles.compactSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.compactSummaryLabel, { color: colors.textSecondary }]}>
            Макс серия
          </Text>
          <Text style={[styles.compactSummaryValue, { color: colors.warning }]}>
            🔥{summaryStats.maxStreak}
          </Text>
        </View>
        
        {summaryStats.topHabit && (
          <View style={[styles.compactSummaryCard, styles.topHabitCard, { backgroundColor: colors.card, borderColor: summaryStats.topHabit.color }]}>
            <Text style={[styles.compactSummaryLabel, { color: colors.textSecondary }]}>
              ТОП
            </Text>
            <View style={styles.topHabitContent}>
              <Text style={styles.topHabitIcon}>{summaryStats.topHabit.icon}</Text>
              <View style={styles.topHabitTextContainer}>
                <Text style={[styles.topHabitName, { color: colors.text }]} numberOfLines={1}>
                  {truncateName(summaryStats.topHabit.name, 7)}
                </Text>
                <Text style={[styles.topHabitPercent, { color: summaryStats.topHabit.color }]}>
                  {summaryStats.topHabit.percentage}%
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // === РЕНДЕР НЕДЕЛЬНОЙ ТАБЛИЦЫ ===
  const renderWeekView = () => {
    // Фиксированные ширины для предотвращения выхода за экран
    const HABIT_WIDTH = 75;
    const STATS_WIDTH = 85;
    const DAY_WIDTH = 32;
    const DAYS_TOTAL_WIDTH = DAY_WIDTH * 7;
    const TABLE_WIDTH = HABIT_WIDTH + DAYS_TOTAL_WIDTH + STATS_WIDTH;

    // Функция рендера группы привычек
    const renderHabitsGroup = (habitsStats, title, titleColor) => (
      <>
        {habitsStats.length > 0 && (
          <>
            {/* Заголовок группы */}
            <View style={[styles.groupHeader, { backgroundColor: colors.surface }]}>
              <Text style={[styles.groupTitle, { color: titleColor }]}>
                {title} ({habitsStats.length})
              </Text>
            </View>
            
            {/* Привычки группы */}
            {habitsStats.map((habitStat) => (
<View key={habitStat.id} style={[
  styles.fixedHabitRow, 
  { 
    borderColor: colors.border,
    backgroundColor: (habitStat.color || '#2196F3') + (() => {
      if (habitStat.percentage === 0) return '05';      // 2% - не выполнено
      if (habitStat.percentage < 50) return '0C';       // 5% - мало выполнено (1-49%)
      if (habitStat.percentage < 80) return '12';       // 7% - неплохо (50-79%)
      if (habitStat.percentage < 100) return '18';      // 9% - почти готово (80-99%)
      if (habitStat.percentage === 100) return '20';    // 12% - план выполнен (100%)
      return '26';                                       // 15% - перевыполнение (>100%)
    })(),
  }
]}>                <View style={[styles.fixedHabitColumn, { width: HABIT_WIDTH }]}>
                  <View style={styles.improvedHabitInfo}>
                    {/* КОНТЕЙНЕР С ИКОНКОЙ И BADGE */}
                    <View style={styles.iconContainer}>
                      <Text style={[
                        styles.improvedHabitIcon, 
                        { opacity: habitStat.isArchived ? 0.6 : 1.0 }
                      ]}>
                        {habitStat.icon}
                      </Text>
                      {/* BADGE СЕРИИ */}
                      {habitStat.streak > 0 && (
                        <View style={[
                          styles.streakBadge, 
                          { 
                            backgroundColor: habitStat.streak >= 30 ? '#FF4444' : 
                                             habitStat.streak >= 14 ? '#FF6B35' : 
                                             habitStat.streak >= 7 ? '#FFA500' :  
                                             '#FFD700',
                            opacity: habitStat.isArchived ? 0.7 : 1.0
                          }
                        ]}>
                          <Text style={styles.streakBadgeText}>{habitStat.streak}</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.improvedHabitDetails}>
                      <Text style={[
                        styles.improvedHabitName, 
                        { 
                          color: colors.text,
                          opacity: habitStat.isArchived ? 0.6 : 1.0 
                        }
                      ]} numberOfLines={3}>
                        {habitStat.name}
                      </Text>
                      {habitStat.isArchived && (
                        <Text style={[styles.archivedLabel, { color: colors.textSecondary }]}>
                          📁 Завершена
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                
                <View style={[styles.fixedDaysContainer, { width: DAYS_TOTAL_WIDTH }]}>
                  {statisticsData.dates.map((dateInfo) => {
                    const dayData = habitStat.dailyData.find(d => d.date === dateInfo.date);
                    return (
                      <View key={dateInfo.date} style={[styles.fixedDayColumn, { width: DAY_WIDTH }]}>
                        <TouchableOpacity
                          style={[
                            styles.improvedDayCell,
                            {
                              backgroundColor: getDayCellColor(dayData?.status, habitStat.color, colors),
                              borderColor: dateInfo.isToday ? colors.primary : colors.border,
                              borderWidth: dateInfo.isToday ? 1 : 0.5,
                              opacity: habitStat.isArchived ? 0.7 : 1.0
                            }
                          ]}
                          onPress={() => !habitStat.isArchived && handleCellPress(habitStat, dateInfo.date, dayData)}
                          activeOpacity={habitStat.isArchived ? 1.0 : 0.7}
                          disabled={habitStat.isArchived}
                        >
                          <Text style={[
                            styles.improvedCellText,
                            { color: getDayCellTextColor(dayData?.status, colors) }
                          ]}>
                            {dayData?.value ? (
                              habitStat.type === 'weight' ? dayData.value : 
                              dayData.value.length > 3 ? '✓' : dayData.value
                            ) : ''}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
                
                <View style={[styles.fixedStatsContainer, { width: STATS_WIDTH }]}>
                  <View style={styles.improvedStatsData}>
                    <Text style={[
                      styles.improvedStatValue, 
                      { 
                        color: getFactValueColor(habitStat.factValue, habitStat.planValue, habitStat.type, colors), 
                        flex: 1,
                        fontWeight: '600',
                        opacity: habitStat.isArchived ? 0.7 : 1.0
                      }
                    ]}>
                      {formatCompactValue(habitStat.factValue, habitStat.type, habitStat.unit)}
                    </Text>
                    <Text style={[
                      styles.improvedStatValue, 
                      { 
                        color: colors.textSecondary, 
                        flex: 1,
                        opacity: habitStat.isArchived ? 0.7 : 1.0
                      }
                    ]}>
                      {formatCompactValue(habitStat.planValue, habitStat.type, habitStat.unit)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </>
    );

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>

<View style={[styles.tableContainer, { backgroundColor: colors.card }, styles.centerContent]}>
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false}
    style={styles.horizontalScroll}
    contentContainerStyle={{
      minWidth: Math.max(TABLE_WIDTH, SCREEN_WIDTH),
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <View style={{ width: TABLE_WIDTH }}>
      {/* Заголовок таблицы */}
      <View style={[styles.fixedTableHeader, { backgroundColor: colors.surface }]}>
        <View style={[styles.fixedHabitColumn, { width: HABIT_WIDTH }]}>
          <Text style={[styles.improvedHeaderText, { color: colors.text }]}>
            Привычка
          </Text>
        </View>
        
        <View style={[styles.fixedDaysContainer, { width: DAYS_TOTAL_WIDTH }]}>
          {statisticsData.dates.map((dateInfo) => (
            <View key={dateInfo.date} style={[styles.fixedDayColumn, { width: DAY_WIDTH }]}>
              <Text style={[styles.improvedWeekdayText, { color: colors.textSecondary }]}>
                {dateInfo.weekday}
              </Text>
              <Text style={[
                styles.improvedDayText, 
                { 
                  color: dateInfo.isToday ? colors.primary : colors.textSecondary,
                  fontWeight: dateInfo.isToday ? 'bold' : 'normal'
                }
              ]}>
                {dateInfo.day}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={[styles.fixedStatsContainer, { width: STATS_WIDTH }]}>
          <View style={styles.improvedStatsHeader}>
            <Text style={[styles.improvedHeaderText, { color: colors.text, flex: 1 }]}>
              Факт
            </Text>
            <Text style={[styles.improvedHeaderText, { color: colors.text, flex: 1 }]}>
              План
            </Text>
          </View>
        </View>
      </View>
      
      {/* Тело таблицы */}
      <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
        {/* АКТИВНЫЕ ПРИВЫЧКИ */}
        {renderHabitsGroup(
          statisticsData.activeHabitsStats, 
          "🎯 Активные привычки", 
          colors.success
        )}
        
        {/* АРХИВИРОВАННЫЕ ПРИВЫЧКИ (если есть) */}
        {renderHabitsGroup(
          statisticsData.archivedHabitsStats, 
          "📁 Завершенные на этой неделе", 
          colors.textSecondary
        )}
      </ScrollView>
    </View>
  </ScrollView>
  
</View>
 </ScrollView>

    );
  };

  // === РЕНДЕР МОДАЛЬНОГО ОКНА РЕДАКТИРОВАНИЯ ===
  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      transparent
      animationType="fade"
      onRequestClose={handleCancelEdit}
    >
      <View style={styles.editModalOverlay}>
        <View style={[styles.editModalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.editModalTitle, { color: colors.text }]}>
            Редактировать запись
          </Text>
          
          {editingCell && (
            <>
              <Text style={[styles.editModalSubtitle, { color: colors.textSecondary }]}>
                {editingCell.habitName} • {new Date(editingCell.date).toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'long',
                  weekday: 'short' 
                })}
              </Text>
              
              {editingCell.habitType === 'boolean' ? (
                <View style={styles.editBooleanContainer}>
                  <TouchableOpacity
                    style={[
                      styles.editBooleanButton,
                      {
                        backgroundColor: editValue === 'true' ? colors.success : colors.surface,
                        borderColor: editValue === 'true' ? colors.success : colors.border
                      }
                    ]}
                    onPress={() => setEditValue('true')}
                  >
                    <Ionicons 
                      name="checkmark-circle" 
                      size={20} 
                      color={editValue === 'true' ? '#ffffff' : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.editBooleanText,
                      { color: editValue === 'true' ? '#ffffff' : colors.text }
                    ]}>
                      Выполнено
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.editBooleanButton,
                      {
                        backgroundColor: editValue === 'false' ? colors.error : colors.surface,
                        borderColor: editValue === 'false' ? colors.error : colors.border
                      }
                    ]}
                    onPress={() => setEditValue('false')}
                  >
                    <Ionicons 
                      name="close-circle" 
                      size={20} 
                      color={editValue === 'false' ? '#ffffff' : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.editBooleanText,
                      { color: editValue === 'false' ? '#ffffff' : colors.text }
                    ]}>
                      Не выполнено
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : editingCell.habitType === 'weight' ? (
                <View style={styles.editWeightContainer}>
                  <Text style={[styles.editInputLabel, { color: colors.text }]}>
                    Вес (кг):
                  </Text>
                  <View style={styles.editWeightInputContainer}>
                    <TextInput
                      style={[
                        styles.editWeightInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text
                        }
                      ]}
                      value={editValue}
                      onChangeText={setEditValue}
                      placeholder={editingCell.habitTargetWeight?.toString() || '70'}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    <Text style={[styles.editWeightUnit, { color: colors.textSecondary }]}>кг</Text>
                  </View>
                  <Text style={[styles.editInputHelper, { color: colors.textSecondary }]}>
                    Цель: {editingCell.habitTargetWeight || 70} кг
                  </Text>
                </View>
              ) : (
                <View style={styles.editNumberContainer}>
                  <Text style={[styles.editInputLabel, { color: colors.text }]}>
                    Количество {editingCell.habitUnit ? `(${editingCell.habitUnit})` : ''}:
                  </Text>
                  <TextInput
                    style={[
                      styles.editNumberInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text
                      }
                    ]}
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder={editingCell.habitTargetValue?.toString() || '1'}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={[styles.editInputHelper, { color: colors.textSecondary }]}>
                    Цель: {editingCell.habitTargetValue || 1} {editingCell.habitUnit || 'раз'}
                  </Text>
                </View>
              )}
            </>
          )}
          
          <View style={styles.editModalButtons}>
            <TouchableOpacity
              style={[styles.editModalButton, { backgroundColor: colors.surface }]}
              onPress={handleCancelEdit}
            >
              <Text style={[styles.editModalButtonText, { color: colors.textSecondary }]}>
                Отмена
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.editModalButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveEdit}
            >
              <Text style={[styles.editModalButtonText, { color: '#ffffff' }]}>
                Сохранить
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // === ОСНОВНОЙ РЕНДЕР ===
  return (
    <View style={styles.container}>
      {renderSummaryCards()}
      {renderWeekView()}
      {renderEditModal()}
    </View>
  );
};

// === СТИЛИ ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // === СВОДНЫЕ КАРТОЧКИ ===
  compactSummaryContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  
  compactSummaryCard: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 50,
  },
  
  compactSummaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  
  compactSummaryLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 11,
    marginBottom: 2,
  },

  // === ТОП БЛОК ===
  topHabitCard: {
    borderWidth: 1.5,
    minWidth: 80,
  },
  
  topHabitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: SPACING.xs,
    minHeight: 20,
    width: '100%',
  },
  
  topHabitIcon: {
    fontSize: 12,
    marginRight: 4,
    position: 'absolute',
    left: 0,
  },
  
  topHabitTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 0,
  },
  
  topHabitName: {
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 10,
    textAlign: 'center',
  },
  
  topHabitPercent: {
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 12,
    textAlign: 'center',
  },

  // === ТАБЛИЦА ===
  tableContainer: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    marginHorizontal: -SPACING.md,
  },

  horizontalScroll: {
    flex: 1,
  },

  fixedTableHeader: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
  },

  fixedHabitColumn: {
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },

  fixedDaysContainer: {
    flexDirection: 'row',
  },

  fixedDayColumn: {
    alignItems: 'center',
    paddingHorizontal: 1,
  },

  fixedStatsContainer: {
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },

  fixedHabitRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 0.5,
    minHeight: 55,
    alignItems: 'center',
  },
  
  tableBody: {
    flex: 1,
  },
  
  // === ЗАГОЛОВКИ ===
  improvedHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  improvedWeekdayText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 1,
  },

  improvedDayText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  improvedHabitInfo: {
    flexDirection: 'column',
    alignItems: 'center',
  },

  // ✅ НОВЫЕ СТИЛИ ДЛЯ BADGE
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
  },

  improvedHabitIcon: {
    fontSize: 16,
  },

  streakBadge: {
    position: 'absolute',
    top: -8,
    right: -10,
    width: 18,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    // Форма огонька
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 14,
    transform: [{ rotate: '8deg' }],
  },

  streakBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 10,
    textAlign: 'center',
    transform: [{ rotate: '-8deg' }],
    marginTop: -1,
  },

  improvedHabitDetails: {
    alignItems: 'center',
  },

  improvedHabitName: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
    textAlign: 'center',
  },

  improvedDayCell: {
    width: '95%',
    aspectRatio: 1,
    maxWidth: 28,
    maxHeight: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  improvedCellText: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 10,
  },

  improvedStatsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },

  improvedStatsData: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },

  improvedStatValue: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },

  // === ГРУППЫ ПРИВЫЧЕК ===
  groupHeader: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },

  groupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  archivedLabel: {
    fontSize: 8,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },

  // === МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ===
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },

  editModalContainer: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 350,
  },

  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  editModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    opacity: 0.8,
  },

  editBooleanContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  editBooleanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    gap: SPACING.sm,
  },

  editBooleanText: {
    fontSize: 16,
    fontWeight: '600',
  },

  editWeightContainer: {
    marginBottom: SPACING.lg,
  },

  editInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  editWeightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },

  editWeightInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 100,
  },

  editWeightUnit: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },

  editNumberContainer: {
    marginBottom: SPACING.lg,
  },

  editNumberInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },

  editInputHelper: {
    fontSize: 12,
    textAlign: 'center',
  },

  editModalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  editModalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },

  editModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
  alignItems: 'center',
  justifyContent: 'center',
},
});

export default WeekStatistics;