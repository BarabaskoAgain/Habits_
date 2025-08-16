// ====================================
// ИСПРАВЛЕННЫЙ МЕНЕДЖЕР УВЕДОМЛЕНИЙ - НА ОСНОВЕ УСПЕШНЫХ ПРИМЕРОВ
// NotificationManager.js - Рабочая реализация по примеру GitHub проектов
// ====================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ИСПРАВЛЕННАЯ настройка поведения уведомлений (простая и рабочая)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationManager {

  // === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ - ПРОВЕРКА ВЫПОЛНЕНИЯ НЕДЕЛЬНОГО ПЛАНА ===
  static checkWeeklyPlanCompleted(habit) {
    try {
      // Получаем начало недели (понедельник)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Воскресенье = 6

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysFromMonday);
      weekStart.setHours(0, 0, 0, 0);

      // Считаем выполнения за текущую неделю
      let completedDays = 0;
      const completions = habit.completions || {};

      for (let d = 0; d < 7; d++) {
        const checkDate = new Date(weekStart);
        checkDate.setDate(weekStart.getDate() + d);
        const dateStr = checkDate.toISOString().split('T')[0];

        // Проверяем только прошедшие и текущий день
        if (checkDate <= now) {
          const completion = completions[dateStr];

          if (habit.type === 'boolean' && completion === true) {
            completedDays++;
          } else if (habit.type === 'weight' && completion?.weight > 0) {
            completedDays++;
          } else if (habit.type === 'number' && completion?.completed) {
            completedDays++;
          }
        }
      }

      const targetDays = habit.targetDaysPerWeek || 7;
      console.log(`📊 ${habit.name}: Выполнено ${completedDays}/${targetDays} на этой неделе`);

      return completedDays >= targetDays;
    } catch (error) {
      console.error('Ошибка проверки недельного плана:', error);
      return false;
    }
  }

  // === ИНИЦИАЛИЗАЦИЯ (ИСПРАВЛЕННАЯ) ===
  static async initialize() {
    try {
      console.log('🔔 Инициализация уведомлений...');

      // Проверка устройства (критично!)
      if (!Device.isDevice) {
        console.log('⚠️ Уведомления работают только на реальном устройстве');
        return false;
      }

      // ИСПРАВЛЕННАЯ настройка Android канала (по примеру успешных проектов)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Напоминания о привычках',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2196F3',
          sound: true,
        });
        console.log('✅ Android канал настроен');
      }

      // ИСПРАВЛЕННОЕ получение разрешений (по примеру рабочих проектов)
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('📋 Запрашиваем разрешения...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Разрешения не получены');
        return false;
      }

      console.log('✅ Уведомления инициализированы успешно');
      return true;
    } catch (error) {
      console.error('🚨 Ошибка инициализации:', error);
      return false;
    }
  }

  // === ИСПРАВЛЕННОЕ ПЛАНИРОВАНИЕ УВЕДОМЛЕНИЯ (РАБОЧАЯ СТРУКТУРА) ===
  static async scheduleHabitReminder(habit, settings) {
    try {
      if (!habit.reminderEnabled || !habit.reminderTime) {
        console.log(`⏭️ Пропускаем ${habit.name} - уведомления отключены`);
        return false;
      }

      // НОВОЕ: Проверяем выполнен ли недельный план
      if (this.checkWeeklyPlanCompleted(habit)) {
        console.log(`✅ План выполнен для "${habit.name}" - уведомления не нужны до новой недели`);
        await this.cancelHabitReminder(habit.id);
        return true;
      }

      console.log(`⏰ Планируем уведомление для "${habit.name}" на ${habit.reminderTime}`);

      // Отменяем старые уведомления
      await this.cancelHabitReminder(habit.id);

      // Парсим время
      const [hours, minutes] = habit.reminderTime.split(':').map(Number);

      if (Platform.OS === 'android') {
        // Для Android планируем на 7 дней вперед (до конца недели)
        const notificationIds = [];
        const now = new Date();

        // Получаем конец недели (воскресенье)
        const dayOfWeek = now.getDay();
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

        for (let day = 0; day <= daysUntilSunday; day++) {
          const triggerDate = new Date();
          triggerDate.setDate(triggerDate.getDate() + day);
          triggerDate.setHours(hours, minutes, 0, 0);

          // Пропускаем если время уже прошло для сегодня
          if (triggerDate <= now) continue;

          const trigger = {
            channelId: 'default',
            date: triggerDate.getTime(),
          };

          try {
            const id = await Notifications.scheduleNotificationAsync({
              content: {
                title: '🎯 Время для привычки!',
                body: `Пора выполнить: ${habit.name}`,
                data: {
                  type: 'habit_reminder',
                  habitId: habit.id,
                  habitName: habit.name,
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                channelId: 'default',
              },
              trigger,
            });

            notificationIds.push(id);
          } catch (err) {
            console.log(`День ${day}: ${err.message}`);
          }
        }

        console.log(`✅ Android: ${notificationIds.length} уведомлений запланировано до конца недели`);

        // Сохраняем ID уведомлений для последующей отмены
        const storage = await AsyncStorage.getItem('scheduled_notifications') || '{}';
        const scheduled = JSON.parse(storage);
        scheduled[habit.id] = notificationIds;
        await AsyncStorage.setItem('scheduled_notifications', JSON.stringify(scheduled));

        return true;

      } else {
        // Для iOS используем встроенный повтор
        const trigger = {
          hour: hours,
          minute: minutes,
          repeats: true,
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎯 Время для привычки!',
            body: `Пора выполнить: ${habit.name}`,
            data: {
              type: 'habit_reminder',
              habitId: habit.id,
              habitName: habit.name,
            },
            sound: true,
          },
          trigger,
        });

        console.log(`✅ iOS уведомление с повтором: ${notificationId}`);

        // Сохраняем ID для iOS
        const storage = await AsyncStorage.getItem('scheduled_notifications') || '{}';
        const scheduled = JSON.parse(storage);
        scheduled[habit.id] = [notificationId];
        await AsyncStorage.setItem('scheduled_notifications', JSON.stringify(scheduled));

        return true;
      }

    } catch (error) {
      console.error(`🚨 Ошибка планирования для ${habit.name}:`, error);
      return false;
    }
  }

  // === ОТМЕНА УВЕДОМЛЕНИЯ (УЛУЧШЕННАЯ) ===
  static async cancelHabitReminder(habitId) {
    try {
      // Получаем сохраненные ID уведомлений
      const storage = await AsyncStorage.getItem('scheduled_notifications') || '{}';
      const scheduled = JSON.parse(storage);
      const notificationIds = scheduled[habitId] || [];

      // Отменяем все сохраненные уведомления
      for (const id of notificationIds) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch (err) {
          // Игнорируем ошибки отмены несуществующих уведомлений
        }
      }

      // Также проверяем по habitId в data на случай если ID потерялись
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const habitNotifications = allNotifications.filter(
        notif => notif.content.data?.habitId === habitId
      );

      for (const notif of habitNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }

      // Удаляем из storage
      delete scheduled[habitId];
      await AsyncStorage.setItem('scheduled_notifications', JSON.stringify(scheduled));

      console.log(`❌ Отменено уведомлений для привычки ${habitId}: ${notificationIds.length + habitNotifications.length}`);
      return true;
    } catch (error) {
      console.error('🚨 Ошибка отмены:', error);
      return false;
    }
  }

  // === ПЛАНИРОВАНИЕ ВСЕХ УВЕДОМЛЕНИЙ ===
  static async scheduleAllReminders(habits, settings) {
    try {
      console.log(`📋 Планируем уведомления для ${habits.length} привычек...`);

      let successCount = 0;
      for (const habit of habits) {
        if (habit.reminderEnabled && habit.reminderTime) {
          const success = await this.scheduleHabitReminder(habit, settings);
          if (success) successCount++;
        }
      }

      console.log(`✅ Запланировано уведомлений: ${successCount}`);
      return true;
    } catch (error) {
      console.error('🚨 Ошибка планирования всех:', error);
      return false;
    }
  }

  // === ОБНОВЛЕНИЕ УВЕДОМЛЕНИЯ ===
  static async updateHabitReminder(habit, settings) {
    try {
      await this.cancelHabitReminder(habit.id);
      if (habit.reminderEnabled && habit.reminderTime) {
        return await this.scheduleHabitReminder(habit, settings);
      }
      return true;
    } catch (error) {
      console.error('🚨 Ошибка обновления:', error);
      return false;
    }
  }

  // === ТЕСТОВОЕ УВЕДОМЛЕНИЕ (ИСПРАВЛЕННОЕ) ===
  static async sendTestNotification() {
    try {
      console.log('🧪 Отправляем тестовое уведомление...');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Тест уведомлений',
          body: 'Уведомления работают корректно!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
        // ИСПРАВЛЕНО: уведомление через 2 секунды (рабочая структура)
        trigger: {
          seconds: 2,
        },
      });

      console.log('✅ Тестовое уведомление запланировано на 2 секунды');
      return true;
    } catch (error) {
      console.error('🚨 Ошибка теста:', error);
      return false;
    }
  }

  // === ОТМЕНА ВСЕХ УВЕДОМЛЕНИЙ ===
  static async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('❌ Все уведомления отменены');
      return true;
    } catch (error) {
      console.error('🚨 Ошибка отмены всех:', error);
      return false;
    }
  }

  // === ОТЛАДОЧНАЯ ИНФОРМАЦИЯ ===
  static async debugInfo() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const { status } = await Notifications.getPermissionsAsync();

      console.log('\n🔍 ОТЛАДКА УВЕДОМЛЕНИЙ');
      console.log('========================');
      console.log(`📱 Разрешения: ${status}`);
      console.log(`📅 Запланировано: ${notifications.length}`);

      notifications.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.content.title}`);
        console.log(`   Время: ${notif.trigger?.hour || 'не задано'}:${notif.trigger?.minute || 'не задано'}`);
      });
      console.log('========================\n');

      return notifications;
    } catch (error) {
      console.error('🚨 Ошибка отладки:', error);
      return [];
    }
  }

  // === УВЕДОМЛЕНИЕ О ДОСТИЖЕНИИ ===
  static async sendAchievementNotification(achievement) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏆 Новое достижение!',
          body: achievement.title,
          data: { type: 'achievement', achievementId: achievement.id },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
        trigger: null, // Сразу
      });

      console.log(`🏆 Уведомление о достижении: ${achievement.title}`);
      return true;
    } catch (error) {
      console.error('🚨 Ошибка уведомления о достижении:', error);
      return false;
    }
  }
}

export default NotificationManager;