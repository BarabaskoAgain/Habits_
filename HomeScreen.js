// ====================================
// ИСПРАВЛЕННЫЙ ГЛАВНЫЙ ЭКРАН ПРИЛОЖЕНИЯ
// src/screens/HomeScreen.js - БЕЗ ОШИБОК ESLINT
// ====================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  Platform,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Импорт компонентов
import HabitCard from './HabitCard';
import HabitFormModal from './HabitFormModal';
import SettingsScreen from './SettingsScreen';

// Импорт констант
import { 
  THEMES, 
  SPACING, 
  BORDER_RADIUS, 
  TYPOGRAPHY,
  HABIT_CATEGORIES,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  DEFAULT_ACHIEVEMENTS
} from './constants';
import { 
  DEMO_HABITS,
  generateOnboardingHabits
} from './demoData';
import { 
  dateUtils, 
  statsUtils, 
  formatUtils,
  validationUtils,
  MOTIVATIONAL_QUOTES,
  generateId
} from './utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  // === СОСТОЯНИЕ ===
  const [habits, setHabits] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedDate, setSelectedDate] = useState(dateUtils.today());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  
  // === UI СОСТОЯНИЕ ===
  const [activeTab, setActiveTab] = useState('home');
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showCompleted, setShowCompleted] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  // === СТАТИСТИКА ===
  const [todayStats, setTodayStats] = useState({
    completed: 0,
    total: 0,
    percentage: 0,
    streak: 0
  });

  // Анимации
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const motivationAnim = useRef(new Animated.Value(0)).current;
  const tabSwitchAnim = useRef(new Animated.Value(0)).current;

  // === ФУНКЦИИ СОХРАНЕНИЯ ===
  const saveAchievements = useCallback(async (newAchievements) => {
    try {
      if (!newAchievements) return;
      await AsyncStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(newAchievements));
      setAchievements(newAchievements);
    } catch (error) {
      console.error('Ошибка сохранения достижений:', error);
    }
  }, []);

  const saveHabits = useCallback(async (newHabits) => {
    try {
      if (!newHabits) {
        console.log('saveHabits: нет данных для сохранения');
        return;
      }
      
      console.log('saveHabits: сохраняем', newHabits.length, 'привычек');
      
      // Сначала обновляем state
      setHabits(newHabits);
      
      // Затем сохраняем в AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(newHabits));
      console.log('saveHabits: данные сохранены в AsyncStorage');
      
      // Проверяем достижения после каждого изменения
      setTimeout(() => {
        console.log('saveHabits: запускаем проверку достижений');
        checkForNewAchievements();
      }, 100);
      
    } catch (error) {
      console.error('Ошибка сохранения привычек:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить изменения');
      throw error;
    }
  }, [checkForNewAchievements]);

  const saveSettings = useCallback(async (newSettings) => {
    try {
      if (!newSettings) return;
      await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
    }
  }, []);

  // === ПРОВЕРКА ДОСТИЖЕНИЙ ===
  const checkForNewAchievements = useCallback(async () => {
    try {
      const newUnlockedAchievements = [];
      
      // Проверяем простые достижения
      if (habits.length >= 1) {
        const firstHabitAchievement = DEFAULT_ACHIEVEMENTS.find(a => a.id === 'first_habit');
        const isAlreadyUnlocked = achievements.some(a => a.id === 'first_habit');
        
        if (firstHabitAchievement && !isAlreadyUnlocked) {
          const unlockedAchievement = {
            ...firstHabitAchievement,
            unlockedAt: new Date().toISOString()
          };
          newUnlockedAchievements.push(unlockedAchievement);
        }
      }

      // Проверяем серии
      const maxStreak = Math.max(...habits.map(habit => statsUtils.getStreak(habit)), 0);
      if (maxStreak >= 7) {
        const streakAchievement = DEFAULT_ACHIEVEMENTS.find(a => a.id === 'streak_7');
        const isAlreadyUnlocked = achievements.some(a => a.id === 'streak_7');
        
        if (streakAchievement && !isAlreadyUnlocked) {
          const unlockedAchievement = {
            ...streakAchievement,
            unlockedAt: new Date().toISOString()
          };
          newUnlockedAchievements.push(unlockedAchievement);
        }
      }

      // Проверяем общее количество выполнений
      const totalCompletions = habits.reduce((sum, habit) => {
        return sum + Object.keys(habit.completions || {}).length;
      }, 0);
      
      if (totalCompletions >= 50) {
        const completionAchievement = DEFAULT_ACHIEVEMENTS.find(a => a.id === 'completion_50');
        const isAlreadyUnlocked = achievements.some(a => a.id === 'completion_50');
        
        if (completionAchievement && !isAlreadyUnlocked) {
          const unlockedAchievement = {
            ...completionAchievement,
            unlockedAt: new Date().toISOString()
          };
          newUnlockedAchievements.push(unlockedAchievement);
        }
      }
      
      if (newUnlockedAchievements.length > 0) {
        const updatedAchievements = [...achievements, ...newUnlockedAchievements];
        await saveAchievements(updatedAchievements);
        
        // Показываем уведомление о новом достижении
        setTimeout(() => {
          const achievement = newUnlockedAchievements[0];
          Alert.alert(
            '🏆 Новое достижение!',
            `"${achievement.name}"\n${achievement.description}`,
            [{ text: 'Круто!', style: 'default' }]
          );
        }, 500);
      }
    } catch (error) {
      console.error('Ошибка проверки достижений:', error);
    }
  }, [habits, achievements, saveAchievements]);

  // === ФУНКЦИИ ЗАГРУЗКИ (ИСПРАВЛЕНЫ ЗАВИСИМОСТИ) ===
  const loadHabits = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.habits);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validHabits = parsed.filter(habit => 
          habit && habit.id && habit.name && typeof habit.name === 'string'
        );
        setHabits(validHabits);
        return validHabits;
      } else {
        // Первый запуск - загружаем демо данные
        setIsFirstLaunch(true);
        const demoHabits = DEMO_HABITS.slice(0, 3);
        setHabits(demoHabits);
        await saveHabits(demoHabits);
        return demoHabits;
      }
    } catch (error) {
      console.error('Ошибка загрузки привычек:', error);
      const fallbackHabits = generateOnboardingHabits();
      setHabits(fallbackHabits);
      return fallbackHabits;
    }
  }, [saveHabits]);

  const loadAchievements = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.achievements);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAchievements(parsed || []);
        return parsed || [];
      }
      return [];
    } catch (error) {
      console.error('Ошибка загрузки достижений:', error);
      return [];
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.settings);
      if (stored) {
        const parsed = JSON.parse(stored);
        const mergedSettings = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(mergedSettings);
        return mergedSettings;
      } else {
        await saveSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
      return DEFAULT_SETTINGS;
    }
  }, [saveSettings]);

  // === ИНИЦИАЛИЗАЦИЯ И ОБНОВЛЕНИЕ (ИСПРАВЛЕНЫ ЗАВИСИМОСТИ) ===
  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        loadHabits(),
        loadAchievements(),
        loadSettings()
      ]);

      await checkForNewAchievements();
      
    } catch (error) {
      console.error('Ошибка инициализации приложения:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные приложения');
    } finally {
      setLoading(false);
    }
  }, [loadHabits, loadAchievements, loadSettings, checkForNewAchievements]);

  const updateTodayStats = useCallback(() => {
    if (!habits || habits.length === 0) {
      setTodayStats({ completed: 0, total: 0, percentage: 0, streak: 0 });
      return;
    }

    const completed = habits.filter(habit => {
      const completion = habit.completions?.[selectedDate];
      if (habit.type === 'boolean') {
        return Boolean(completion);
      } else {
        return completion && completion.completed;
      }
    }).length;
    
    const total = habits.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const currentStreaks = habits.map(habit => statsUtils.getStreak(habit));
    const maxStreak = Math.max(...currentStreaks, 0);
    
    setTodayStats({ completed, total, percentage, streak: maxStreak });
  }, [habits, selectedDate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeApp();
    setRefreshing(false);
  }, [initializeApp]);

  // === ОПЕРАЦИИ С ПРИВЫЧКАМИ ===
  const addHabit = useCallback(async (habitData) => {
    try {
      console.log('Создание привычки с данными:', habitData);
      
      if (!habitData || !habitData.name) {
        throw new Error('Данные привычки не валидны');
      }

      // Проверяем название
      if (habitData.name.trim().length < 3) {
        Alert.alert('Ошибка', 'Название должно содержать минимум 3 символа');
        return;
      }

      const habit = {
        id: generateId(),
        name: habitData.name.trim(),
  description: (habitData.description || '').trim(),
          icon: habitData.icon || '🎯',
        color: habitData.color || '#2196F3',
        category: habitData.category || 'health',
        type: habitData.type || 'boolean',
        targetValue: habitData.type !== 'boolean' ? (parseInt(habitData.targetValue) || 1) : undefined,
        unit: habitData.type !== 'boolean' ? habitData.unit : undefined,
        allowOverachievement: habitData.type !== 'boolean' ? habitData.allowOverachievement : undefined,
        targetDaysPerWeek: habitData.targetDaysPerWeek || 7,
        reminderTime: habitData.reminderTime || '09:00',
        createdAt: new Date().toISOString(),
        completions: {},
        archived: false
      };

      console.log('Созданная привычка:', habit);

      const newHabits = [...habits, habit];
      await saveHabits(newHabits);
      
      // Закрываем модальное окно
      setShowAddHabit(false);
      
      console.log('Привычка успешно создана и сохранена');
      
      return habit;
    } catch (error) {
      console.error('Ошибка создания привычки:', error);
      Alert.alert('Ошибка', 'Не удалось создать привычку: ' + error.message);
      setShowAddHabit(false);
    }
  }, [habits, saveHabits]);

  const editHabit = useCallback(async (habitData) => {
    try {
      if (!editingHabit) {
        Alert.alert('Ошибка', 'Не выбрана привычка для редактирования');
        return;
      }
      
      if (!habitData || !habitData.name) {
        Alert.alert('Ошибка', 'Данные привычки не валидны');
        return;
      }
      
      if (habitData.name.trim().length < 3) {
        Alert.alert('Ошибка', 'Название должно содержать минимум 3 символа');
        return;
      }

      const newHabits = habits.map(habit =>
        habit.id === editingHabit.id 
          ? { 
              ...habit, 
              ...habitData,
              name: habitData.name.trim(),
              description: habitData.description?.trim() || '',
              targetValue: habitData.type !== 'boolean' ? (parseInt(habitData.targetValue) || 1) : undefined,
              unit: habitData.type !== 'boolean' ? habitData.unit : undefined,
              allowOverachievement: habitData.type !== 'boolean' ? habitData.allowOverachievement : undefined,
              completions: habit.completions || {},
              updatedAt: new Date().toISOString() 
            }
          : habit
      );
      
      await saveHabits(newHabits);
      setShowAddHabit(false);
      setEditingHabit(null);
      
      console.log('Привычка успешно отредактирована');
    } catch (error) {
      console.error('Ошибка редактирования привычки:', error);
      Alert.alert('Ошибка', 'Не удалось отредактировать привычку');
      setShowAddHabit(false);
      setEditingHabit(null);
    }
  }, [editingHabit, habits, saveHabits]);

  const deleteHabit = useCallback(async (habitId) => {
    try {
      if (!habitId) return;
      
      Alert.alert(
        'Удалить привычку?',
        'Это действие нельзя отменить.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: async () => {
              const newHabits = habits.filter(h => h.id !== habitId);
              await saveHabits(newHabits);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Ошибка удаления привычки:', error);
      Alert.alert('Ошибка', 'Не удалось удалить привычку');
    }
  }, [habits, saveHabits]);

  const showMotivationalMessage = useCallback((isQuantitative = false) => {
    try {
      setTimeout(() => {
        const messages = isQuantitative ? 
          ['🎯 Цель достигнута!', '💪 Отличный результат!', '⭐ Превосходно!', '🔥 Так держать!'] :
          ['🎉 Отлично!', '💪 Так держать!', '⭐ Прогресс!', '🔥 Супер!'];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        console.log('Мотивация:', randomMessage);
      }, 100);
    } catch (error) {
      console.error('Ошибка показа мотивационного сообщения:', error);
    }
  }, []);

  const toggleHabitCompletion = useCallback(async (habitId, date) => {
    try {
      if (!habitId || !date) return;
      
      const newHabits = habits.map(habit => {
        if (habit.id === habitId) {
          const completions = { ...habit.completions };
          
          if (habit.type === 'boolean') {
            // Для булевых привычек простое переключение
            const wasCompleted = completions[date];
            completions[date] = !wasCompleted;
            
            if (!wasCompleted) {
              showMotivationalMessage();
            }
          } else {
            // Для количественных привычек удаляем запись при повторном клике
            if (completions[date]) {
              delete completions[date];
            }
          }
          
          return { ...habit, completions };
        }
        return habit;
      });
      
      await saveHabits(newHabits);
    } catch (error) {
      console.error('Ошибка переключения привычки:', error);
      Alert.alert('Ошибка', 'Не удалось обновить статус привычки');
    }
  }, [habits, saveHabits, showMotivationalMessage]);

  const updateHabitValue = useCallback(async (habitId, date, value) => {
    try {
      console.log('updateHabitValue вызвана:', { habitId, date, value });
      
      if (!habitId || !date || value === undefined || value === null) {
        console.log('Некорректные параметры:', { habitId, date, value });
        return;
      }
      
      const newHabits = habits.map(habit => {
        if (habit.id === habitId) {
          console.log('Найдена привычка:', habit.name, 'тип:', habit.type);
          
          const completions = { ...habit.completions };
          
          if (value > 0) {
            const completion = {
              value: value,
              completed: value >= (habit.targetValue || 1),
              timestamp: new Date().toISOString()
            };
            completions[date] = completion;
            
            console.log('Создано выполнение:', completion);
            
            // Показать мотивационное сообщение при достижении цели
            if (value >= (habit.targetValue || 1)) {
              showMotivationalMessage(true);
            }
          } else {
            // Удаляем запись если значение 0
            delete completions[date];
            console.log('Удалено выполнение для даты:', date);
          }
          
          const updatedHabit = { ...habit, completions };
          console.log('Обновленная привычка:', updatedHabit);
          return updatedHabit;
        }
        return habit;
      });
      
      console.log('Сохраняем новые привычки:', newHabits);
      await saveHabits(newHabits);
      
    } catch (error) {
      console.error('Ошибка обновления значения привычки:', error);
      Alert.alert('Ошибка', 'Не удалось обновить значение привычки');
    }
  }, [habits, saveHabits, showMotivationalMessage]);

  const unlockAchievement = useCallback(async (achievement) => {
    try {
      if (!achievement) return;
      
      const newAchievement = {
        ...achievement,
        unlockedAt: new Date().toISOString()
      };
      
      const newAchievements = [...achievements, newAchievement];
      await saveAchievements(newAchievements);
      
    } catch (error) {
      console.error('Ошибка разблокировки достижения:', error);
    }
  }, [achievements, saveAchievements]);

  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
  const startEditHabit = useCallback((habit) => {
    if (!habit) return;
    setEditingHabit(habit);
    setShowAddHabit(true);
  }, []);

  const handleFormSave = useCallback(async (habitData) => {
    try {
      console.log('Получены данные формы:', habitData);
      
      if (editingHabit) {
        await editHabit(habitData);
      } else {
        await addHabit(habitData);
      }
      
      console.log('Привычка успешно сохранена');
    } catch (error) {
      console.error('Ошибка в handleFormSave:', error);
    }
  }, [editingHabit, editHabit, addHabit]);

  const handleFormCancel = useCallback(() => {
    setShowAddHabit(false);
    setEditingHabit(null);
  }, []);

  const handleTabSwitch = useCallback((newTab) => {
    if (activeTab !== newTab) {
      Animated.spring(tabSwitchAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start(() => {
        setActiveTab(newTab);
        tabSwitchAnim.setValue(0);
      });
    }
  }, [activeTab, tabSwitchAnim]);

  // === ОТФИЛЬТРОВАННЫЕ ПРИВЫЧКИ ===
  const filteredHabits = useMemo(() => {
    let filtered = [...habits];
    
    // Фильтр по категории
    if (filterCategory !== 'all') {
      filtered = filtered.filter(habit => habit.category === filterCategory);
    }
    
    // Фильтр по выполненности
    if (!showCompleted) {
      filtered = filtered.filter(habit => {
        const completion = habit.completions?.[selectedDate];
        if (habit.type === 'boolean') {
          return !completion;
        } else {
          return !completion || !completion.completed;
        }
      });
    }
    
    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'streak':
          return statsUtils.getStreak(b) - statsUtils.getStreak(a);
        case 'completion':
          return statsUtils.getCompletionRate(b, 30) - statsUtils.getCompletionRate(a, 30);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [habits, filterCategory, showCompleted, selectedDate, sortBy]);

  // === РЕНДЕР КОМПОНЕНТОВ ===
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Привычки
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {new Date().toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProgress = () => (
    <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressTitle, { color: colors.text }]}>
          Сегодняшний прогресс
        </Text>
        <Text style={[styles.progressNumbers, { color: colors.primary }]}>
          {todayStats.completed} из {todayStats.total}
        </Text>
      </View>
      
      <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${todayStats.percentage}%`,
              backgroundColor: colors.primary,
            }
          ]}
        />
      </View>
      
      <View style={styles.progressStats}>
        <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
          {todayStats.percentage}% выполнено
        </Text>
        <View style={styles.streakInfo}>
          <Ionicons name="flame" size={16} color="#FF6B35" />
          <Text style={[styles.streakText, { color: colors.textSecondary }]}>
            Серия: {todayStats.streak}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderMotivationalQuote = () => {
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    
    return (
      <Animated.View 
        style={[
          styles.motivationCard, 
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border,
            opacity: motivationAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.7, 1]
            })
          }
        ]}
      >
        <Text style={[styles.motivationText, { color: colors.text }]}>
          "{quote.text}"
        </Text>
        <Text style={[styles.motivationAuthor, { color: colors.textSecondary }]}>
          — {quote.author}
        </Text>
      </Animated.View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContent}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: filterCategory === 'all' ? colors.primary : colors.surface,
            }
          ]}
          onPress={() => setFilterCategory('all')}
        >
          <Text style={styles.filterButtonIcon}>🏠</Text>
          <Text style={[
            styles.filterButtonText,
            { color: filterCategory === 'all' ? '#ffffff' : colors.textSecondary }
          ]}>
            Все
          </Text>
        </TouchableOpacity>
        
        {Object.entries(HABIT_CATEGORIES).map(([key, category]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterButton,
              {
                backgroundColor: filterCategory === key ? colors.primary : colors.surface,
              }
            ]}
            onPress={() => setFilterCategory(key)}
          >
            <Text style={styles.filterButtonIcon}>{category.icon}</Text>
            <Text style={[
              styles.filterButtonText,
              { color: filterCategory === key ? '#ffffff' : colors.textSecondary }
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.surface }]}
          onPress={() => {
            const sorts = ['name', 'category', 'streak', 'completion'];
            const currentIndex = sorts.indexOf(sortBy);
            const nextSort = sorts[(currentIndex + 1) % sorts.length];
            setSortBy(nextSort);
          }}
        >
          <Ionicons name="funnel-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHabitsList = () => (
    <View style={styles.habitsList}>
      <View style={styles.habitsHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Привычки ({filteredHabits.length})
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddHabit(true)}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      {filteredHabits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {habits.length === 0 ? 'Создайте первую привычку' : 'Нет привычек по фильтру'}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            {habits.length === 0 
              ? 'Начните с простой привычки или попробуйте количественную с подсчетом'
              : 'Попробуйте изменить фильтры или создать новую привычку'
            }
          </Text>
          <TouchableOpacity
            style={[styles.emptyActionButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddHabit(true)}
          >
            <Ionicons name="add-circle" size={20} color="#ffffff" />
            <Text style={styles.emptyActionText}>Добавить привычку</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.habitsList}>
          {filteredHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              selectedDate={selectedDate}
              onToggle={(habitId, date) => {
                console.log('Toggle вызван для:', habitId, date);
                toggleHabitCompletion(habitId, date);
              }}
              onUpdateValue={(habitId, date, value) => {
                console.log('UpdateValue вызван для:', habitId, date, value);
                updateHabitValue(habitId, date, value);
              }}
              onEdit={startEditHabit}
              onDelete={deleteHabit}
              theme={settings.theme}
              isDarkMode={settings.isDarkMode}
            />
          ))}
        </View>
      )}
    </View>
  );

  // УПРОЩЕННЫЕ ПЛЕЙСХОЛДЕРЫ ВМЕСТО НЕОПРЕДЕЛЕННЫХ КОМПОНЕНТОВ
  const renderCalendar = () => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderIcon}>📅</Text>
      <Text style={[styles.placeholderText, { color: colors.text }]}>
        Календарь
      </Text>
      <Text style={[styles.placeholderDescription, { color: colors.textSecondary }]}>
        Календарный вид с тепловой картой в разработке
      </Text>
    </View>
  );

  const renderStatistics = () => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderIcon}>📊</Text>
      <Text style={[styles.placeholderText, { color: colors.text }]}>
        Статистика
      </Text>
      <Text style={[styles.placeholderDescription, { color: colors.textSecondary }]}>
        Продвинутая аналитика в разработке
      </Text>
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderIcon}>🏆</Text>
      <Text style={[styles.placeholderText, { color: colors.text }]}>
        Достижения
      </Text>
      <Text style={[styles.placeholderDescription, { color: colors.textSecondary }]}>
        Система наград в разработке
      </Text>
      {achievements.length > 0 && (
        <View style={styles.achievementsList}>
          <Text style={[styles.achievementsTitle, { color: colors.text }]}>
            Получено достижений: {achievements.length}
          </Text>
          {achievements.slice(0, 3).map((achievement, index) => (
            <View key={index} style={[styles.achievementItem, { backgroundColor: colors.surface }]}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <Text style={[styles.achievementName, { color: colors.text }]}>
                {achievement.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderTabBar = () => (
    <View style={[
      styles.tabBar, 
      { 
        backgroundColor: colors.card, 
        borderColor: colors.border,
        paddingBottom: Platform.OS === 'android' ? SPACING.md : SPACING.sm,
      }
    ]}>
      {[
        { id: 'home', label: 'Дом', icon: 'home-outline' },
        { id: 'calendar', label: 'Календарь', icon: 'calendar-outline' },
        { id: 'stats', label: 'Статистика', icon: 'bar-chart-outline' },
        { id: 'achievements', label: 'Награды', icon: 'trophy-outline' }
      ].map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tabButton,
            { backgroundColor: activeTab === tab.id ? colors.primary + '15' : 'transparent' }
          ]}
          onPress={() => handleTabSwitch(tab.id)}
        >
          <Ionicons
            name={tab.icon}
            size={22}
            color={activeTab === tab.id ? colors.primary : colors.textSecondary}
          />
          <Text style={[
            styles.tabLabel,
            { color: activeTab === tab.id ? colors.primary : colors.textSecondary }
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // === ЭФФЕКТЫ ===
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    updateTodayStats();
  }, [updateTodayStats]);

  useEffect(() => {
    if (isFirstLaunch && !loading && habits.length > 0) {
      setTimeout(() => {
        Alert.alert(
          '🎉 Добро пожаловать!',
          'Мы создали для вас несколько примеров привычек. Попробуйте простые (да/нет) и количественные привычки!',
          [{ text: 'Понятно', style: 'default' }]
        );
      }, 1000);
    }
  }, [isFirstLaunch, loading, habits.length]);

  useEffect(() => {
    // Анимация мотивационного блока
    Animated.loop(
      Animated.sequence([
        Animated.timing(motivationAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(motivationAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [motivationAnim]);

  // === ЦВЕТА ===
  const colors = THEMES[settings.theme] ? 
    THEMES[settings.theme][settings.isDarkMode ? 'dark' : 'light'] : 
    THEMES.blue.light;

  // === РЕНДЕР ===
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingSpinner, {
            transform: [{ rotate: motivationAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg']
            }) }]
          }]}>
            <Ionicons name="refresh" size={32} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Загрузка ваших привычек...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={settings.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {renderHeader()}
      
      <Animated.ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: true,
            listener: (event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              const newOpacity = Math.max(0, Math.min(1, 1 - offsetY / 100));
              headerOpacity.setValue(newOpacity);
            }
          }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Контент в зависимости от активной вкладки */}
        <Animated.View 
          style={[
            styles.tabContent,
            {
              opacity: tabSwitchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0]
              })
            }
          ]}
        >
          {activeTab === 'home' && (
            <>
              {renderProgress()}
              {habits.length > 0 && renderMotivationalQuote()}
              {renderFilters()}
              {renderHabitsList()}
            </>
          )}
          
          {activeTab === 'calendar' && (
            <>
              {renderProgress()}
              {renderCalendar()}
            </>
          )}
          
          {activeTab === 'stats' && (
            <>
              {renderStatistics()}
            </>
          )}
          
          {activeTab === 'achievements' && (
            <>
              {renderAchievements()}
            </>
          )}
        </Animated.View>
      </Animated.ScrollView>
      
      {renderTabBar()}
      
      {/* Floating Action Button */}
      <Animated.View 
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            transform: [{ scale: fabScale }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setShowAddHabit(true)}
          onPressIn={() => {
            Animated.spring(fabScale, {
              toValue: 0.9,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(fabScale, {
              toValue: 1,
              useNativeDriver: true,
            }).start();
          }}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Модальные окна */}
      <HabitFormModal
        visible={showAddHabit}
        habit={editingHabit}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
        theme={settings.theme}
        isDarkMode={settings.isDarkMode}
      />
      
      <SettingsScreen
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={saveSettings}
        habits={habits}
        achievements={achievements}
      />
    </SafeAreaView>
  );
};

// === СТИЛИ ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingSpinner: {
    marginBottom: SPACING.lg,
  },
  
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
  },
  
  content: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? 120 : 100,
  },
  
  tabContent: {
    flex: 1,
  },
  
  // === ЗАГОЛОВОК ===
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  progressPercentage: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  streakText: {
    ...TYPOGRAPHY.bodyMedium,
    marginLeft: SPACING.xs,
  },
  
  // === МОТИВАЦИЯ ===
  motivationCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    margin: SPACING.md,
    marginTop: 0,
  },
  
  motivationText: {
    ...TYPOGRAPHY.body,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },
  
  motivationAuthor: {
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'right',
  },
  
  // === ФИЛЬТРЫ ===
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  
  filtersContent: {
    flex: 1,
  },
  
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
  },
  
  filterButtonIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  
  filterButtonText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  
  sortContainer: {
    flexDirection: 'row',
  },
  
  sortButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // === СПИСКИ ===
  habitsList: {
    paddingHorizontal: SPACING.md,
  },
  
  habitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
  },
  
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // === ПУСТОЕ СОСТОЯНИЕ ===
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
  },
  
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  
  emptyDescription: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
  },
  
  emptyActionText: {
    ...TYPOGRAPHY.button,
    color: '#ffffff',
    fontWeight: '600',
  },

  // === ПЛЕЙСХОЛДЕРЫ ===
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
    minHeight: 300,
  },
  
  placeholderIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  
  placeholderDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },

  // === ДОСТИЖЕНИЯ ===
  achievementsList: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    minWidth: 200,
  },
  
  achievementIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  
  achievementName: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // === НАВИГАЦИЯ ===
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.xs,
  },
  
  tabLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  
  // === FAB ===
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 90 : 80,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  
  fabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;