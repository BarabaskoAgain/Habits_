// ====================================
// MAINAPP С ИНТЕГРАЦИЕЙ АРХИВА ПРИВЫЧЕК
// MainApp.js - С КНОПКОЙ АРХИВА В HEADER И ПОДДЕРЖКОЙ АРХИВИРОВАНИЯ
// ====================================

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Platform,
  Animated,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import HabitCard from './HabitCard';
import StatisticsScreen from './StatisticsScreen';
import ArchiveScreen from './ArchiveScreen';
import { THEMES, SPACING, BORDER_RADIUS, TYPOGRAPHY, DEFAULT_SETTINGS } from './constants';
import { dateUtils } from './utils';

// === АНИМИРОВАННАЯ КНОПКА ДОБАВЛЕНИЯ ===
const AnimatedAddButton = ({ onPress, colors, settings = DEFAULT_SETTINGS }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  // Получаем настройки анимации
  const animationSettings = settings.buttonAnimation || DEFAULT_SETTINGS.buttonAnimation;
  const isAnimationEnabled = animationSettings.enabled;
  const animationSpeed = animationSettings.speed || 1;
  const selectedColor = animationSettings.color || 'primary';

  // Получаем цвет кнопки из настроек
  const getButtonColor = () => {
    switch (selectedColor) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.secondary;
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'error': return colors.error;
      default: return colors.primary;
    }
  };

  const buttonColor = getButtonColor();

  // Переливание цветов (только если анимация включена)
  useEffect(() => {
    if (!isAnimationEnabled) return;

    const baseDuration = 3000; // базовая длительность
    const duration = baseDuration / animationSpeed; // применяем скорость

    const colorAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: false,
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: false,
        }),
      ])
    );

    colorAnimation.start();

    return () => colorAnimation.stop();
  }, [isAnimationEnabled, animationSpeed, colorAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
    onPress();
  };

  // Создаем цветовую схему для анимации
  const lighterColor = buttonColor + '20'; // Более светлый
  const darkerColor = buttonColor; // Основной цвет

  // Интерполяция цвета (если анимация включена)
  const animatedBackgroundColor = isAnimationEnabled ? colorAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [darkerColor, lighterColor, darkerColor],
  }) : buttonColor;

  const animatedShadowColor = isAnimationEnabled ? colorAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [buttonColor + '40', buttonColor + '60', buttonColor + '40'],
  }) : buttonColor + '40';

  return (
    <Animated.View
      style={[
        styles.animatedAddButton,
        {
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <Animated.View
        style={[
          styles.addButtonContent,
          {
            backgroundColor: animatedBackgroundColor,
            shadowColor: animatedShadowColor,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.addButtonTouch}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const MainApp = ({
  habits = [],
  achievements = [],
  settings = DEFAULT_SETTINGS,
  archivedHabits = [], // НОВЫЙ ПРОП ДЛЯ АРХИВА
  onHabitToggle = () => {},
  onHabitUpdateValue = () => {},
  onHabitEdit = () => {},
  onHabitDelete = () => {},
  onHabitArchive = () => {}, // ФУНКЦИЯ АРХИВИРОВАНИЯ ПРИВЫЧКИ
  onHabitRestore = () => {}, // ФУНКЦИЯ ВОССТАНОВЛЕНИЯ ИЗ АРХИВА
  onArchivedHabitDelete = () => {}, // ФУНКЦИЯ УДАЛЕНИЯ ИЗ АРХИВА
  onShowAddHabit = () => {},
  onShowSettings = () => {},
  onAchievementUnlock = () => {},
  safeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 }
}) => {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(dateUtils.today());
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [refreshing, setRefreshing] = useState(false);

  const colors = THEMES[settings.theme][settings.isDarkMode ? 'dark' : 'light'];

  // ИСПРАВЛЕННЫЙ РАСЧЕТ ПРОГРЕССА С УЧЕТОМ ВЕСА
  const todayProgress = useMemo(() => {
    if (!habits || habits.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    let completed = 0;
    habits.forEach(habit => {
      if (habit.type === 'boolean') {
        // Для булевых привычек
        if (habit.completions && habit.completions[selectedDate]) {
          completed++;
        }
      } else if (habit.type === 'weight') {
        // ИСПРАВЛЕННАЯ ЛОГИКА ДЛЯ ВЕСОВЫХ ПРИВЫЧЕК
        const completion = habit.completions && habit.completions[selectedDate];
        if (completion && typeof completion === 'object' && completion.weight > 0) {
          completed++;
        }
      } else {
        // Для количественных привычек
        const completion = habit.completions && habit.completions[selectedDate];
        if (completion && completion.completed) {
          completed++;
        }
      }
    });
    
    const total = habits.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }, [habits, selectedDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // ИСПРАВЛЕННЫЕ ОБРАБОТЧИКИ С ЛОГИРОВАНИЕМ
  const handleHabitToggle = (habitId, date) => {
    console.log('MainApp: Toggle для привычки', habitId, 'на дату', date);
    onHabitToggle(habitId, date);
  };

  const handleHabitUpdateValue = (habitId, date, value) => {
    console.log('MainApp: UpdateValue для привычки', habitId, 'на дату', date, 'значение:', value);
    onHabitUpdateValue(habitId, date, value);
  };

  // === HEADER С ДИНАМИЧЕСКИМ СОДЕРЖИМЫМ ===
  const renderHeader = () => (
    <View style={[
      styles.header, 
      { 
        backgroundColor: colors.background,
        paddingTop: Math.max(safeAreaInsets.top, SPACING.md),
        paddingLeft: Math.max(safeAreaInsets.left, SPACING.md),
        paddingRight: Math.max(safeAreaInsets.right, SPACING.md),
      }
    ]}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Ionicons 
              name={activeTab === 'archive' ? 'archive' : 'checkmark-circle'} 
              size={24} 
              color="#ffffff" 
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {activeTab === 'archive' ? 'Архив' : 'Привычки'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'archive' 
                ? `${archivedHabits.length} завершенных`
                : dateUtils.formatDate(dateUtils.today())
              }
            </Text>
          </View>
        </View>
        
<View style={styles.headerButtons}>
          {activeTab === 'archive' ? (
            /* КНОПКА НАЗАД В АРХИВЕ */
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.surface }]}
              onPress={() => setActiveTab('home')}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <>
              {/* АНИМИРОВАННАЯ КНОПКА ДОБАВЛЕНИЯ */}
            <AnimatedAddButton
                          onPress={onShowAddHabit}
                          colors={colors}
                          settings={settings}
                        />

              {/* КНОПКА АРХИВА */}
              <TouchableOpacity
                style={[styles.archiveButton, { backgroundColor: colors.surface }]}
                onPress={() => setActiveTab('archive')}
              >
                <Ionicons 
                  name="archive-outline" 
                  size={20} 
                  color={colors.text} 
                />
              </TouchableOpacity>
              
              {/* КНОПКА НАСТРОЕК */}
              <TouchableOpacity
                style={[styles.settingsButton, { backgroundColor: colors.surface }]}
                onPress={onShowSettings}
              >
                <Ionicons name="settings-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );

  // === КАРТОЧКА ПРОГРЕССА ===
  const renderProgressCard = () => (
    <View style={[
      styles.progressCard, 
      { 
        backgroundColor: colors.card,
        borderColor: colors.border 
      }
    ]}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressTitle, { color: colors.text }]}>
          Прогресс дня1
        </Text>
        <Text style={[styles.progressNumbers, { color: colors.primary }]}>
          {todayProgress.completed}/{todayProgress.total}
        </Text>
      </View>
      
      <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              backgroundColor: colors.primary,
              width: `${todayProgress.percentage}%`
            }
          ]} 
        />
      </View>
      
      <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
        {todayProgress.percentage}% выполнено
      </Text>
    </View>
  );

  // === ОСНОВНОЙ КОНТЕНТ ===
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {renderProgressCard()}
            
            {habits.length === 0 ? (
              // Пустое состояние с архивом
              <View style={[styles.emptyState, { paddingBottom: 100 }]}>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Начните новую привычку
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Создайте свою первую привычку{'\n'}и начните путь к лучшей версии себя
                </Text>
                
                {archivedHabits.length > 0 && (
                  <TouchableOpacity
                    style={[styles.archiveHint, { backgroundColor: colors.surface }]}
                    onPress={() => setActiveTab('archive')}
                  >
                    <Ionicons name="archive-outline" size={20} color={colors.primary} />
                    <Text style={[styles.archiveHintText, { color: colors.primary }]}>
                      Посмотреть архив ({archivedHabits.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.habitsList}>
                {habits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    selectedDate={selectedDate}
                    onToggle={handleHabitToggle}
                    onUpdateValue={handleHabitUpdateValue}
                    onEdit={onHabitEdit}
                    onDelete={onHabitDelete}
                    onArchive={(habitId) => {
                      console.log('🎯 MainApp: onArchive вызван с ID:', habitId);
                      console.log('🎯 MainApp: onHabitArchive тип:', typeof onHabitArchive);
                      console.log('🎯 MainApp: onHabitArchive функция:', onHabitArchive);
                      try {
                        onHabitArchive(habitId);
                        console.log('🎯 MainApp: onHabitArchive успешно вызван');
                      } catch (error) {
                        console.error('🎯 MainApp: Ошибка вызова onHabitArchive:', error);
                        Alert.alert('Ошибка MainApp', 'Не удалось вызвать функцию архивирования: ' + error.message);
                      }
                    }}
                    theme={settings.theme}
                    isDarkMode={settings.isDarkMode}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        );
      
      case 'statistics':
        return (
          <StatisticsScreen
            habits={habits}
            archivedHabits={archivedHabits}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            onHabitToggle={handleHabitToggle}
            onHabitUpdateValue={handleHabitUpdateValue}
            theme={settings.theme}
            isDarkMode={settings.isDarkMode}
          />
        );
      
      case 'archive':
        return (
          <ArchiveScreen
            archivedHabits={archivedHabits}
            onRestoreHabit={onHabitRestore}
            onDeleteHabit={onArchivedHabitDelete} // Используем специальную функцию для архива
            onBack={() => setActiveTab('home')} // Передаем функцию возврата
            theme={settings.theme}
            isDarkMode={settings.isDarkMode}
            safeAreaInsets={safeAreaInsets}
          />
        );
      
      default:
        return null;
    }
  };


  // === TAB BAR ===
  const renderTabBar = () => (
    <View style={[
      styles.tabBar, 
      { 
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        paddingBottom: Math.max(safeAreaInsets.bottom, SPACING.xs),
      }
    ]}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'home' && { backgroundColor: colors.primary + '20' }
        ]}
        onPress={() => setActiveTab('home')}
      >
        <Ionicons 
          name={activeTab === 'home' ? 'home' : 'home-outline'} 
          size={20} 
          color={activeTab === 'home' ? colors.primary : colors.textSecondary} 
        />
        <Text style={[
          styles.tabLabel, 
          { color: activeTab === 'home' ? colors.primary : colors.textSecondary }
        ]}>
          Главная
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'statistics' && { backgroundColor: colors.primary + '20' }
        ]}
        onPress={() => setActiveTab('statistics')}
      >
        <Ionicons 
          name={activeTab === 'statistics' ? 'stats-chart' : 'stats-chart-outline'} 
          size={20} 
          color={activeTab === 'statistics' ? colors.primary : colors.textSecondary} 
        />
        <Text style={[
          styles.tabLabel, 
          { color: activeTab === 'statistics' ? colors.primary : colors.textSecondary }
        ]}>
          Статистика
        </Text>
      </TouchableOpacity>
    </View>
  );

  // === ОСНОВНОЙ РЕНДЕР (ИСПРАВЛЕНО - НЕ ПОКАЗЫВАЕМ HEADER ДЛЯ АРХИВА) ===
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Показываем заголовок только если НЕ архив */}
      {activeTab !== 'archive' && renderHeader()}
      {renderContent()}

      {activeTab !== 'archive' && renderTabBar()}
    </View>
  );
};

