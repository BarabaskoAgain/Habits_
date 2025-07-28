// ====================================
// ИСПРАВЛЕННОЕ ПРИЛОЖЕНИЕ С ПРАВИЛЬНЫМИ ЗАВИСИМОСТЯМИ ХУКОВ + тестим гит
// App.js - БЕЗ ОШИБОК ESLINT + ФУНКЦИИ АРХИВИРОВАНИЯ
// ====================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StatusBar,
  AppState,
  Alert,
  Platform,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// Импорт компонентов
import MainApp from './MainApp';
import HabitFormModal from './HabitFormModal';
import SettingsScreen from './SettingsScreen';

// ИСПРАВЛЕННЫЙ ИМПОРТ УВЕДОМЛЕНИЙ
import NotificationManager from './NotificationManager';

// Импорт констант
import {
  THEMES,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  DEFAULT_ACHIEVEMENTS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
} from './constants';

import { DEMO_HABITS, generateOnboardingHabits } from './demoData';
import { generateId, dateUtils, statsUtils, weightUtils } from './utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// === ВНУТРЕННИЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ ===
const AppContent = () => {
  // === SAFE AREA INSETS ===
  const insets = useSafeAreaInsets();

  // === СОСТОЯНИЕ ===
  const [habits, setHabits] = useState([]);
  const [archivedHabits, setArchivedHabits] = useState([]); // НОВОЕ: Архивированные привычки
  const [achievements, setAchievements] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
 // isLoading убрано - используем только стандартный Expo splash
  const [appState, setAppState] = useState(AppState.currentState);

  // === UI СОСТОЯНИЕ ===
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
const [isFirstLaunch, setIsFirstLaunch] = useState(false);
const [notificationsInitialized, setNotificationsInitialized] = useState(false);

  // === ЦВЕТОВАЯ СХЕМА ===
  const colors =
    THEMES[settings.theme]?.[settings.isDarkMode ? 'dark' : 'light'] ||
    THEMES.blue.light;

  // === НОВЫЕ HELPER ФУНКЦИИ (ПСИХОЛОГИЯ) ===

  // Расчет прогресса дня
  const calculateDayProgress = useCallback((habits, date) => {
    let completed = 0;
    let total = 0;

    habits.forEach((habit) => {
      if (habit.isActive === false) return;

      total++;
      const completion = habit.completions?.[date];

      if (habit.type === 'boolean' && completion) {
        completed++;
      } else if (habit.type === 'weight' && completion?.weight > 0) {
        completed++;
      } else if (habit.type === 'number' && completion?.completed) {
        completed++;
      }
    });

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, []);

  // Проверка достижений
  const checkForNewAchievements = useCallback(async () => {
    try {
      const unlocked = achievements.map((a) => a.id);
      const available = DEFAULT_ACHIEVEMENTS.filter(
        (a) => !unlocked.includes(a.id)
      );

      if (available.length === 0) {
        console.log('Все достижения уже разблокированы');
        return;
      }

      const newUnlockedAchievements = [];

      // Первая привычка
      if (habits.length > 0 && !unlocked.includes('first_habit')) {
        const achievement = available.find((a) => a.id === 'first_habit');
        if (achievement) newUnlockedAchievements.push(achievement);
      }

      // Другие проверки достижений...

      // Разблокируем новые достижения
      if (newUnlockedAchievements.length > 0 && isReady) {
        for (const achievement of newUnlockedAchievements) {
          await unlockAchievement(achievement);
          setTimeout(() => {
            Alert.alert(
              'Новое достижение!',
              `"${achievement.name}"\n${achievement.description}`,
              [{ text: 'Круто!', style: 'default' }]
            );
          }, 500);
        }
      }
    } catch (error) {
      console.error('Ошибка проверки достижений:', error);
    }
  }, [habits, achievements]);

  // === ФУНКЦИИ СОХРАНЕНИЯ ===
  const saveAchievements = useCallback(async (newAchievements) => {
    try {
      if (!newAchievements) return;
      await AsyncStorage.setItem(
        STORAGE_KEYS.achievements,
        JSON.stringify(newAchievements)
      );
      setAchievements(newAchievements);
    } catch (error) {
      console.error('Ошибка сохранения достижений:', error);
    }
  }, []);

  const saveHabits = useCallback(
    async (newHabits) => {
      try {
        if (!newHabits) {
          console.log('saveHabits: нет данных для сохранения');
          return;
        }

        console.log('saveHabits: сохраняем', newHabits.length, 'привычек');

        // Сначала обновляем state
        setHabits(newHabits);

        // Затем сохраняем в AsyncStorage
        await AsyncStorage.setItem(
          STORAGE_KEYS.habits,
          JSON.stringify(newHabits)
        );
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
    },
    [checkForNewAchievements]
  );

  // ИСПРАВЛЕННАЯ ФУНКЦИЯ saveSettings БЕЗ АВТОМАТИЧЕСКИХ УВЕДОМЛЕНИЙ
  const saveSettings = useCallback(async (newSettings) => {
    try {
      if (!newSettings) return;
      await AsyncStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify(newSettings)
      );
      setSettings(newSettings);

      console.log(
        '✅ Настройки сохранены (уведомления НЕ планируются автоматически)'
      );
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
    }
  }, []);

  // === ФУНКЦИИ АРХИВИРОВАНИЯ ===
  const saveArchivedHabits = useCallback(async (archived) => {
    try {
      await AsyncStorage.setItem('@archivedHabits', JSON.stringify(archived));
      setArchivedHabits(archived);
    } catch (error) {
      console.error('Ошибка сохранения архива:', error);
    }
  }, []);

const archiveHabit = useCallback(async (habitId) => {
    console.log('🗂️🗂️🗂️ App.js: archiveHabit ВЫЗВАНА! habitId =', habitId);
    console.log('🗂️ App.js: Текущие привычки:', habits.length);
    console.log('🗂️ App.js: Текущий архив:', archivedHabits.length);
    
    try {
      const habitToArchive = habits.find(h => h.id === habitId);
      console.log('🗂️ App.js: Найдена привычка для архивирования?', !!habitToArchive);
      
      if (!habitToArchive) {
        console.error('🗂️ App.js: Привычка не найдена! ID:', habitId);
        console.log('🗂️ App.js: Доступные ID привычек:', habits.map(h => h.id));
        return;
      }

      console.log('🗂️ App.js: Архивируем привычку:', habitToArchive.name);

      // Упрощенный расчет статистики
      const startDate = new Date(habitToArchive.createdAt);
      const endDate = new Date();
      
      // Считаем дни с момента создания
      const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
      
      // Считаем выполненные дни
      let completedDays = 0;
      if (habitToArchive.completions) {
        Object.entries(habitToArchive.completions).forEach(([date, completion]) => {
          if (habitToArchive.type === 'boolean' && completion) {
            completedDays++;
          } else if (habitToArchive.type === 'weight' && completion?.weight > 0) {
            completedDays++;
          } else if ((habitToArchive.type === 'number' || habitToArchive.type === 'quantitative') && completion?.completed) {
            completedDays++;
          }
        });
      }
      
      const completionPercentage = Math.round((completedDays / totalDays) * 100);
      console.log('🗂️ App.js: Статистика - дней:', totalDays, 'выполнено:', completedDays, 'процент:', completionPercentage);

      const archivedHabit = {
        ...habitToArchive,
        archivedAt: new Date().toISOString(),
        completionPercentage,
        archiveStats: {
          totalDays,
          completedDays,
          completionPercentage,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      };

      // Обновляем состояния
      const newHabits = habits.filter(h => h.id !== habitId);
      const newArchivedHabits = [...archivedHabits, archivedHabit];

      console.log('🗂️ App.js: Сохраняем изменения...');
      await saveHabits(newHabits);
      await saveArchivedHabits(newArchivedHabits);
      console.log('🗂️ App.js: Изменения сохранены!');

      // Отменяем уведомления для архивированной привычки
      if (notificationsInitialized) {
        await NotificationManager.cancelHabitReminder(habitId);
      }

      Alert.alert(
        'Привычка завершена!',
        `"${habitToArchive.name}" перемещена в архив.\nВыполнено: ${completionPercentage}%`,
        [{ text: 'OK' }]
      );

      console.log('🗂️ App.js: Архивирование завершено успешно!');

    } catch (error) {
      console.error('🗂️ App.js: ОШИБКА архивирования:', error);
      console.error('🗂️ App.js: Stack trace:', error.stack);
      Alert.alert('Ошибка', 'Не удалось архивировать привычку: ' + error.message);
    }
  }, [habits, archivedHabits, saveHabits, saveArchivedHabits, notificationsInitialized]);

  const restoreHabit = useCallback(
    async (habitId) => {
      try {
        const habitToRestore = archivedHabits.find((h) => h.id === habitId);
        if (!habitToRestore) return;

        // Проверяем, восстанавливаем ли в день архивирования
        const today = new Date().toISOString().split('T')[0];
        const archivedDate = habitToRestore.archivedAt
          ? new Date(habitToRestore.archivedAt).toISOString().split('T')[0]
          : null;

        // Если восстанавливаем НЕ в день архивирования - обновляем createdAt
        const shouldUpdateCreatedAt = archivedDate !== today;

        const restoredHabit = {
          ...habitToRestore,
          createdAt: shouldUpdateCreatedAt
            ? new Date().toISOString()
            : habitToRestore.createdAt,
          isRestored: true, // Помечаем как восстановленную
          restoredAt: new Date().toISOString(),
          // СОХРАНЯЕМ архивные данные для суммирования
          previousArchiveStats: habitToRestore.archiveStats,
          // Удаляем только текущие архивные поля
          archivedAt: undefined,
          completionPercentage: undefined,
        };

        // Удаляем undefined поля
        delete restoredHabit.archivedAt;
        delete restoredHabit.completionPercentage;

        // Обновляем состояния
        const newArchivedHabits = archivedHabits.filter(
          (h) => h.id !== habitId
        );
        const newHabits = [...habits, restoredHabit];

        await saveHabits(newHabits);
        await saveArchivedHabits(newArchivedHabits);

        Alert.alert(
          'Привычка восстановлена!',
          `"${restoredHabit.name}" снова активна`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Ошибка восстановления:', error);
        Alert.alert('Ошибка', 'Не удалось восстановить привычку');
      }
    },
    [habits, archivedHabits, saveHabits, saveArchivedHabits]
  );

  const deleteArchivedHabit = useCallback(
    async (habitId) => {
      try {
        const habit = archivedHabits.find((h) => h.id === habitId);
        if (!habit) return;

        Alert.alert(
          'Удалить навсегда?',
          `"${habit.name}" будет удалена безвозвратно.`,
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              style: 'destructive',
              onPress: async () => {
                const newArchivedHabits = archivedHabits.filter(
                  (h) => h.id !== habitId
                );
                await saveArchivedHabits(newArchivedHabits);
                Alert.alert('Удалено', 'Привычка удалена из архива');
              },
            },
          ]
        );
      } catch (error) {
        console.error('Ошибка удаления из архива:', error);
        Alert.alert('Ошибка', 'Не удалось удалить привычку');
      }
    },
    [archivedHabits, saveArchivedHabits]
  );

  // === ОБРАБОТЧИК ИЗМЕНЕНИЯ СОСТОЯНИЯ ПРИЛОЖЕНИЯ ===
  const handleAppStateChange = useCallback(
    (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // Приложение вернулось в активное состояние - проверяем достижения
        setTimeout(() => checkForNewAchievements(), 500);
      }
      setAppState(nextAppState);
    },
    [appState, checkForNewAchievements]
  );

  // === ФУНКЦИИ ЗАГРУЗКИ ===

  const loadHabits = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.habits);
      if (stored) {
        const parsed = JSON.parse(stored);
        // ДОБАВЛЕНО: проверка цвета для старых привычек
        const habitsWithColors = parsed.map((habit) => ({
          ...habit,
          color: habit.color || '#2196F3', // Синий по умолчанию
        }));
        setHabits(habitsWithColors);
        return habitsWithColors;
      } else {
        // Первый запуск - создаем демо привычки
        console.log('Первый запуск - создаем демо привычки');
        const demoHabits = generateOnboardingHabits();
        await saveHabits(demoHabits);
        setIsFirstLaunch(true);
        return demoHabits;
      }
    } catch (error) {
      console.error('Ошибка загрузки привычек:', error);
      return [];
    }
  }, [saveHabits]);

  const loadAchievements = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.achievements);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAchievements(parsed);
        return parsed;
      } else {
        return [];
      }
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

  const loadArchivedHabits = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@archivedHabits');
      if (stored) {
        const parsed = JSON.parse(stored);
        setArchivedHabits(parsed);
        return parsed;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Ошибка загрузки архива:', error);
      return [];
    }
  }, []);

  // === ОБРАБОТЧИК ОШИБОК ИНИЦИАЛИЗАЦИИ ===
  const handleInitializationError = useCallback(
    (error) => {
      Alert.alert(
        'Ошибка запуска',
        'Произошла ошибка при загрузке приложения. Попробуйте перезапустить.',
        [
          {
            text: 'Перезапустить',
            onPress: () => {
              // Прямая инициализация
Promise.all([
  loadHabits(),
  loadAchievements(),
  loadSettings(),
  loadArchivedHabits(),
])
  .then(() => {
    checkForNewAchievements();
  })
  .catch((err) => {
    console.error('Повторная ошибка инициализации:', err);
  });
            },
          },
        ]
      );
    },
    [
      loadHabits,
      loadAchievements,
      loadSettings,
      loadArchivedHabits,
      checkForNewAchievements,
    ]
  );

