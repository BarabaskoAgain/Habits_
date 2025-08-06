// ====================================
// ИСПРАВЛЕННЫЙ МЕНЕДЖЕР УВЕДОМЛЕНИЙ - НА ОСНОВЕ УСПЕШНЫХ ПРИМЕРОВ
// NotificationManager.js - Рабочая реализация по примеру GitHub проектов
// ====================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';

// ИСПРАВЛЕННАЯ настройка поведения уведомлений (простая и рабочая)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationManager {

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

      console.log(`⏰ Планируем уведомление для "${habit.name}" на ${habit.reminderTime}`);

      // Отменяем старые уведомления
      await this.cancelHabitReminder(habit.id);

      // Парсим время
      const [hours, minutes] = habit.reminderTime.split(':').map(Number);

      // ИСПРАВЛЕННАЯ структура планирования (по примеру успешных проектов)
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎯 Время для привычки!',
          body: `Пора выполнить: ${habit.name}`,
          data: {
            type: 'habit_reminder',
            habitId: habit.id,
            habitName: habit.name
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          // ИСПРАВЛЕНО: channelId в content, а не в trigger
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
        // ИСПРАВЛЕННАЯ структура trigger (рабочая!)
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      console.log(`✅ Уведомление запланировано для "${habit.name}": ${notificationId}`);
      return true;
    } catch (error) {
      console.error(`🚨 Ошибка планирования для ${habit.name}:`, error);
      return false;
    }
  }

  // === ОТМЕНА УВЕДОМЛЕНИЯ (БЕЗ ИЗМЕНЕНИЙ) ===
  static async cancelHabitReminder(habitId) {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const habitNotifications = notifications.filter(
        notif => notif.content.data?.habitId === habitId
      );

      for (const notif of habitNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }

      if (habitNotifications.length > 0) {
        console.log(`❌ Отменено ${habitNotifications.length} уведомлений для привычки ${habitId}`);
      }

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