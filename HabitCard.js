// ====================================
// ИСПРАВЛЕННАЯ КАРТОЧКА ПРИВЫЧКИ С ФУНКЦИЕЙ АРХИВИРОВАНИЯ
// HabitCard.js - ОРИГИНАЛЬНЫЙ ДИЗАЙН + КНОПКА АРХИВА
// ====================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEMES, SPACING, BORDER_RADIUS, TYPOGRAPHY, WEIGHT_UTILS, MEASUREMENT_UNITS } from './constants';

const HabitCard = ({
  habit,
  onToggle = () => {},
  onUpdateValue = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onArchive = () => {}, // НОВАЯ ФУНКЦИЯ АРХИВИРОВАНИЯ
  selectedDate,
  theme = 'blue',
  isDarkMode = false
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showValueInput, setShowValueInput] = useState(false);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  
  const colors = THEMES[theme][isDarkMode ? 'dark' : 'light'];
  
  // ИСПРАВЛЕННОЕ ОПРЕДЕЛЕНИЕ СОСТОЯНИЯ ВЫПОЛНЕНИЯ
  const completion = habit.completions?.[selectedDate];
  
  let isCompleted, currentValue, targetValue, displayValue;
  
  if (habit.type === 'boolean') {
    isCompleted = Boolean(completion);
    currentValue = isCompleted ? 1 : 0;
    targetValue = 1;
    displayValue = isCompleted ? 'Выполнено' : 'Не выполнено';
  } else if (habit.type === 'weight') {
    // ИСПРАВЛЕННАЯ ЛОГИКА ДЛЯ ВЕСА
    isCompleted = Boolean(completion && typeof completion === 'object' && completion.weight > 0);
    currentValue = (completion && typeof completion === 'object') ? completion.weight : 0;
    targetValue = habit.targetWeight || 70;
    
    if (currentValue > 0) {
      const status = WEIGHT_UTILS.getWeightStatus(currentValue, targetValue);
      displayValue = `${currentValue.toFixed(1)} кг (${status.message})`;
    } else {
      displayValue = `Цель: ${targetValue} кг`;
    }
  } else {
    // Для количественных привычек
    isCompleted = completion?.completed || false;
    currentValue = completion?.value || 0;
    targetValue = habit.targetValue || 1;
   const unitLabel = habit.unit && MEASUREMENT_UNITS[habit.unit] 
  ? MEASUREMENT_UNITS[habit.unit].shortLabel 
  : 'раз';
displayValue = `${currentValue} / ${targetValue} ${unitLabel}`;
  }

  const progressPercentage = habit.type === 'weight' 
    ? (currentValue > 0 ? 100 : 0) // Для веса - либо записан, либо нет
    : (targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0);

  // ЦВЕТ ДЛЯ ВЕСОВЫХ ПРИВЫЧЕК
  const getWeightStatusColor = () => {
    if (currentValue === 0) return colors.textSecondary;
    const status = WEIGHT_UTILS.getWeightStatus(currentValue, targetValue);
    if (status.type === 'good') return colors.success;
    if (status.type === 'warning') return colors.warning;
    return colors.error;
  };

  const handleToggle = () => {
    if (habit.type === 'boolean') {
      onToggle(habit.id, selectedDate);
    } else if (habit.type === 'weight') {
      // Для веса открываем специальный ввод
      setWeightValue(currentValue > 0 ? currentValue.toString() : targetValue.toString());
      setShowWeightInput(true);
    } else {
      // Для количественных привычек
      setInputValue(targetValue.toString());
      setShowValueInput(true);
    }
  };

  const handleValueSubmit = () => {
    const value = parseInt(inputValue) || 0;
    onUpdateValue(habit.id, selectedDate, value);
    setShowValueInput(false);
    setInputValue('');
  };

  // ИСПРАВЛЕННАЯ ФУНКЦИЯ СОХРАНЕНИЯ ВЕСА
  const handleWeightSubmit = () => {
    const weight = parseFloat(weightValue);
    const validation = WEIGHT_UTILS.validateWeight(weight, 'kg');
    
    if (validation) {
      Alert.alert('Ошибка', validation);
      return;
    }
    
    // ИСПРАВЛЕННАЯ СТРУКТУРА ДАННЫХ ДЛЯ ВЕСА
    const weightData = {
      weight: weight,
      timestamp: new Date().toISOString(),
      targetWeight: habit.targetWeight,
      recorded: true
    };
    
    console.log('Отправляем данные веса:', weightData);
    onUpdateValue(habit.id, selectedDate, weightData);
    
    setTimeout(() => {
      setShowWeightInput(false);
      setWeightValue('');
    }, 100);
  };

  const handleEdit = () => {
    onEdit(habit);
    setShowActions(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Удалить привычку?',
      `Вы уверены, что хотите удалить "${habit.name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            onDelete(habit.id);
            setShowActions(false);
          }
        }
      ]
    );
  };

  // === НОВАЯ ФУНКЦИЯ АРХИВИРОВАНИЯ ===
  const handleArchive = () => {
    console.log('🗂️ HabitCard: handleArchive вызван для привычки:', habit.name, 'ID:', habit.id);
    console.log('🗂️ HabitCard: onArchive тип:', typeof onArchive);
    
    console.log('🗂️ HabitCard: Показываем Alert.alert...');
    
    try {
      Alert.alert(
        'Завершить привычку?',
        `"${habit.name}" будет помещена в архив. Вы сможете восстановить её позже.`,
        [
          { 
            text: 'Отмена', 
            style: 'cancel',
            onPress: () => {
              console.log('🗂️ HabitCard: Пользователь отменил архивирование');
            }
          },
          {
            text: 'Завершить',
            style: 'default',
            onPress: () => {
              console.log('🗂️ HabitCard: Пользователь подтвердил архивирование, вызываем onArchive');
              console.log('🗂️ HabitCard: Передаем ID:', habit.id);
              
              try {
                onArchive(habit.id);
                console.log('🗂️ HabitCard: onArchive успешно вызван');
              } catch (error) {
                console.error('🗂️ HabitCard: Ошибка при вызове onArchive:', error);
              }
              
              setShowActions(false);
              console.log('🗂️ HabitCard: onArchive вызван, меню действий закрыто');
            }
          }
        ]
      );
      console.log('🗂️ HabitCard: Alert.alert успешно вызван');
    } catch (error) {
      console.error('🗂️ HabitCard: Ошибка при показе Alert.alert:', error);
    }
  };

  const handleLongPress = () => {
    console.log('🎯 HabitCard: handleLongPress вызван для привычки:', habit.name);
    console.log('🎯 HabitCard: текущее состояние showActions:', showActions);
    console.log('🎯 HabitCard: onArchive функция передана?', typeof onArchive);
    setShowActions(!showActions);
  };

  // Рендер модального окна для ввода обычных значений
  const renderValueModal = () => (
    <Modal
      visible={showValueInput}
      transparent
      animationType="fade"
      onRequestClose={() => setShowValueInput(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.valueModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {habit.name}
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Цель: {targetValue} {habit.unit && MEASUREMENT_UNITS[habit.unit] ? MEASUREMENT_UNITS[habit.unit].shortLabel : 'раз'}
          </Text>
          
          <TextInput
            style={[styles.valueInput, { 
              backgroundColor: colors.surface, 
              borderColor: colors.border,
              color: colors.text 
            }]}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={`Введите значение (0-${targetValue * 2})`}
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            autoFocus
          />
          
          <View style={styles.quickButtons}>
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: colors.error }]}
              onPress={() => {
                const currentInput = parseInt(inputValue) || 0;
                const newValue = Math.max(0, currentInput - 1);
                setInputValue(newValue.toString());
              }}
            >
              <Ionicons name="remove" size={20} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: colors.success }]}
              onPress={() => {
                const currentInput = parseInt(inputValue) || 0;
                const newValue = currentInput + 1;
                setInputValue(newValue.toString());
              }}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowValueInput(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                Отмена
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleValueSubmit}
            >
              <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>
                Сохранить
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Рендер модального окна для ввода веса
  const renderWeightModal = () => (
    <Modal
      visible={showWeightInput}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowWeightInput(false);
        setWeightValue('');
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.weightModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Запись веса
          </Text>
          
          <View style={styles.weightInputContainer}>
            <TextInput
              style={[styles.weightInput, { 
                backgroundColor: colors.surface, 
                borderColor: colors.border,
                color: colors.text 
              }]}
              value={weightValue}
              onChangeText={setWeightValue}
              placeholder="0.0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={[styles.weightUnit, { color: colors.text }]}>кг</Text>
          </View>
          
          {weightValue && (
            <View style={styles.weightPreview}>
              <Text style={[styles.weightStatus, { 
                color: parseFloat(weightValue) <= targetValue ? colors.success : colors.warning 
              }]}>
                {parseFloat(weightValue) <= targetValue ? 'В пределах цели' : 'Выше целевого веса'}
              </Text>
            </View>
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                setShowWeightInput(false);
                setWeightValue('');
              }}
            >
              <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                Отмена
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleWeightSubmit}
            >
              <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>
                Сохранить
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
// Функция расчета прогресса для весовых привычек
  const getWeightProgress = () => {
    if (!currentValue || currentValue === 0) return 0;
    
    const startWeight = habit.startWeight || (habit.weightGoal === 'lose' ? targetValue + 10 : targetValue - 10);
    
    if (habit.weightGoal === 'lose') {
      // Снижение веса: прогресс от стартового к целевому
      if (currentValue >= startWeight) return 0;
      if (currentValue <= targetValue) return 100;
      return Math.round(((startWeight - currentValue) / (startWeight - targetValue)) * 100);
    } else if (habit.weightGoal === 'gain') {
      // Набор веса: прогресс от стартового к целевому
      if (currentValue <= startWeight) return 0;
      if (currentValue >= targetValue) return 100;
      return Math.round(((currentValue - startWeight) / (targetValue - startWeight)) * 100);
    } else {
      // Поддержание веса: 100% если в пределах ±2кг от цели
      const tolerance = 2;
      if (Math.abs(currentValue - targetValue) <= tolerance) return 100;
      return 0;
    }
  };

  // Общая функция расчета прогресса
  const getProgress = () => {
    if (habit.type === 'boolean') {
      return isCompleted ? 100 : 0;
    } else if (habit.type === 'weight') {
      return getWeightProgress();
    } else {
      return progressPercentage;
    }
  };

  // Функция определения цвета фона по прогрессу
  const getProgressOpacity = (progress) => {
    if (progress === 0) return '00'; // Прозрачный
    if (progress < 100) return '1A'; // 10% прозрачность
    if (progress === 100) return '26'; // 15% прозрачность
    return '33'; // 20% прозрачность для перевыполнения
  };
  // === ОРИГИНАЛЬНАЯ СТРУКТУРА КАРТОЧКИ ===
  const progress = getProgress();
  const isOverachieved = (habit.type === 'number' && currentValue > targetValue) || 
                        (habit.type === 'weight' && habit.weightGoal === 'lose' && currentValue < targetValue - 2) ||
                        (habit.type === 'weight' && habit.weightGoal === 'gain' && currentValue > targetValue + 2);
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.card,
        borderColor: habit.color || '#2196F3',
        borderWidth: 2,
        overflow: 'hidden',
        position: 'relative',
      }
    ]}>
      {/* Фон-прогресс для всех типов привычек */}
      <View 
        style={[
          styles.progressFill,
          {
            backgroundColor: (habit.color || '#2196F3') + getProgressOpacity(isOverachieved ? 101 : progress),
            width: `${Math.min(progress, 100)}%`,
          }
        ]}
      />
      
      <TouchableOpacity
        onPress={handleToggle}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[styles.cardContent]}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.habitInfo}>
            <View style={[
              styles.iconContainer,
{ backgroundColor: (habit.color || '#2196F3') + '20' }
            ]}>
              <Text style={styles.habitIcon}>{habit.icon}</Text>
            </View>
            
            <View style={styles.habitDetails}>
              <Text style={[styles.habitName, { color: colors.text }]}>
                {habit.name}
              </Text>
              
              {habit.description && (
                <Text style={[styles.habitDescription, { color: colors.textSecondary }]}>
                  {habit.description}
                </Text>
              )}
              
              {/* Информация в зависимости от типа привычки */}
              <View style={styles.habitProgress}>
                <Text style={[
                  styles.progressText, 
                  { color: habit.type === 'weight' ? getWeightStatusColor() : colors.textSecondary }
                ]}>
                  {displayValue}
                </Text>
                
                
                {/* Индикатор записи для веса */}
                {habit.type === 'weight' && currentValue > 0 && (
                  <View style={styles.weightIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={[styles.weightIndicatorText, { color: colors.success }]}>
                      Записано
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.statusContainer}>
            {habit.type === 'boolean' ? (
              // Кнопка для булевых привычек
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: isCompleted ? colors.success : colors.surface,
                    borderColor: isCompleted ? colors.success : colors.border
                  }
                ]}
                onPress={handleToggle}
              >
                <Ionicons
                  name={isCompleted ? "checkmark" : "ellipse-outline"}
                  size={24}
                  color={isCompleted ? '#ffffff' : colors.textSecondary}
                />
              </TouchableOpacity>
            ) : habit.type === 'weight' ? (
              // Кнопка для веса
              <TouchableOpacity
                style={[
                  styles.weightButton,
                  {
                    backgroundColor: currentValue > 0 ? colors.success : colors.surface,
                    borderColor: currentValue > 0 ? colors.success : colors.border,
                  }
                ]}
                onPress={handleToggle}
              >
                {currentValue > 0 ? (
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                ) : (
                  <Ionicons name="scale-outline" size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            ) : (
              // Кнопка для количественных привычек
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  {
                    backgroundColor: currentValue > 0 ? 
                      (currentValue >= targetValue ? colors.success : colors.primary) : 
                      colors.surface,
                    borderColor: currentValue > 0 ? 
                      (currentValue >= targetValue ? colors.success : colors.primary) : 
                      colors.border,
                  }
                ]}
                onPress={handleToggle}
              >
                {currentValue >= targetValue && currentValue > targetValue ? (
                  <Text style={styles.overachievementIcon}>🔥</Text>
                ) : currentValue >= targetValue ? (
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                ) : (
                  <Ionicons name="add" size={20} color={currentValue > 0 ? '#ffffff' : colors.textSecondary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* === КНОПКИ ДЕЙСТВИЙ В НОВОМ ПОРЯДКЕ === */}
        {showActions && (
          <View style={[styles.actionsContainer, { borderColor: colors.border }]}>
            {/* ЗАВЕРШИТЬ - ПЕРВАЯ КНОПКА С ТЕКСТОМ (ШИРОКАЯ) */}
            <TouchableOpacity
              style={[styles.actionButtonWide, { backgroundColor: colors.warning }]}
              onPress={() => {
                console.log('🗂️ HabitCard: Нажата кнопка Завершить');
                handleArchive();
              }}
            >
              <Ionicons name="archive" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Завершить</Text>
            </TouchableOpacity>
            
            {/* РЕДАКТИРОВАТЬ - ВТОРАЯ КНОПКА БЕЗ ТЕКСТА (УЗКАЯ) */}
            <TouchableOpacity
              style={[styles.actionButtonSmall, { backgroundColor: colors.primary }]}
              onPress={handleEdit}
            >
              <Ionicons name="pencil" size={18} color="#ffffff" />
            </TouchableOpacity>
            
            {/* УДАЛИТЬ - ТРЕТЬЯ КНОПКА БЕЗ ТЕКСТА (УЗКАЯ) */}
            <TouchableOpacity
              style={[styles.actionButtonSmall, { backgroundColor: colors.error }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
      
      {renderValueModal()}
      {renderWeightModal()}
    </View>
  );
};

// === ОРИГИНАЛЬНЫЕ СТИЛИ ===
const styles = StyleSheet.create({
container: {
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    position: 'relative',
  },
  
  cardContent: {
    padding: SPACING.md,
    position: 'relative',
    zIndex: 1,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  
  habitInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  
  habitIcon: {
    fontSize: 20,
  },
  
  habitDetails: {
    flex: 1,
  },
  
  habitName: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  
  habitDescription: {
    ...TYPOGRAPHY.bodyMedium,
    marginBottom: SPACING.sm,
  },
  
  habitProgress: {
    marginTop: SPACING.xs,
  },
  
  progressText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: BORDER_RADIUS.lg,
    zIndex: 0,
  },
  
  weightIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  
  weightIndicatorText: {
    ...TYPOGRAPHY.caption,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  
  statusContainer: {
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  
  toggleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  weightButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  overachievementIcon: {
    fontSize: 18,
  },
  
  // === ДЕЙСТВИЯ С ПРЯМОУГОЛЬНЫМИ КНОПКАМИ ===
  actionsContainer: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  
  actionButtonWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 40,
    flex: 1, // Больше места для кнопки с текстом
    gap: SPACING.xs,
  },
  
  actionButtonSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 40,
    width: 44, // Фиксированная ширина для иконочных кнопок
  },
  
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // === МОДАЛЬНЫЕ ОКНА ===
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  
  valueModal: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 300,
  },
  
  weightModal: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 320,
  },
  
  modalTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  
  modalSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  
  valueInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  
  weightInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    minWidth: 120,
  },
  
  weightUnit: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  
  weightPreview: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  
  weightStatus: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  
  quickButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 50,
    alignItems: 'center',
  },
  
  quickButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  
  modalButtonText: {
    ...TYPOGRAPHY.button,
    fontWeight: '600',
  },
});

export default HabitCard;