const initializeApp = useCallback(async () => {
  try {
    // Загружаем все данные параллельно
    const [loadedHabits, loadedAchievements, loadedSettings, loadedArchived] =
      await Promise.all([
        loadHabits(),
        loadAchievements(),
        loadSettings(),
        loadArchivedHabits(),
      ]);

    console.log('Загружено:', {
      habits: loadedHabits.length,
      achievements: loadedAchievements.length,
      archived: loadedArchived.length,
      settings: loadedSettings,
    });

  } catch (error) {
    console.error('Ошибка инициализации:', error);
    handleInitializationError(error);
  }
}, [
  loadHabits,
  loadAchievements,
  loadSettings,
  loadArchivedHabits,
  handleInitializationError,
]);

  // === ИСПРАВЛЕННАЯ ИНИЦИАЛИЗАЦИЯ УВЕДОМЛЕНИЙ (ТОЛЬКО ОДИН РАЗ) ===
  useEffect(() => {
    const initializeNotifications = async () => {
      // Проверяем, что приложение готово, есть привычки и уведомления еще не инициализированы
      if (isReady && habits.length > 0 && !notificationsInitialized) {
        console.log('🔔 Инициализация уведомлений ОДИН РАЗ...');

        try {
          // Инициализируем уведомления
          const notificationsEnabled = await NotificationManager.initialize();

          if (notificationsEnabled) {
            console.log('✅ Уведомления инициализированы успешно');

            // Планируем напоминания для всех привычек одним вызовом
            await NotificationManager.scheduleAllReminders(habits, settings);

            // Показываем отладочную информацию
            await NotificationManager.debugInfo();
          } else {
            console.log('❌ Уведомления отключены пользователем');
          }

          // Помечаем как инициализированные
          setNotificationsInitialized(true);
        } catch (error) {
          console.error('🚨 Ошибка инициализации уведомлений:', error);
          setNotificationsInitialized(true); // Помечаем как инициализированные даже при ошибке
        }
      }
    }

    initializeNotifications();
  }, [habits, notificationsInitialized, settings]);

  // === ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ПРИ МОНТИРОВАНИИ ===
  useEffect(() => {
    console.log('🚀 Запуск приложения...');
    initializeApp();

    // Подписка на изменения состояния приложения
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  const addHabit = useCallback(
    async (habitData) => {
      try {
        const newHabit = {
          id: generateId(),
          ...habitData,
          reminderEnabled: habitData.reminderEnabled !== false, // По умолчанию true
          reminderTime: habitData.reminderTime || '09:00', // Время по умолчанию
          createdAt: new Date().toISOString(),
          completions: {},
          logs: [], // ВАЖНО: Добавляем пустой массив логов
        };

        const newHabits = [...habits, newHabit];
        await saveHabits(newHabits);

        // ---- Планирование уведомлений ----
        let notificationSuccess = false;
        if (newHabit.reminderEnabled && newHabit.reminderTime) {
          try {
            if (notificationsInitialized) {
              notificationSuccess =
                await NotificationManager.scheduleHabitReminder(
                  newHabit,
                  settings
                );
            } else {
              console.log(
                'Уведомления еще не инициализированы, будут запланированы позже'
              );
              notificationSuccess = true; // Считаем успешным, т.к. запланируются при инициализации
            }
          } catch (error) {
            console.error('Ошибка при планировании уведомления:', error);
          }
        } else {
          notificationSuccess = true; // Если уведомления отключены - не ошибка
        }

        // Уведомляем пользователя о результате
        if (notificationSuccess || !newHabit.reminderEnabled) {
          Alert.alert('Успех!', 'Привычка создана и уведомления настроены');
        } else {
          Alert.alert(
            'Внимание',
            'Привычка создана, но уведомление не удалось запланировать.\nПроверьте разрешения в настройках устройства.'
          );
        }

        setShowAddHabit(false);
        setEditingHabit(null);
      } catch (error) {
        console.error('Ошибка добавления привычки:', error);
        Alert.alert('Ошибка', 'Не удалось создать привычку');
      }
    },
    [habits, saveHabits, notificationsInitialized, settings]
  );

  const editHabit = useCallback(
    async (habitData) => {
      try {
        console.log('Редактирование привычки:', habitData);

        // Находим старую привычку
        const oldHabit = habits.find((h) => h.id === editingHabit.id);
        if (!oldHabit) {
          throw new Error('Привычка не найдена');
        }

        // Обновляем привычку с сохранением всех существующих данных
        const updatedHabits = habits.map((habit) => {
          if (habit.id === editingHabit.id) {
            return {
              ...habit,
              ...habitData,
              // Явно сохраняем важные поля которые не должны изменяться
              id: habit.id,
              createdAt: habit.createdAt,
              completions: habit.completions || {},
              logs: habit.logs || [],
              // Сохраняем поля уведомлений если они не переданы
              reminderEnabled:
                habitData.reminderEnabled !== undefined
                  ? habitData.reminderEnabled
                  : habit.reminderEnabled,
              reminderTime:
                habitData.reminderTime || habit.reminderTime || '09:00',
              // Обновляем время изменения
              updatedAt: new Date().toISOString(),
            };
          }
          return habit;
        });

        await saveHabits(updatedHabits);

        // Обновляем уведомление, если изменились настройки
        if (notificationsInitialized) {
          const updatedHabit = updatedHabits.find(
            (h) => h.id === editingHabit.id
          );

          // Используем новый метод updateHabitReminder
          await NotificationManager.updateHabitReminder(updatedHabit, settings);
        }

        Alert.alert('Успех!', 'Привычка обновлена');
        setShowAddHabit(false);
        setEditingHabit(null);
      } catch (error) {
        console.error('Ошибка редактирования привычки:', error);
        Alert.alert('Ошибка', 'Не удалось обновить привычку');
      }
    },
    [habits, editingHabit, saveHabits, notificationsInitialized, settings]
  );

  const deleteHabit = useCallback(
    async (habitId) => {
      try {
        const habit = habits.find((h) => h.id === habitId);
        if (!habit) return;

        Alert.alert(
          'Удалить привычку?',
          `"${habit.name}" будет удалена навсегда.`,
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              style: 'destructive',
              onPress: async () => {
                const newHabits = habits.filter((h) => h.id !== habitId);
                await saveHabits(newHabits);

                // Отменяем уведомление
                if (notificationsInitialized) {
                  await NotificationManager.cancelHabitReminder(habitId);
                }

                Alert.alert('Удалено', 'Привычка удалена');
              },
            },
          ]
        );
      } catch (error) {
        console.error('Ошибка удаления привычки:', error);
        Alert.alert('Ошибка', 'Не удалось удалить привычку');
      }
    },
    [habits, saveHabits, notificationsInitialized]
  );

  const toggleHabitCompletion = useCallback(
    async (habitId, date) => {
      try {
        console.log('toggleHabitCompletion вызван:', { habitId, date });

        const updatedHabits = habits.map((habit) => {
          if (habit.id === habitId) {
            const completions = { ...habit.completions };

            if (habit.type === 'boolean') {
              // Переключаем состояние
              if (completions[date]) {
                delete completions[date];
                console.log('Удалено выполнение для даты:', date);
              } else {
                completions[date] = true;
                console.log('Добавлено выполнение для даты:', date);
              }
            }

            const updatedHabit = { ...habit, completions };
            console.log('Обновленная привычка:', updatedHabit);
            return updatedHabit;
          }
          return habit;
        });

        console.log('Сохраняем новые привычки:', updatedHabits);
        await saveHabits(updatedHabits);
      } catch (error) {
        console.error('Ошибка переключения привычки:', error);
        Alert.alert('Ошибка', 'Не удалось обновить привычку');
      }
    },
    [habits, saveHabits]
  );

  const updateHabitValue = useCallback(
    async (habitId, date, value) => {
      try {
        console.log('updateHabitValue вызван:', { habitId, date, value });

        const updatedHabits = habits.map((habit) => {
          if (habit.id === habitId) {
            const completions = { ...habit.completions };
            const logs = [...(habit.logs || [])];

            if (habit.type === 'weight') {
              // Для веса - правильно обрабатываем объект с данными
              const weightValue =
                typeof value === 'object' && value.weight
                  ? value.weight
                  : value;

              if (weightValue > 0) {
                const completion = {
                  weight: parseFloat(weightValue),
                  timestamp: value.timestamp || new Date().toISOString(),
                  targetWeight: value.targetWeight || habit.targetWeight,
                };
                completions[date] = completion;

                // Добавляем в логи
                const existingLogIndex = logs.findIndex(
                  (log) => log.date === date
                );
                if (existingLogIndex >= 0) {
                  logs[existingLogIndex] = {
                    ...logs[existingLogIndex],
                    weight: parseFloat(weightValue),
                    timestamp: completion.timestamp,
                  };
                } else {
                  logs.push({
                    date,
                    weight: parseFloat(weightValue),
                    timestamp: completion.timestamp,
                  });
                }

                console.log('Добавлен вес:', completion);
              } else {
                delete completions[date];
                // Удаляем из логов
                const logIndex = logs.findIndex((log) => log.date === date);
                if (logIndex >= 0) {
                  logs.splice(logIndex, 1);
                }
                console.log('Удален вес для даты:', date);
              }
            } else if (
              habit.type === 'quantitative' ||
              habit.type === 'number'
            ) {
              // Для количественных привычек
              if (value > 0) {
                const completion = {
                  value: value,
                  completed: value >= (habit.targetValue || 1),
                  timestamp: new Date().toISOString(),
                };
                completions[date] = completion;
                console.log('Создано выполнение:', completion);
              } else {
                delete completions[date];
                console.log('Удалено выполнение для даты:', date);
              }
            }

            const updatedHabit = { ...habit, completions, logs };
            console.log('Обновленная привычка:', updatedHabit);
            return updatedHabit;
          }
          return habit;
        });

        console.log('Сохраняем новые привычки:', updatedHabits);
        await saveHabits(updatedHabits);
      } catch (error) {
        console.error('Ошибка обновления значения привычки:', error);
        Alert.alert('Ошибка', 'Не удалось обновить значение привычки');
      }
    },
    [habits, saveHabits]
  );

  /*
  // ОБНОВЛЕННАЯ ФУНКЦИЯ unlockAchievement С УВЕДОМЛЕНИЯМИ
  const unlockAchievement = useCallback(async (achievement) => {
    try {
      if (!achievement) return;
      
      const newAchievement = {
        ...achievement,
        unlockedAt: new Date().toISOString()
      };
      
      const newAchievements = [...achievements, newAchievement];
      await saveAchievements(newAchievements);


 // === УВЕДОМЛЕНИЕ О ДОСТИЖЕНИИ (ТОЛЬКО ЕСЛИ УВЕДОМЛЕНИЯ ВКЛЮЧЕНЫ) ===
if (notificationsInitialized && settings.notifications?.achievement) {
  // NotificationManager теперь сам проверяет состояние приложения
  await NotificationManager.sendAchievementNotification(newAchievement);
}


    } catch (error) {
      console.error('Ошибка разблокировки достижения:', error);
    }
  }, [achievements, saveAchievements, notificationsInitialized, settings.notifications]);

  */

  const startEditHabit = (habit) => {
    if (!habit) return;
    setEditingHabit(habit);
    setShowAddHabit(true);
  };

  const handleFormSave = async (habitData) => {
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
  };

  const handleFormCancel = () => {
    setShowAddHabit(false);
    setEditingHabit(null);
  };

 // Сплеш-скрин удален - используем стандартный Expo splash

  // === ОСНОВНОЙ РЕНДЕР С ПРАВИЛЬНЫМИ ОТСТУПАМИ ===
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={settings.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />

{/* Основное приложение */}
<View style={styles.appContainer}>
    <MainApp
            habits={habits}
            archivedHabits={archivedHabits}
            achievements={achievements}
            settings={settings}
            onHabitToggle={(habitId, date) => {
              console.log('App: Toggle для', habitId, date);
              toggleHabitCompletion(habitId, date);
            }}
            onHabitUpdateValue={(habitId, date, value) => {
              console.log('App: UpdateValue для', habitId, date, value);
              updateHabitValue(habitId, date, value);
            }}
            onHabitEdit={startEditHabit}
            onHabitDelete={deleteHabit}
            onHabitArchive={archiveHabit}
            onHabitRestore={restoreHabit}
            onArchivedHabitDelete={deleteArchivedHabit}
            onShowAddHabit={() => setShowAddHabit(true)}
            onShowSettings={() => setShowSettings(true)}
            //onAchievementUnlock={unlockAchievement}
            safeAreaInsets={insets}
          />
        </View>


      {/* Стандартный Expo splash используется автоматически */}

{/* Стандартный Expo splash используется автоматически */}

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

// === ГЛАВНЫЙ КОМПОНЕНТ С SAFE AREA PROVIDER ===
const App = () => (
  <SafeAreaProvider>
    <AppContent />
  </SafeAreaProvider>
);

// === СТИЛИ С УЧЕТОМ SAFE AREA ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  appContainer: {
    flex: 1,
  },


});

export default App;