// === СТИЛИ ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  scrollContainer: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 60 : 50,
  },
  
  // === ЗАГОЛОВОК С ОРИГИНАЛЬНЫМИ СТИЛЯМИ ===
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  
  headerInfo: {
    flex: 1,
  },
  
  headerTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: 'bold',
  },
  
  headerSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    textTransform: 'capitalize',
  },
  
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  archiveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // === ПРОГРЕСС ===
  progressCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    margin: SPACING.md,
  },
  
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  
  progressTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
  },
  
  progressNumbers: {
    ...TYPOGRAPHY.h4,
    fontWeight: 'bold',
  },
  
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  progressPercentage: {
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
  },
  
  // === СПИСОК ПРИВЫЧЕК ===
  habitsList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  
  // === ПУСТОЕ СОСТОЯНИЕ ===
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
  },
  
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  
  emptySubtitle: {
    ...TYPOGRAPHY.bodyLarge,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  
  archiveHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  
  archiveHintText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  
  // === TAB BAR ===
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
  },
  
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.xs,
  },
  
  tabLabel: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },

   // === АНИМИРОВАННАЯ КНОПКА ДОБАВЛЕНИЯ ===
    animatedAddButton: {
      marginRight: 0,
    },

  addButtonTouch: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },


    addButtonContent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    },

});

export default MainApp;