// ====================================
// МЕНЕДЖЕР PUSH УВЕДОМЛЕНИЙ - ПЕРЕРАБОТАННАЯ ВЕРСИЯ
// NotificationManager.js - Корректная работа Push-уведомлений
// ====================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';

// Динамическая настройка поведения уведомлений
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Получаем текущее состояние приложения
    const appState = AppState.currentState;
    
    // Логируем для отладки
    console.log('📱 Получено уведомление:', {
      title: notification.request.content.title,
      appState: appState,
      type: notification.request.content.data?.type
    });
    
    // НЕ показываем уведомления когда приложение активно
    const shouldShow = appState !== 'active';
    
    return {
      shouldShowAlert: shouldShow,
      shouldPlaySound: shouldShow,
      shouldSetBadge: true,
    };
  },
});

class NotificationManager {
  
  // === ИНИЦИАЛИЗАЦИЯ ===
  static async initialize() {
    try {
      console.log('🔔 Начало инициализации уведомлений...');
      
      // Проверка устройства
      if (!Device.isDevice) {
        console.log('⚠️ Уведомления работают только на реальном устройстве');
        return false;
      }

      // Настройка канала для Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('habits', {
          name: 'Напоминания о привычках',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: true,
          lightColor: '#2196F3',
          showBadge: true,
        });
        console.log('✅ Android канал настроен');
      }

      // Запрашиваем разрешения
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('📋 Запрашиваем разрешение на уведомления...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Разрешение на уведомления не получено');
        return false;
      }

      console.log('✅ Push уведомления инициализированы успешно');
      
      // Логируем количество запланированных уведомлений
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📅 Запланировано уведомлений: ${scheduled.length}`);
      
      return true;
    } catch (error) {
      console.error('🚨 Ошибка инициализации уведомлений:', error);
      return false;
    }
  }

  // === ПЛАНИРОВАНИЕ НАПОМИНАНИЯ ДЛЯ ОДНОЙ ПРИВЫЧКИ ===
  static async scheduleHabitReminder(habit, settings) {
    try {
      if (!habit.reminderEnabled || !habit.reminderTime) {
        console.log(`⏭️ Пропускаем ${habit.name} - напоминания отключены`);
        return false;
      }

      console.log(`⏰ Планируем напоминание для "${habit.name}" на ${habit.reminderTime}`);

      // Сначала отменяем старые уведомления для этой привычки
      await this.cancelHabitReminder(habit.id);

      // Парсим время
      const [hours, minutes] = habit.reminderTime.split(':').map(Number);
      
      // Создаем дату для следующего напоминания
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // Если время уже прошло сегодня, планируем на завтра
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
        console.log(`⏭️ Время ${habit.reminderTime} уже прошло, планируем на завтра`);
      }
      
      // Создаем уникальный идентификатор
      const identifier = `habit-${habit.id}-reminder`;
      
      // Планируем уведомление
      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: identifier,
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
          badge: 1,
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
          channelId: Platform.OS === 'android' ? 'habits' : undefined,
        },
      });

      console.log(`✅ Запланировано напоминание для "${habit.name}":`);
      console.log(`   ID: ${notificationId}`);
      console.log(`   Время: ${habit.reminderTime} ежедневно`);
      console.log(`   Первое срабатывание: ${scheduledTime.toLocaleString()}`);
      
      return true;
    } catch (error) {
      console.error(`🚨 Ошибка планирования напоминания для ${habit.name}:`, error);
      return false;
    }
  }

  // === ОТМЕНА НАПОМИНАНИЯ ДЛЯ ПРИВЫЧКИ ===
  static async cancelHabitReminder(habitId) {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const habitNotifications = notifications.filter(
        notif => notif.content.data?.habitId === habitId
      );
      
      if (habitNotifications.length > 0) {
        for (const notif of habitNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
        console.log(`❌ Отменены ${habitNotifications.length} напоминаний для привычки ${habitId}`);
      }
      
      return true;
    } catch (error) {
      console.error('🚨 Ошибка отмены напоминания:', error);
      return false;
    }
  }

  // === ПЛАНИРОВАНИЕ ВСЕХ НАПОМИНАНИЙ ===
  static async scheduleAllReminders(habits, settings) {
    try {
      console.log(`📋 Планирование напоминаний для ${habits.length} привычек...`);
      
      let successCount = 0;
      let skipCount = 0;
      
      for (const habit of habits) {
        if (habit.reminderEnabled && habit.reminderTime) {
          const success = await this.scheduleHabitReminder(habit, settings);
          if (success) successCount++;
        } else {
          skipCount++;
        }
      }
      
      console.log(`✅ Успешно запланировано: ${successCount}`);
      console.log(`⏭️ Пропущено (отключены): ${skipCount}`);
      
      return true;
    } catch (error) {
      console.error('🚨 Ошибка планирования всех напоминаний:', error);
      return false;
    }
  }

  // === ОБНОВЛЕНИЕ НАПОМИНАНИЯ ПРИ ИЗМЕНЕНИИ ПРИВЫЧКИ ===
  static async updateHabitReminder(habit, settings) {
    try {
      console.log(`🔄 Обновление напоминания для "${habit.name}"`);
      
      // Отменяем старое
      await this.cancelHabitReminder(habit.id);
      
      // Планируем новое, если включено
      if (habit.reminderEnabled && habit.reminderTime) {
        return await this.scheduleHabitReminder(habit, settings);
      }
      
      return true;
    } catch (error) {
      console.error('🚨 Ошибка обновления напоминания:', error);
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
      console.error('🚨 Ошибка отмены всех уведомлений:', error);
      return false;
    }
  }

  // === ПОЛУЧИТЬ ИНФОРМАЦИЮ О ЗАПЛАНИРОВАННЫХ УВЕДОМЛЕНИЯХ ===
  static async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      
      console.log(`\n📅 Запланированные уведомления (${notifications.length}):`);
      
      notifications.forEach((notif, index) => {
        const data = notif.content.data;
        const trigger = notif.trigger;
        
        console.log(`\n${index + 1}. ${notif.content.title}`);
        console.log(`   Текст: ${notif.content.body}`);
        console.log(`   ID: ${notif.identifier}`);
        
        if (data?.habitName) {
          console.log(`   Привычка: ${data.habitName}`);
        }
        
        if (trigger?.hour !== undefined) {
          console.log(`   Время: ${String(trigger.hour).padStart(2, '0')}:${String(trigger.minute).padStart(2, '0')}`);
          console.log(`   Повтор: ${trigger.repeats ? 'Ежедневно' : 'Один раз'}`);
        }
      });
      
      return notifications;
    } catch (error) {
      console.error('🚨 Ошибка получения уведомлений:', error);
      return [];
    }
  }

  // === ТЕСТОВОЕ УВЕДОМЛЕНИЕ ===
  static async sendTestNotification() {
    try {
      console.log('🧪 Отправка тестового уведомления...');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Тест уведомлений',
          body: 'Уведомления работают корректно!',
          data: { type: 'test' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Отправить сразу
      });
      
      console.log('✅ Тестовое уведомление отправлено');
      return true;
    } catch (error) {
      console.error('🚨 Ошибка отправки тестового уведомления:', error);
      return false;
    }
  }

  // === ПРОВЕРКА РАЗРЕШЕНИЙ ===
  static async checkPermissions() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const settings = await Notifications.getNotificationChannelsAsync();
      
      console.log('\n📱 Статус разрешений:');
      console.log(`   Общий статус: ${status}`);
      
      if (Platform.OS === 'android') {
        console.log(`   Каналы Android: ${settings.length}`);
        settings.forEach(channel => {
          console.log(`   - ${channel.name}: ${channel.importance}`);
        });
      }
      
      return status === 'granted';
    } catch (error) {
      console.error('🚨 Ошибка проверки разрешений:', error);
      return false;
    }
  }

  // === УВЕДОМЛЕНИЕ О ДОСТИЖЕНИИ ===
  static async sendAchievementNotification(achievement) {
    try {
      // Проверяем состояние приложения
      if (AppState.currentState === 'active') {
        console.log('⏭️ Приложение активно, пропускаем уведомление о достижении');
        return false;
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏆 Новое достижение!',
          body: achievement.title,
          data: { 
            type: 'achievement',
            achievementId: achievement.id 
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Отправить сразу
      });
      
      console.log(`🏆 Отправлено уведомление о достижении: ${achievement.title}`);
      return true;
    } catch (error) {
      console.error('🚨 Ошибка отправки уведомления о достижении:', error);
      return false;
    }
  }
  
  // === ОТЛАДОЧНАЯ ИНФОРМАЦИЯ ===
  static async debugInfo() {
    console.log('\n🔍 ОТЛАДОЧНАЯ ИНФОРМАЦИЯ УВЕДОМЛЕНИЙ');
    console.log('=====================================');
    
    // Проверка разрешений
    await this.checkPermissions();
    
    // Список запланированных уведомлений
    await this.getScheduledNotifications();
    
    // Состояние приложения
    console.log(`\n📱 Состояние приложения: ${AppState.currentState}`);
    
    console.log('=====================================\n');
  }

  // === ПРОВЕРКА РАБОТЫ УВЕДОМЛЕНИЙ ПРИ ЗАКРЫТОМ ПРИЛОЖЕНИИ ===
  static async scheduleBackgroundTest() {
    try {
      console.log('🧪 Планирование теста фоновых уведомлений...');
      
      // Планируем уведомление через 1 минуту
      const trigger = new Date();
      trigger.setMinutes(trigger.getMinutes() + 1);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Уведомления работают!',
          body: 'Это уведомление пришло когда приложение было закрыто',
          data: { type: 'background_test' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: trigger,
        },
      });
      
      console.log(`✅ Тест запланирован на ${trigger.toLocaleTimeString()}`);
      console.log('📱 Теперь можете закрыть приложение и подождать 1 минуту');
      
      return true;
    } catch (error) {
      console.error('🚨 Ошибка планирования теста:', error);
      return false;
    }
  }
}

export default NotificationManager;