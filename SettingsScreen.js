import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  SafeAreaView,
  Alert,
  Switch,
  Share,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

// Импорт констант
import { 
  THEMES, 
  SPACING, 
  BORDER_RADIUS, 
  TYPOGRAPHY,
  DEFAULT_SETTINGS
} from './constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SettingsScreen = ({
  visible,
  onClose,
  settings,
  onSettingsChange,
  habits,
  achievements
}) => {
     const [showThemeSelector, setShowThemeSelector] = useState(false);
     const [showColorSelector, setShowColorSelector] = useState(false);
     const [showSpeedSelector, setShowSpeedSelector] = useState(false);

  const colors = THEMES[settings.theme][settings.isDarkMode ? 'dark' : 'light'];

  // === ОБРАБОТЧИКИ ===
  const updateSetting = (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    onSettingsChange(newSettings);
  };

  const updateNotificationSetting = (key, value) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    };
    onSettingsChange(newSettings);
  };

const updateButtonAnimationSetting = (key, value) => {
  const newSettings = {
    ...settings,
    buttonAnimation: {
      ...settings.buttonAnimation,
      [key]: value
    }
  };
  onSettingsChange(newSettings);
};

const updateDeveloperSetting = (key, value) => {
  const newSettings = {
    ...settings,
    developer: {
      ...settings.developer,
      [key]: value
    }
  };
  onSettingsChange(newSettings);
};

  const formatSpeedLabel = (speed) => {
    if (speed >= 1) {
      return `${speed}x`;
    } else {
      return `${speed}x`;
    }
  };

  const getColorLabel = (colorKey) => {
    const colorLabels = {
      primary: 'Основной',
      secondary: 'Дополнительный',
      success: 'Успех',
      warning: 'Предупреждение',
      error: 'Ошибка'
    };
    return colorLabels[colorKey] || 'Основной';
  };

  // === УПРОЩЕННЫЙ ЭКСПОРТ ===
  const handleSimpleExport = async () => {
    try {
      const exportData = {
        appName: 'Трекер Привычек',
        exportDate: new Date().toLocaleDateString('ru-RU'),
        totalHabits: habits.length,
        totalAchievements: achievements.length,
        summary: `У вас ${habits.length} привычек и ${achievements.length} достижений. Продолжайте в том же духе! 🎯`,
        note: 'Экспортировано из приложения "Трекер Привычек"'
      };

      const message = `🎯 Мой прогресс в привычках:\n\n📊 Привычек: ${exportData.totalHabits}\n🏆 Достижений: ${exportData.totalAchievements}\n📅 На дату: ${exportData.exportDate}\n\n${exportData.summary}`;

      await Share.share({
        message: message,
        title: 'Мой прогресс в привычках'
      });
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      Alert.alert('Ошибка', 'Не удалось поделиться данными');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Сбросить все данные?',
      'Это действие удалит все ваши привычки и достижения. Восстановить данные будет невозможно.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: () => {
            onSettingsChange(DEFAULT_SETTINGS);
            Alert.alert('Готово', 'Все данные были сброшены');
            onClose();
          }
        }
      ]
    );
  };

  // === РЕНДЕР КОМПОНЕНТОВ ===
  const renderSettingItem = ({ title, subtitle, value, onToggle, onPress, showArrow = false, danger = false }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !onToggle}
    >
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: danger ? colors.error : colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.settingAction}>
        {onToggle ? (
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{
              false: colors.surface,
              true: colors.primary + '40'
            }}
            thumbColor={value ? colors.primary : colors.textSecondary}
          />
        ) : showArrow ? (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        ) : (
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
            {value}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {title}
      </Text>
      {children}
    </View>
  );

  const renderThemeSelector = () => (
    <Modal
      visible={showThemeSelector}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowThemeSelector(false)}>
            <Text style={[styles.modalCancelButton, { color: colors.textSecondary }]}>
              Готово
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Выбор темы
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.themeList}>
          {Object.keys(THEMES).map(themeKey => (
            <TouchableOpacity
              key={themeKey}
              style={[
                styles.themeItem,
                {
                  backgroundColor: colors.card,
                  borderColor: settings.theme === themeKey ? colors.primary : colors.border
                }
              ]}
              onPress={() => {
                updateSetting('theme', themeKey);
              }}
            >
              <View style={styles.themePreview}>
                <View style={[
                  styles.themeColorPrimary,
                  { backgroundColor: THEMES[themeKey].light.primary }
                ]} />
                <View style={[
                  styles.themeColorSecondary,
                  { backgroundColor: THEMES[themeKey].light.secondary }
                ]} />
                <View style={[
                  styles.themeColorSuccess,
                  { backgroundColor: THEMES[themeKey].light.success }
                ]} />
              </View>
              <View style={styles.themeInfo}>
                <Text style={[styles.themeName, { color: colors.text }]}>
                  {themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
                </Text>
                <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>
                  {getThemeDescription(themeKey)}
                </Text>
              </View>
              {settings.theme === themeKey && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );



  const getThemeDescription = (themeKey) => {
    const descriptions = {
      blue: 'Классическая синяя тема',
      purple: 'Элегантная фиолетовая тема',
      green: 'Природная зеленая тема',
      orange: 'Энергичная оранжевая тема',
      indigo: 'Современная индиго тема'
    };
    return descriptions[themeKey] || 'Красивая цветовая схема';
  };

  // === СЕЛЕКТОР ЦВЕТА КНОПКИ ===
  const renderColorSelector = () => (
    <Modal
      visible={showColorSelector}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowColorSelector(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Цвет кнопки
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {[
            { key: 'primary', label: 'Основной', color: colors.primary },
            { key: 'secondary', label: 'Дополнительный', color: colors.secondary },
            { key: 'success', label: 'Успех', color: colors.success },
            { key: 'warning', label: 'Предупреждение', color: colors.warning },
            { key: 'error', label: 'Ошибка', color: colors.error }
          ].map((colorOption) => (
            <TouchableOpacity
              key={colorOption.key}
              style={[
                styles.colorOption,
                {
                  borderColor: (settings.buttonAnimation?.color || 'primary') === colorOption.key ?
                    colors.primary : colors.border
                }
              ]}
              onPress={() => {
                updateButtonAnimationSetting('color', colorOption.key);
                setShowColorSelector(false);
              }}
            >
              <View style={[styles.colorPreview, { backgroundColor: colorOption.color }]} />
              <Text style={[styles.colorLabel, { color: colors.text }]}>
                {colorOption.label}
              </Text>
              {(settings.buttonAnimation?.color || 'primary') === colorOption.key && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // === СЕЛЕКТОР СКОРОСТИ АНИМАЦИИ ===
  const renderSpeedSelector = () => (
    <Modal
      visible={showSpeedSelector}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowSpeedSelector(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Скорость анимации
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {[
            { speed: 0.2, label: 'Очень медленно', description: '15 сек цикл' },
            { speed: 0.5, label: 'Медленно', description: '6 сек цикл' },
            { speed: 1, label: 'Обычно', description: '3 сек цикл' },
            { speed: 1.5, label: 'Быстро', description: '2 сек цикл' },
            { speed: 2, label: 'Очень быстро', description: '1.5 сек цикл' },
            { speed: 3, label: 'Стремительно', description: '1 сек цикл' },
            { speed: 4, label: 'Максимально', description: '0.75 сек цикл' }
          ].map((speedOption) => (
            <TouchableOpacity
              key={speedOption.speed}
              style={[
                styles.speedOption,
                {
                  borderColor: (settings.buttonAnimation?.speed || 1) === speedOption.speed ?
                    colors.primary : colors.border
                }
              ]}
              onPress={() => {
                updateButtonAnimationSetting('speed', speedOption.speed);
                setShowSpeedSelector(false);
              }}
            >
              <View style={styles.speedInfo}>
                <Text style={[styles.speedLabel, { color: colors.text }]}>
                  {speedOption.label}
                </Text>
                <Text style={[styles.speedDescription, { color: colors.textSecondary }]}>
                  {speedOption.description}
                </Text>
              </View>
              <Text style={[styles.speedValue, { color: colors.primary }]}>
                {formatSpeedLabel(speedOption.speed)}
              </Text>
              {(settings.buttonAnimation?.speed || 1) === speedOption.speed && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  

  // === ОСНОВНОЙ РЕНДЕР ===
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Настройки
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
   {/* Основные настройки */}
             {renderSection('Оформление', (
               <>
                 {renderSettingItem({
                   title: 'Темная тема',
                   subtitle: 'Переключить между светлой и темной темой',
                   value: settings.isDarkMode,
                   onToggle: (value) => updateSetting('isDarkMode', value)
                 })}

                 {renderSettingItem({
                   title: 'Цветовая схема',
                   subtitle: 'Выбрать цветовую тему приложения',
                   value: settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1),
                   onPress: () => setShowThemeSelector(true),
                   showArrow: true
                 })}
               </>
             ))}

         {/* Анимация кнопки */}
                   {renderSection('Анимация кнопки', (
                     <>
                       {renderSettingItem({
                         title: 'Анимация включена',
                         subtitle: 'Переливающиеся цвета кнопки добавления',
                         value: settings.buttonAnimation?.enabled ?? true,
                         onToggle: (value) => updateButtonAnimationSetting('enabled', value)
                       })}

                       {renderSettingItem({
                         title: 'Цвет кнопки',
                         subtitle: 'Выбрать цвет для кнопки добавления',
                         value: getColorLabel(settings.buttonAnimation?.color || 'primary'),
                         onPress: () => setShowColorSelector(true),
                         showArrow: true
                       })}

                       {settings.buttonAnimation?.enabled !== false && (
                         renderSettingItem({
                           title: 'Скорость анимации',
                           subtitle: `${formatSpeedLabel(settings.buttonAnimation?.speed || 1)} - ${
                             (settings.buttonAnimation?.speed || 1) < 0.5 ? 'очень медленно' :
                             (settings.buttonAnimation?.speed || 1) < 1 ? 'медленно' :
                             (settings.buttonAnimation?.speed || 1) === 1 ? 'обычно' :
                             (settings.buttonAnimation?.speed || 1) < 2 ? 'быстро' : 'очень быстро'
                           }`,
                           value: '',
                           onPress: () => setShowSpeedSelector(true),
                           showArrow: true
                         })
                       )}
                     </>
                   ))}

          {/* Уведомления */}
          {renderSection('Уведомления', (
            <>
              {renderSettingItem({
                title: 'Напоминания о привычках',
                subtitle: 'Получать уведомления в установленное время',
                value: settings.notifications?.reminder || false,
                onToggle: (value) => updateNotificationSetting('reminder', value)
              })}

              {renderSettingItem({
                title: 'Уведомления о достижениях',
                subtitle: 'Получать уведомления о новых наградах',
                value: settings.notifications?.achievement || false,
                onToggle: (value) => updateNotificationSetting('achievement', value)
              })}
              
              {renderSettingItem({
  title: 'Тест уведомлений',
  subtitle: 'Проверить работу уведомлений',
  value: '',
  onPress: async () => {
    const success = await NotificationManager.sendTestNotification();
    Alert.alert(
      success ? 'Успех' : 'Ошибка',
      success ? 'Проверьте уведомление' : 'Не удалось отправить'
    );
  },
  showArrow: true
})}

              {renderSettingItem({
                title: 'Предупреждения о сериях',
                subtitle: 'Напоминания перед потерей серии',
                value: settings.notifications?.streak || false,
                onToggle: (value) => updateNotificationSetting('streak', value)
              })}
            </>
          ))}

          {/* Статистика */}
          {renderSection('Ваш прогресс', (
            <>
              {renderSettingItem({
                title: 'Всего привычек',
                subtitle: 'Созданные вами привычки',
                value: habits?.length?.toString() || '0'
              })}

              {renderSettingItem({
                title: 'Получено достижений',
                subtitle: 'Разблокированные награды',
                value: achievements?.length?.toString() || '0'
              })}

              {renderSettingItem({
                title: 'Поделиться прогрессом',
                subtitle: 'Рассказать друзьям о своих успехах',
                value: '',
                onPress: handleSimpleExport,
                showArrow: true
              })}
            </>
          ))}

          {/* Приложение */}
          {renderSection('О приложении', (
            <>
{renderSettingItem({
  title: 'Версия',
  subtitle: 'Текущая версия приложения',
  value: Constants.expoConfig?.version || '1.0.0'
})}

{renderSettingItem({
  title: 'Показывать дату обновления',
  subtitle: 'Дата и время в заголовке приложения',
  value: settings.developer?.showBuildInfo || false,
  onToggle: (value) => updateDeveloperSetting('showBuildInfo', value)
})}

              {renderSettingItem({
                title: 'Поддержка',
                subtitle: 'Связаться с разработчиками',
                value: '',
                onPress: () => Alert.alert('Поддержка', 'Напишите нам: support@habittracker.com'),
                showArrow: true
              })}

              {renderSettingItem({
                title: 'Оценить приложение',
                subtitle: 'Оставить отзыв в магазине приложений',
                value: '',
                onPress: () => Alert.alert('Спасибо!', 'Ваша оценка поможет нам стать лучше'),
                showArrow: true
              })}
            </>
          ))}

          {/* Опасная зона */}
          {renderSection('Данные', (
            <>
              {renderSettingItem({
                title: 'Сбросить все данные',
                subtitle: 'Удалить все привычки и достижения',
                value: '',
                onPress: handleResetData,
                showArrow: true,
                danger: true
              })}
            </>
          ))}
        </ScrollView>

        {renderThemeSelector()}
        {renderColorSelector()}
        {renderSpeedSelector()}
      </SafeAreaView>
    </Modal>
  );
};

// === СТИЛИ ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  
  headerTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: 'bold',
  },
  
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  
  section: {
    marginVertical: SPACING.lg,
  },
  
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  
  settingContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  
  settingTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  
  settingSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    marginTop: SPACING.xs,
  },
  
  settingAction: {
    alignItems: 'flex-end',
  },
  
  settingValue: {
    ...TYPOGRAPHY.bodyMedium,
  },
  
  // Theme Selector
  modalContainer: {
    flex: 1,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  
  modalTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: 'bold',
  },

  // Color Selector
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },

  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  colorLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
    flex: 1,
  },

  // Speed Selector
  speedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },

  speedInfo: {
    flex: 1,
  },

  speedLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },

  speedDescription: {
    ...TYPOGRAPHY.bodyMedium,
    marginTop: SPACING.xs,
  },

  speedValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginRight: SPACING.sm,
    fontWeight: 'bold',


  },
  
  modalCancelButton: {
    ...TYPOGRAPHY.button,
  },
  
  themeList: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.sm,
  },
  
  themePreview: {
    flexDirection: 'row',
    marginRight: SPACING.md,
  },
  
  themeColorPrimary: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: SPACING.xs,
  },
  
  themeColorSecondary: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: SPACING.xs,
  },
  
  themeColorSuccess: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  
  themeInfo: {
    flex: 1,
  },
  
  themeName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  
  themeDescription: {
    ...TYPOGRAPHY.bodyMedium,
    marginTop: SPACING.xs,
  },

});

export default SettingsScreen;