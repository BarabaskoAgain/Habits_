// ====================================
// ФОРМА СОЗДАНИЯ ПРИВЫЧЕК - ТЕКСТОВЫЙ РЕЖИМ
// HabitFormModal.js - НОВЫЙ ИНТЕРФЕЙС
// ====================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Vibration,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Импорт констант
import { 
  THEMES, 
  SPACING, 
  BORDER_RADIUS, 
  TYPOGRAPHY,
  HABIT_CATEGORIES,
  HABIT_ICONS,
  HABIT_ICON_CATEGORIES,
  HABIT_COLORS,
  HABIT_COLOR_CATEGORIES,
  HABIT_TYPES,
  MEASUREMENT_UNITS
} from './constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HabitFormModal = ({
  visible,
  habit,
  onSave = () => {},
  onCancel = () => {},
  theme = 'blue',
  isDarkMode = false
}) => {
  // === СОСТОЯНИЕ ФОРМЫ ===
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🎯',
    color: '#2196F3',
    category: 'health',
    type: 'boolean',
    targetValue: '1',
    targetWeight: '70',
    weightGoal: 'lose', // lose, gain, maintain
    unit: 'times',
    targetDaysPerWeek: '7',
    reminderTime: '09:00',
    reminderEnabled: true  // ДОБАВЛЕНО: поле для уведомлений
  });

  // === СОСТОЯНИЕ СЛАЙДЕРА ЦВЕТОВ И ИКОНОК ===
  const [currentColorCategory, setCurrentColorCategory] = useState(0);
    const [currentIconCategory, setCurrentIconCategory] = useState(0);

  // === СОСТОЯНИЕ ТЕКСТОВОГО РЕЖИМА ===
  const [currentField, setCurrentField] = useState(null);
  const [completedFields, setCompletedFields] = useState(new Set());
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  
  // Единый текст, который печатается
  const [fullText, setFullText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  
  // НОВОЕ: Состояние для эффекта удаления
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(0);
  const [pendingCompletedFields, setPendingCompletedFields] = useState(null);
  
  // Для отслеживания позиций полей в тексте
  const [fieldPositions, setFieldPositions] = useState({});
  const [textParts, setTextParts] = useState([]);

  // === АНИМАЦИИ ===
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // === РЕФЫ ДЛЯ PICKER'ОВ ВРЕМЕНИ ===
  const hoursScrollRef = useRef(null);
  const minutesScrollRef = useRef(null);

  const colors = THEMES[theme] ? THEMES[theme][isDarkMode ? 'dark' : 'light'] : THEMES.blue.light;

  // === ГЕНЕРАЦИЯ ТЕКСТА ===
  const generateTextParts = useCallback(() => {
    const parts = [];
    
    // Начало
    parts.push({ type: 'text', content: 'Я хочу внедрить в свою жизнь привычку ' });
parts.push({ type: 'field', field: 'name', placeholder: '[название привычки]', value: formData.name });

if (completedFields.has('name')) {
  parts.push({ type: 'text', content: '.\n' });
  parts.push({ type: 'text', content: 'Зачем мне это нужно: ' });
  parts.push({ type: 'field', field: 'description', placeholder: '[описание/мотивация]', value: formData.description });
}

if (completedFields.has('description')) {
  parts.push({ type: 'text', content: '.\nЭта привычка из категории ' });
  parts.push({ type: 'field', field: 'category', placeholder: '[категория]', value: HABIT_CATEGORIES[formData.category]?.label });
  parts.push({ type: 'text', content: '.\n' });
}
    
    if (completedFields.has('category')) {
      parts.push({ type: 'text', content: 'Это привычка типа ' });
      parts.push({ type: 'field', field: 'type', placeholder: '[тип отслеживания]', value: HABIT_TYPES[formData.type]?.label });
      parts.push({ type: 'text', content: '.\n' });
    }
    
    if (completedFields.has('type')) {
      if (formData.type === 'boolean') {
        parts.push({ type: 'text', content: 'Я буду отмечать её выполнение каждый раз, когда выполню.\n' });
      } else if (formData.type === 'number') {
        parts.push({ type: 'text', content: 'Моя цель - ' });
        parts.push({ type: 'field', field: 'details', placeholder: '[количество и единица]', value: `${formData.targetValue} ${MEASUREMENT_UNITS[formData.unit]?.label || ''}` });
        if (completedFields.has('details')) {
          parts.push({ type: 'text', content: ' каждый день.\n' });
        }
      } else if (formData.type === 'weight') {
        parts.push({ type: 'text', content: 'Я хочу ' });
        parts.push({ 
          type: 'field', 
          field: 'weightGoal', 
          placeholder: '[цель]', 
          value: formData.weightGoal === 'lose' ? 'снизить вес до' : 
                 formData.weightGoal === 'gain' ? 'набрать вес до' : 
                 'поддерживать вес'
        });
        if (formData.weightGoal !== 'maintain') {
          parts.push({ type: 'text', content: ' ' });
          parts.push({ type: 'field', field: 'details', placeholder: '[вес]', value: `${formData.targetWeight} кг` });
        }
        if (completedFields.has('weightGoal') && (formData.weightGoal === 'maintain' || completedFields.has('details'))) {
          parts.push({ type: 'text', content: '.\n' });
        }
      }
    }
    
    // Частота - показывается после заполнения деталей
    const shouldShowFrequency = 
      (formData.type === 'boolean' && completedFields.has('type')) ||
      (formData.type === 'number' && completedFields.has('details')) ||
      (formData.type === 'weight' && completedFields.has('weightGoal') && (formData.weightGoal === 'maintain' || completedFields.has('details')));
    
    if (shouldShowFrequency) {
      if (formData.type === 'weight') {
        parts.push({ type: 'text', content: 'Я планирую взвешиваться ' });
      } else {
        parts.push({ type: 'text', content: 'Я планирую выполнять эту привычку ' });
      }
      parts.push({ 
        type: 'field', 
        field: 'frequency', 
        placeholder: '[частота]', 
        value: formData.targetDaysPerWeek === '7' ? 'каждый день' : `${formData.targetDaysPerWeek} дней в неделю`
      });
      if (completedFields.has('frequency')) {
        parts.push({ type: 'text', content: '.\n' });
      }
    }
    
    // Цвет - отдельное предложение
    if (completedFields.has('frequency')) {
      parts.push({ type: 'text', content: 'Моя привычка будет иметь ' });
      parts.push({ type: 'field', field: 'color', placeholder: '[цвет]', value: 'выбранный цвет' });
      if (completedFields.has('color')) {
        parts.push({ type: 'text', content: '.\n' });
      }
    }
    
    // Иконка - отдельное предложение
    if (completedFields.has('color')) {
      parts.push({ type: 'text', content: 'Иконка для привычки: ' });
      parts.push({ type: 'field', field: 'icon', placeholder: '[иконка]', value: formData.icon });
      if (completedFields.has('icon')) {
        parts.push({ type: 'text', content: '.\n' });
      }
    }
    
    // Напоминание
    if (completedFields.has('icon')) {
      parts.push({ type: 'text', content: 'Прошу напоминать мне в ' });
      parts.push({ type: 'field', field: 'reminder', placeholder: '[время]', value: formData.reminderTime });
      if (completedFields.has('reminder')) {
        parts.push({ type: 'text', content: ' каждый день.\n' });
      }
    }
    
    // Завершение
    if (completedFields.has('reminder')) {
      parts.push({ type: 'text', content: '✍️ Я готов(а) начать работать над этой привычкой и понимаю, что формирование привычки требует времени и постоянства.' });
    }
    
    return parts;
  }, [formData, completedFields]);

  // НОВОЕ: Функция для определения позиции удаления
  const findDeletePosition = useCallback((field) => {
    let position = 0;
    let foundField = false;
    
    for (const part of textParts) {
      if (part.type === 'text' && !foundField) {
        position += part.content.length;
      } else if (part.type === 'field' && part.field === field) {
        foundField = true;
        break;
      }
    }
    
    return position;
  }, [textParts]);

  // === ЭФФЕКТЫ ===
  useEffect(() => {
    if (visible) {
      // Анимация появления
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
      
      // Начальный текст
      const parts = generateTextParts();
      setTextParts(parts);
      
      // Вычисляем полный текст для печатания
      let text = '';
      parts.forEach(part => {
        if (part.type === 'text') {
          text += part.content;
        }
      });
      
            // Запускаем анимацию печатания для обоих случаев
      setFullText(text);
      setIsTyping(true);

    } else {
      // Сброс состояния при закрытии
      resetForm();
    }
  }, [visible, habit]);

  // Эффект печатания
  useEffect(() => {
    if (isTyping && currentCharIndex < fullText.length) {
      // Разная скорость для создания и редактирования
      const typingSpeed = habit ? 0.2 : 10; // 1мс для редактирования, 30мс для создания
      
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + fullText[currentCharIndex]);
        setCurrentCharIndex(prev => prev + 1);
      }, typingSpeed);
      
      return () => clearTimeout(timeout);
    } else if (currentCharIndex >= fullText.length) {
      setIsTyping(false);
    }
  }, [currentCharIndex, fullText, isTyping, habit]);

  // Эффект удаления текста с улучшенной производительностью
useEffect(() => {
  if (isDeleting && displayedText.length > deleteTargetIndex) {
    // Более быстрое и плавное удаление
    const charsToDelete = displayedText.length - deleteTargetIndex;
    const deleteSpeed = Math.max(3, Math.min(15, 800 / charsToDelete)); // Быстрее: от 3 до 15мс
    
    const timeout = setTimeout(() => {
      setDisplayedText(prev => prev.slice(0, -1));
    }, deleteSpeed);
    
    return () => clearTimeout(timeout);
  } else if (isDeleting && displayedText.length <= deleteTargetIndex) {
    setIsDeleting(false);
    
    // Применяем отложенные изменения полей, если они есть
    if (pendingCompletedFields) {
      setCompletedFields(pendingCompletedFields);
      setPendingCompletedFields(null);
    }
  }
}, [isDeleting, displayedText.length, deleteTargetIndex, pendingCompletedFields]);

// Отдельный эффект для генерации текста после завершения удаления
useEffect(() => {
  if (!isDeleting && !isTyping && displayedText.length === deleteTargetIndex && deleteTargetIndex > 0) {
    // Генерируем новый текст и начинаем печатать
    const parts = generateTextParts();
    setTextParts(parts);
    
    let newFullText = '';
    parts.forEach(part => {
      if (part.type === 'text') {
        newFullText += part.content;
      }
    });
    
    setFullText(newFullText);
    setCurrentCharIndex(deleteTargetIndex);
    setIsTyping(true);
    
    // Сбрасываем deleteTargetIndex после использования
    setDeleteTargetIndex(0);
  }
}, [isDeleting, isTyping, displayedText.length, deleteTargetIndex, generateTextParts]);

  // Обновление текста при изменении формы
  useEffect(() => {
    // Не обновляем текст во время удаления, если есть отложенные изменения
    if (isDeleting && pendingCompletedFields) {
      return;
    }
    
    const parts = generateTextParts();
    setTextParts(parts);
    
    // Если не печатаем и не удаляем, обновляем полный текст
    if (!isTyping && !isDeleting) {
      let newFullText = '';
      let positions = {};
      let currentPos = 0;
      
      parts.forEach(part => {
        if (part.type === 'text') {
          newFullText += part.content;
          currentPos += part.content.length;
        } else if (part.type === 'field') {
          positions[part.field] = {
            start: currentPos,
            end: currentPos
          };
        }
      });
      
      setFieldPositions(positions);
      
      // Если новый текст длиннее старого, печатаем добавленную часть
      if (newFullText.length > fullText.length) {
        const addedText = newFullText.substring(fullText.length);
        setFullText(newFullText);
        setIsTyping(true);
      }
    }
  }, [formData, completedFields, isTyping, isDeleting, fullText, generateTextParts, pendingCompletedFields]);

  useEffect(() => {
    if (habit) {
      // Режим редактирования
      setFormData({
        name: habit.name || '',
        description: habit.description || '',
        icon: habit.icon || '🎯',
        color: habit.color || '#2196F3',
        category: habit.category || 'health',
        type: habit.type || 'boolean',
        targetValue: habit.targetValue?.toString() || '1',
        targetWeight: habit.targetWeight?.toString() || '70',
        weightGoal: habit.weightGoal || 'lose',
        unit: habit.unit || 'times',
        targetDaysPerWeek: habit.targetDaysPerWeek?.toString() || '7',
        reminderTime: habit.reminderTime || '09:00',
        reminderEnabled: habit.reminderEnabled !== false  // ДОБАВЛЕНО: сохраняем состояние уведомлений
      });


// Отметить все поля как заполненные
const fieldsToMark = ['name', 'description', 'category', 'type', 'frequency', 'color', 'icon', 'reminder'];
      if (habit.type === 'number' || habit.type === 'weight') {
        fieldsToMark.push('details');
      }
      if (habit.type === 'weight') {
        fieldsToMark.push('weightGoal');
      }
      setCompletedFields(new Set(fieldsToMark));
    }
  }, [habit]);

  // === ФУНКЦИИ ===
  const getCurrentFieldValue = (field) => {
    switch (field) {
      case 'name':
        return formData.name;
        case 'description':
  return formData.description;
      case 'category':
        return formData.category;
      case 'type':
        return formData.type;
      case 'weightGoal':
        return formData.weightGoal;
      case 'details':
        if (formData.type === 'number') {
          return `${formData.targetValue}_${formData.unit}`; // Составное значение для числовых полей
        } else if (formData.type === 'weight') {
          return formData.targetWeight;
        }
        return '';
      case 'frequency':
        return formData.targetDaysPerWeek;
      case 'color':
        return formData.color;
      case 'icon':
        return formData.icon;
      case 'reminder':
        return formData.reminderTime;
      default:
        return '';
    }
  };

// === ЭФФЕКТ ДЛЯ РЕДАКТИРОВАНИЯ ПРИВЫЧКИ ===
useEffect(() => {
  if (habit) {
    // Режим редактирования
    setFormData({
      name: habit.name || '',
      description: habit.description || '',
      icon: habit.icon || '🎯',
      color: habit.color || '#2196F3',
      category: habit.category || 'health',
      type: habit.type || 'boolean',
      targetValue: habit.targetValue?.toString() || '1',
      targetWeight: habit.targetWeight?.toString() || '70',
      weightGoal: habit.weightGoal || 'lose',
      unit: habit.unit || 'times',
      targetDaysPerWeek: habit.targetDaysPerWeek?.toString() || '7',
      reminderTime: habit.reminderTime || '09:00',
      reminderEnabled: habit.reminderEnabled !== false
    });

    // Отметить все поля как заполненные
    const fieldsToMark = ['name', 'description', 'category', 'type', 'frequency', 'color', 'icon', 'reminder'];
    if (habit.type === 'number' || habit.type === 'weight') {
      fieldsToMark.push('details');
    }
    if (habit.type === 'weight') {
      fieldsToMark.push('weightGoal');
    }
    setCompletedFields(new Set(fieldsToMark));
  }
}, [habit]);

// === МГНОВЕННОЕ ПОЗИЦИОНИРОВАНИЕ БЕЗ СКРОЛЛИНГА ===
useEffect(() => {
  if (currentField === 'reminder' && showFieldSelector) {
    // Используем requestAnimationFrame для синхронизации с рендером
    requestAnimationFrame(() => {
      const [hours, minutes] = formData.reminderTime.split(':');
      const minutesArray = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

      // Устанавливаем начальную позицию для часов
      if (hoursScrollRef.current) {
        const hourIndex = parseInt(hours);
        const scrollView = hoursScrollRef.current;

        // Мгновенная установка позиции без анимации
        scrollView.scrollTo({
          y: hourIndex * 40,
          animated: false
        });
      }

      // Устанавливаем начальную позицию для минут
      if (minutesScrollRef.current) {
        const minuteIndex = minutesArray.indexOf(parseInt(minutes));
        if (minuteIndex !== -1) {
          const scrollView = minutesScrollRef.current;

          // Мгновенная установка позиции без анимации
          scrollView.scrollTo({
            y: minuteIndex * 40,
            animated: false
          });
        }
      }
    });
  }
}, [currentField, showFieldSelector, formData.reminderTime]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '🎯',
      color: '#2196F3',
      category: 'health',
      type: 'boolean',
      targetValue: '1',
      targetWeight: '70',
      weightGoal: 'lose',
      unit: 'times',
      targetDaysPerWeek: '7',
      reminderTime: '09:00'
    });
    setCurrentField(null);
    setCompletedFields(new Set());
    setShowFieldSelector(false);
    setFullText('');
    setDisplayedText('');
    setCurrentCharIndex(0);
    setIsTyping(false);
    setIsDeleting(false);
    setDeleteTargetIndex(0);
    setPendingCompletedFields(null);
    setTextParts([]);
    setFieldPositions({});
  };

const handleFieldClick = (field) => {
  if (!isTyping && !isDeleting) {
    setCurrentField(field);
    // Просто открываем селектор, не удаляем текст
    setShowFieldSelector(true);
  }
  Platform.OS === 'ios' && Vibration.vibrate(10);
};

const handleFieldSelect = (value, additionalData = {}) => {
  // Проверяем, изменилось ли значение поля
  const currentValue = getCurrentFieldValue(currentField);
  let isValueChanged = false;
  
  if (currentField === 'details' && formData.type === 'number') {
    // Для числовых полей проверяем и значение, и единицу
    const currentDetailsValue = `${formData.targetValue}_${formData.unit}`;
    const newDetailsValue = `${value}_${additionalData.unit || formData.unit}`;
    isValueChanged = currentDetailsValue !== newDetailsValue;
  } else {
    isValueChanged = currentValue !== value;
  }
  
  // Подготавливаем новое состояние полей
  let newCompletedFields = new Set(completedFields);
  newCompletedFields.add(currentField);
  
  // Добавляем связанные поля
  Object.keys(additionalData).forEach(key => {
    newCompletedFields.add(key);
  });
  
  // Если это цель "поддерживать вес", помечаем details как заполненное
  if (currentField === 'weightGoal' && value === 'maintain') {
    newCompletedFields.add('details');
  }
  
  // Если значение изменилось и поле было заполнено, нужно удалить текст после него
  if (isValueChanged && completedFields.has(currentField)) {
    // Находим позицию для удаления
    const deletePosition = findDeletePosition(currentField);
    setDeleteTargetIndex(deletePosition);
    setIsDeleting(true);
    
    // Определяем какие поля нужно очистить после удаления
const fieldsOrder = ['name', 'description', 'category', 'type', 'weightGoal', 'details', 'frequency', 'color', 'icon', 'reminder'];
    const clickedFieldIndex = fieldsOrder.indexOf(currentField);
    
    // Подготавливаем новое состояние полей для применения после удаления
    const fieldsAfterDeletion = new Set();
    fieldsOrder.forEach((f, index) => {
      if (index < clickedFieldIndex && completedFields.has(f)) {
        fieldsAfterDeletion.add(f);
      }
    });
    
    // Добавляем текущее поле и связанные поля
    fieldsAfterDeletion.add(currentField);
    Object.keys(additionalData).forEach(key => {
      fieldsAfterDeletion.add(key);
    });
    if (currentField === 'weightGoal' && value === 'maintain') {
      fieldsAfterDeletion.add('details');
    }
    
    // Сохраняем новое состояние для применения после удаления
    setPendingCompletedFields(fieldsAfterDeletion);
  } else {
    // Если значение не изменилось, обновляем поля сразу
    setCompletedFields(newCompletedFields);
  }
  
  // Обновляем данные формы
  const newFormData = { ...formData, [currentField]: value, ...additionalData };
  setFormData(newFormData);
  
  // Закрываем селектор
  setShowFieldSelector(false);
  setCurrentField(null);
  
  // Вибрация
  if (Platform.OS === 'ios') {
    Vibration.vibrate(10);
  }
};

  const handleSave = () => {
    // Валидация
    if (!formData.name.trim()) {
      Alert.alert('Ошибка', 'Введите название привычки');
      return;
    }
    
    const habitData = {
      name: formData.name.trim(),
  description: (formData.description || '').trim(), // всегда строка!
      icon: formData.icon,
      color: formData.color,
      category: formData.category,
      type: formData.type,
      targetValue: formData.type === 'number' ? parseInt(formData.targetValue) || 1 : undefined,
      targetWeight: formData.type === 'weight' ? parseFloat(formData.targetWeight) || 70 : undefined,
      weightGoal: formData.type === 'weight' ? formData.weightGoal : undefined,
            unit: formData.type === 'number' ? formData.unit : undefined,
      reminderEnabled: formData.reminderEnabled,  // ДОБАВЛЕНО: передаем состояние уведомлений
      targetDaysPerWeek: parseInt(formData.targetDaysPerWeek) || 7,
      reminderTime: formData.reminderTime
    };
    
    onSave(habitData);
    Platform.OS === 'ios' && Vibration.vibrate(20);
  };

  // === КОМПОНЕНТЫ РЕНДЕРА ===
  const renderHabitPreview = () => (
    <Animated.View style={[
      styles.previewContainer,
      { 
        backgroundColor: colors.surface,
        borderColor: colors.border,
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: scaleAnim }
        ]
      }
    ]}>
      <Text style={[styles.previewTitle, { color: colors.text }]}>
        Превью вашей привычки:
      </Text>
      
      <View style={[
        styles.previewCard,
        { 
          backgroundColor: colors.background,
          borderColor: formData.color || colors.border
        }
      ]}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewIcon}>{formData.icon || '🎯'}</Text>
          <View style={styles.previewInfo}>
            <Text style={[styles.previewName, { color: colors.text }]}>
              {formData.name || 'Название привычки'}
            </Text>
         {formData.description && (
  <Text style={[styles.previewDescription, { color: colors.textSecondary }]} numberOfLines={2}>
    {formData.description}
  </Text>
)}   
            <View style={styles.previewMeta}>
              <Text style={[styles.previewType, { color: colors.textSecondary }]}>
                {HABIT_TYPES[formData.type]?.label || 'Тип привычки'}
              </Text>
              {formData.type === 'number' && formData.targetValue && (
                <Text style={[styles.previewTarget, { color: colors.textSecondary }]}>
                  • Цель: {formData.targetValue} {MEASUREMENT_UNITS[formData.unit]?.shortLabel || ''}
                </Text>
              )}
              {formData.type === 'weight' && (
                <Text style={[styles.previewTarget, { color: colors.textSecondary }]}>
                  • {formData.weightGoal === 'lose' ? 'Снизить до' : 
                     formData.weightGoal === 'gain' ? 'Набрать до' : 
                     'Поддерживать'} {formData.weightGoal !== 'maintain' && formData.targetWeight ? `${formData.targetWeight} кг` : ''}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.previewFooter}>
          <View style={[styles.previewBadge, { backgroundColor: colors.surface }]}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.previewBadgeText, { color: colors.textSecondary }]}>
              {formData.targetDaysPerWeek}/7 дней
            </Text>
          </View>
          <View style={[styles.previewBadge, { backgroundColor: colors.surface }]}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.previewBadgeText, { color: colors.textSecondary }]}>
              {formData.reminderTime}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderTextContent = () => {
    let charCount = 0;
    const elements = [];
    let currentLineElements = [];
    
    textParts.forEach((part, index) => {
      if (part.type === 'text') {
        const start = charCount;
        const end = charCount + part.content.length;
        charCount = end;
        
        // Показываем только напечатанную часть текста
        const visibleText = displayedText.substring(start, Math.min(end, displayedText.length));
        
        // Разбиваем текст по переносам строк
        const lines = visibleText.split('\n');
        lines.forEach((line, lineIndex) => {
          if (line) {
            currentLineElements.push(
              <Text key={`${index}-${lineIndex}`} style={[styles.textLine, { color: colors.text }]}>
                {line}
              </Text>
            );
          }
          
          // Если есть перенос строки (кроме последнего пустого)
          if (lineIndex < lines.length - 1 || (lineIndex === lines.length - 1 && !line)) {
            // Добавляем текущую строку в массив элементов
            if (currentLineElements.length > 0) {
              elements.push(
                <View key={`line-${elements.length}`} style={styles.textLineWrapper}>
                  {currentLineElements}
                </View>
              );
              currentLineElements = [];
            }
          }
        });
      } else if (part.type === 'field') {
        const isCompleted = completedFields.has(part.field);
        const shouldShow = charCount <= displayedText.length;
        
        if (!shouldShow && !isCompleted) {
          return;
        }
        
        currentLineElements.push(
          <TouchableOpacity 
            key={index}
            onPress={() => handleFieldClick(part.field)}
            activeOpacity={0.7}
            style={styles.fieldWrapper}
          >
            <Text style={[
              styles.textField,
              isCompleted ? styles.textFieldCompleted : styles.textFieldEmpty,
              { color: isCompleted ? formData.color : colors.primary }
            ]}>
              {isCompleted ? part.value : part.placeholder}
            </Text>
          </TouchableOpacity>
        );
      }
    });
    
    // Добавляем последнюю строку, если она есть
    if (currentLineElements.length > 0) {
      elements.push(
        <View key={`line-${elements.length}`} style={styles.textLineWrapper}>
          {currentLineElements}
        </View>
      );
    }
    
    return (
      <ScrollView 
        style={styles.textContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.textWrapper}>
          {elements}
        </View>
      </ScrollView>
    );
  };

  const renderFieldSelector = () => {
    if (!showFieldSelector || !currentField) return null;
    
    return (
      <View style={[styles.selectorOverlay, { backgroundColor: colors.background + 'F0' }]}>
        <TouchableOpacity 
          style={styles.selectorBackdrop}
          onPress={() => setShowFieldSelector(false)}
          activeOpacity={1}
        />
        
        <Animated.View style={[
          styles.selectorContainer,
          { 
            backgroundColor: colors.surface,
            borderColor: colors.border
          }
        ]}>
          {/* Селектор для названия */}
          {currentField === 'name' && (
            <View style={styles.selectorContent}>
              <Text style={[styles.selectorTitle, { color: colors.text }]}>
                Название привычки
              </Text>
              <TextInput
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Например: Пить воду"
                placeholderTextColor={colors.textSecondary}
                autoFocus
                maxLength={50}
              />
              <TouchableOpacity
                style={[styles.selectorButton, { backgroundColor: colors.primary }]}
                onPress={() => formData.name.trim() && handleFieldSelect(formData.name)}
              >
                <Text style={styles.selectorButtonText}>Продолжить</Text>
              </TouchableOpacity>
            </View>
          )}
{/* Селектор для описания */}
{currentField === 'description' && (
  <View style={styles.selectorContent}>
    <Text style={[styles.selectorTitle, { color: colors.text }]}>
      Зачем вам эта привычка?
    </Text>
    <Text style={[styles.selectorSubtitle, { color: colors.textSecondary }]}>
      Опишите вашу мотивацию или цель
    </Text>
    <TextInput
      style={[
        styles.descriptionInput,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.text
        }
      ]}
      value={formData.description}
      onChangeText={(text) => setFormData({ ...formData, description: text })}
      placeholder="Например: Хочу улучшить здоровье и чувствовать себя энергичнее"
      placeholderTextColor={colors.textSecondary}
      multiline
      numberOfLines={3}
      autoFocus
    />
    <TouchableOpacity
      style={[styles.selectorButton, { backgroundColor: colors.primary }]}
      onPress={() => handleFieldSelect(formData.description)}
    >
      <Text style={styles.selectorButtonText}>Готово</Text>
    </TouchableOpacity>
  </View>
)}
        
          {/* Селектор для категории */}
          {currentField === 'category' && (
            <View style={styles.selectorContent}>
              <Text style={[styles.selectorTitle, { color: colors.text }]}>
                Выберите категорию
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {Object.entries(HABIT_CATEGORIES).map(([key, category]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => handleFieldSelect(key)}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <View style={styles.categoryInfo}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>
                        {category.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Селектор для типа */}
          {currentField === 'type' && (
            <View style={styles.selectorContent}>
              <Text style={[styles.selectorTitle, { color: colors.text }]}>
                Как будем отслеживать?
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {Object.entries(HABIT_TYPES).map(([key, type]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => handleFieldSelect(key)}
                  >
                    <Text style={styles.typeIcon}>{type.icon}</Text>
                    <View style={styles.typeInfo}>
                      <Text style={[styles.typeName, { color: colors.text }]}>
                        {type.label}
                      </Text>
                      <Text style={[styles.typeDescription, { color: colors.textSecondary }]}>
                        {type.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Селектор для деталей (количество/вес) */}
          {currentField === 'details' && (
            <View style={styles.selectorContent}>
              {formData.type === 'number' && (
                <>
                  <Text style={[styles.selectorTitle, { color: colors.text }]}>
                    Укажите цель
                  </Text>
                  <View style={styles.detailsInputs}>
                    <TextInput
                      style={[
                        styles.valueInput,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text
                        }
                      ]}
                      value={formData.targetValue}
                      onChangeText={(text) => setFormData({ ...formData, targetValue: text })}
                      placeholder="Количество"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      autoFocus
                    />
                    <ScrollView 
                      style={styles.unitSelector}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {Object.entries(MEASUREMENT_UNITS).map(([key, unit]) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.unitOption,
                            {
                              backgroundColor: formData.unit === key ? colors.primary : colors.background,
                              borderColor: formData.unit === key ? colors.primary : colors.border
                            }
                          ]}
                          onPress={() => setFormData({ ...formData, unit: key })}
                        >
                          <Text style={[
                            styles.unitText,
                            { color: formData.unit === key ? '#ffffff' : colors.text }
                          ]}>
                            {unit.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <TouchableOpacity
                    style={[styles.selectorButton, { backgroundColor: colors.primary }]}
                    onPress={() => formData.targetValue && handleFieldSelect(formData.targetValue, { unit: formData.unit })}
                  >
                    <Text style={styles.selectorButtonText}>Готово</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {formData.type === 'weight' && (
                <>
                  <Text style={[styles.selectorTitle, { color: colors.text }]}>
                    Целевой вес (кг)
                  </Text>
                  <TextInput
                    style={[
                      styles.weightInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text
                      }
                    ]}
                    value={formData.targetWeight}
                    onChangeText={(text) => setFormData({ ...formData, targetWeight: text })}
                    placeholder="Например: 70"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.selectorButton, { backgroundColor: colors.primary }]}
                    onPress={() => formData.targetWeight && handleFieldSelect(formData.targetWeight)}
                  >
                    <Text style={styles.selectorButtonText}>Готово</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          
          {/* Селектор для цели веса */}
          {currentField === 'weightGoal' && (
            <View style={styles.selectorContent}>
              <Text style={[styles.selectorTitle, { color: colors.text }]}>
                Какая у вас цель?
              </Text>
              <TouchableOpacity
                style={[
                  styles.goalOption,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => handleFieldSelect('lose')}
              >
                <Text style={styles.goalIcon}>📉</Text>
                <View style={styles.goalInfo}>
                  <Text style={[styles.goalName, { color: colors.text }]}>
                    Снизить вес
                  </Text>
                  <Text style={[styles.goalDescription, { color: colors.textSecondary }]}>
                    Достичь меньшего веса
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.goalOption,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => handleFieldSelect('gain')}
              >
                <Text style={styles.goalIcon}>📈</Text>
                <View style={styles.goalInfo}>
                  <Text style={[styles.goalName, { color: colors.text }]}>
                    Набрать вес
                  </Text>
                  <Text style={[styles.goalDescription, { color: colors.textSecondary }]}>
                    Достичь большего веса
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.goalOption,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => handleFieldSelect('maintain')}
              >
                <Text style={styles.goalIcon}>⚖️</Text>
                <View style={styles.goalInfo}>
                  <Text style={[styles.goalName, { color: colors.text }]}>
                    Поддерживать вес
                  </Text>
                  <Text style={[styles.goalDescription, { color: colors.textSecondary }]}>
                    Сохранить текущий вес
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Селектор для частоты */}
          {currentField === 'frequency' && (
            <View style={styles.selectorContent}>
              <Text style={[styles.selectorTitle, { color: colors.text }]}>
                Сколько дней в неделю?
              </Text>
              <View style={styles.frequencyOptions}>
                {[1, 2, 3, 4, 5, 6, 7].map(days => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.frequencyOption,
                      {
                        backgroundColor: colors.primary + '15',
                        borderColor: colors.primary
                      }
                    ]}
                    onPress={() => handleFieldSelect(days.toString(), { targetDaysPerWeek: days.toString() })}
                  >
                    <Text style={[styles.frequencyNumber, { color: colors.primary }]}>
                      {days}
                    </Text>
                    <Text style={[styles.frequencyLabel, { color: colors.textSecondary }]}>
                      {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
    {/* Селектор для цвета */}
           {currentField === 'color' && (
             <View style={styles.selectorContent}>
               <Text style={[styles.selectorTitle, { color: colors.text }]}>
                 Выберите цвет
               </Text>

               {/* Заголовок текущей категории */}
               <View style={styles.colorSliderHeader}>
                 <Text style={styles.colorCategoryIcon}>
                   {Object.values(HABIT_COLOR_CATEGORIES)[currentColorCategory]?.icon}
                 </Text>
                 <Text style={[styles.colorSliderCategoryTitle, { color: colors.text }]}>
                   {Object.values(HABIT_COLOR_CATEGORIES)[currentColorCategory]?.label}
                 </Text>
               </View>

               {/* Контейнер слайдера */}
               <View style={styles.colorSliderContainer}>
                 {/* Стрелка влево */}
                 <TouchableOpacity
                   style={[
                     styles.colorSliderArrow,
                     {
                       backgroundColor: colors.surface,
                       opacity: currentColorCategory === 0 ? 0.3 : 1
                     }
                   ]}
                   onPress={() => {
                     if (currentColorCategory > 0) {
                       setCurrentColorCategory(currentColorCategory - 1);
                     }
                   }}
                   disabled={currentColorCategory === 0}
                 >
                   <Ionicons name="chevron-back" size={20} color={colors.text} />
                 </TouchableOpacity>

                 {/* Сетка цветов текущей категории */}
                 <View style={styles.colorSliderContent}>
                   <View style={styles.colorCategoryGrid}>
                     {Object.values(HABIT_COLOR_CATEGORIES)[currentColorCategory]?.colors.map(color => (
                       <TouchableOpacity
                         key={color}
                         style={[
                           styles.colorOptionCompact,
                           {
                             backgroundColor: color,
                             borderWidth: formData.color === color ? 3 : 0,
                             borderColor: formData.color === color ? '#ffffff' : 'transparent'
                           }
                         ]}
                         onPress={() => handleFieldSelect(color)}
                       >
                         {formData.color === color && (
                           <Ionicons name="checkmark" size={20} color="#ffffff" />
                         )}
                       </TouchableOpacity>
                     ))}
                   </View>
                 </View>

                 {/* Стрелка вправо */}
                 <TouchableOpacity
                   style={[
                     styles.colorSliderArrow,
                     {
                       backgroundColor: colors.surface,
                       opacity: currentColorCategory === Object.keys(HABIT_COLOR_CATEGORIES).length - 1 ? 0.3 : 1
                     }
                   ]}
                   onPress={() => {
                     if (currentColorCategory < Object.keys(HABIT_COLOR_CATEGORIES).length - 1) {
                       setCurrentColorCategory(currentColorCategory + 1);
                     }
                   }}
                   disabled={currentColorCategory === Object.keys(HABIT_COLOR_CATEGORIES).length - 1}
                 >
                   <Ionicons name="chevron-forward" size={20} color={colors.text} />
                 </TouchableOpacity>
               </View>

               {/* Индикаторы страниц */}
               <View style={styles.colorSliderIndicators}>
                 {Object.keys(HABIT_COLOR_CATEGORIES).map((_, index) => (
                   <TouchableOpacity
                     key={index}
                     style={[
                       styles.colorSliderDot,
                       {
                         backgroundColor: index === currentColorCategory
                           ? colors.primary
                           : colors.border
                       }
                     ]}
                     onPress={() => setCurrentColorCategory(index)}
                   />
                 ))}
               </View>
             </View>
           )}
          
          {/* Селектор для иконки */}
          {currentField === 'icon' && (
            <View style={styles.selectorContent}>
              <Text style={[styles.selectorTitle, { color: colors.text }]}>
                Выберите иконку
              </Text>

              {/* Заголовок текущей категории */}
              <View style={styles.iconSliderHeader}>
                <Text style={styles.iconCategoryIcon}>
                  {Object.values(HABIT_ICON_CATEGORIES)[currentIconCategory]?.icon}
                </Text>
                <Text style={[styles.iconSliderCategoryTitle, { color: colors.text }]}>
                  {Object.values(HABIT_ICON_CATEGORIES)[currentIconCategory]?.label}
                </Text>
              </View>

              {/* Контейнер слайдера */}
              <View style={styles.iconSliderContainer}>
                {/* Стрелка влево */}
                <TouchableOpacity
                  style={[
                    styles.iconSliderArrow,
                    {
                      backgroundColor: colors.surface,
                      opacity: currentIconCategory === 0 ? 0.3 : 1
                    }
                  ]}
                  onPress={() => {
                    if (currentIconCategory > 0) {
                      setCurrentIconCategory(currentIconCategory - 1);
                    }
                  }}
                  disabled={currentIconCategory === 0}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>

                {/* Сетка иконок текущей категории */}
                <View style={styles.iconSliderContent}>
                  <View style={styles.iconCategoryGrid}>
                    {Object.values(HABIT_ICON_CATEGORIES)[currentIconCategory]?.icons.map(icon => (
                      <TouchableOpacity
                        key={icon}
                        style={[
                          styles.iconOptionCompact,
                          {
                            backgroundColor: formData.icon === icon ? colors.primary + '20' : colors.background,
                            borderColor: formData.icon === icon ? colors.primary : colors.border,
                            borderWidth: formData.icon === icon ? 2 : 1
                          }
                        ]}
                        onPress={() => handleFieldSelect(icon)}
                      >
                        <Text style={styles.iconTextCompact}>{icon}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Стрелка вправо */}
                <TouchableOpacity
                  style={[
                    styles.iconSliderArrow,
                    {
                      backgroundColor: colors.surface,
                      opacity: currentIconCategory === Object.keys(HABIT_ICON_CATEGORIES).length - 1 ? 0.3 : 1
                    }
                  ]}
                  onPress={() => {
                    if (currentIconCategory < Object.keys(HABIT_ICON_CATEGORIES).length - 1) {
                      setCurrentIconCategory(currentIconCategory + 1);
                    }
                  }}
                  disabled={currentIconCategory === Object.keys(HABIT_ICON_CATEGORIES).length - 1}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Индикаторы страниц */}
              <View style={styles.iconSliderIndicators}>
                {Object.keys(HABIT_ICON_CATEGORIES).map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.iconSliderDot,
                      {
                        backgroundColor: index === currentIconCategory
                          ? colors.primary
                          : colors.border
                      }
                    ]}
                    onPress={() => setCurrentIconCategory(index)}
                  />
                ))}
              </View>
            </View>
          )}
          
          {/* Селектор для времени */}
                    {currentField === 'reminder' && (
                      <View style={styles.selectorContent}>
                        <Text style={[styles.selectorTitle, { color: colors.text }]}>
                          Время напоминания
                        </Text>

                        <View style={styles.timePickerContainer}>
                          {/* Часы */}
                          <View style={styles.timePickerColumn}>
                            <Text style={[styles.timePickerLabel, { color: colors.textSecondary }]}>Часы</Text>
                            <View style={styles.timePickerWrapper}>
                              {/* Центральная зона фокуса */}
                              <View style={[styles.timePickerFocusZone, { borderColor: colors.primary }]} />

                              <ScrollView
                                ref={ref => { hoursScrollRef.current = ref; }}
                                style={styles.timePickerScroll}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={40}
                                decelerationRate="fast"
                                onMomentumScrollEnd={(event) => {
                                  const offsetY = event.nativeEvent.contentOffset.y;
                                  // Учитываем верхний отступ в 80px
                                  const index = Math.round(offsetY / 40);
                                  const clampedIndex = Math.max(0, Math.min(23, index));

                                  // Автоматически обновляем время
                                  const minutes = formData.reminderTime.split(':')[1] || '00';
                                  setFormData({
                                    ...formData,
                                    reminderTime: `${clampedIndex.toString().padStart(2, '0')}:${minutes}`
                                  });

                                  // Haptic feedback
                                  if (Platform.OS === 'ios') {
                                    Vibration.vibrate(10);
                                  }
                                }}
                                onScrollEndDrag={(event) => {
                                  // Дополнительное центрирование при отпускании
                                  const offsetY = event.nativeEvent.contentOffset.y;
                                  const index = Math.round(offsetY / 40);
                                  const clampedIndex = Math.max(0, Math.min(23, index));

                                  hoursScrollRef.current?.scrollTo({
                                    y: clampedIndex * 40,
                                    animated: true
                                  });
                                }}
                              >
                                {/* Верхний отступ для центрирования */}
                                <View style={{ height: 80 }} />

                                {Array.from({ length: 24 }, (_, i) => {
                                  const isCenter = parseInt(formData.reminderTime.split(':')[0]) === i;

                                  return (
                                    <View
                                      key={i}
                                      style={[
                                        styles.timePickerItem,
                                        {
                                          backgroundColor: 'transparent',
                                          opacity: isCenter ? 1 : 0.4,
                                          transform: [
                                            { scale: isCenter ? 1.2 : 1 }
                                          ]
                                        }
                                      ]}
                                    >
                                      <Text style={[
                                        styles.timePickerItemText,
                                        {
                                          color: isCenter ? colors.primary : colors.text,
                                          fontWeight: isCenter ? 'bold' : 'normal',
                                          fontSize: isCenter ? 20 : 16
                                        }
                                      ]}>
                                        {i.toString().padStart(2, '0')}
                                      </Text>
                                    </View>
                                  );
                                })}

                                {/* Нижний отступ для центрирования */}
                                <View style={{ height: 80 }} />
                              </ScrollView>
                            </View>
                          </View>

                          <Text style={[styles.timePickerSeparator, { color: colors.text }]}>:</Text>

                          {/* Минуты */}
                          <View style={styles.timePickerColumn}>
                            <Text style={[styles.timePickerLabel, { color: colors.textSecondary }]}>Минуты</Text>
                            <View style={styles.timePickerWrapper}>
                              {/* Центральная зона фокуса */}
                              <View style={[styles.timePickerFocusZone, { borderColor: colors.primary }]} />

                              <ScrollView
                                ref={ref => { minutesScrollRef.current = ref; }}
                                style={styles.timePickerScroll}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={40}
                                decelerationRate="fast"
                                onMomentumScrollEnd={(event) => {
                                  const offsetY = event.nativeEvent.contentOffset.y;
                                  // Учитываем верхний отступ в 80px
                                  const index = Math.round(offsetY / 40);
                                  const minutesArray = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
                                  const clampedIndex = Math.max(0, Math.min(minutesArray.length - 1, index));
                                  const selectedMinute = minutesArray[clampedIndex];

                                  // Автоматически обновляем время
                                  const hours = formData.reminderTime.split(':')[0] || '09';
                                  setFormData({
                                    ...formData,
                                    reminderTime: `${hours}:${selectedMinute.toString().padStart(2, '0')}`
                                  });

                                  // Haptic feedback
                                  if (Platform.OS === 'ios') {
                                    Vibration.vibrate(10);
                                  }
                                }}
                                onScrollEndDrag={(event) => {
                                  // Дополнительное центрирование при отпускании
                                  const offsetY = event.nativeEvent.contentOffset.y;
                                  const index = Math.round(offsetY / 40);
                                  const minutesArray = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
                                  const clampedIndex = Math.max(0, Math.min(minutesArray.length - 1, index));

                                  minutesScrollRef.current?.scrollTo({
                                    y: clampedIndex * 40,
                                    animated: true
                                  });
                                }}
                              >
                                {/* Верхний отступ для центрирования */}
                                <View style={{ height: 80 }} />

                                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(i => {
                                  const isCenter = parseInt(formData.reminderTime.split(':')[1]) === i;

                                  return (
                                    <View
                                      key={i}
                                      style={[
                                        styles.timePickerItem,
                                        {
                                          backgroundColor: 'transparent',
                                          opacity: isCenter ? 1 : 0.4,
                                          transform: [
                                            { scale: isCenter ? 1.2 : 1 }
                                          ]
                                        }
                                      ]}
                                    >
                                      <Text style={[
                                        styles.timePickerItemText,
                                        {
                                          color: isCenter ? colors.primary : colors.text,
                                          fontWeight: isCenter ? 'bold' : 'normal',
                                          fontSize: isCenter ? 20 : 16
                                        }
                                      ]}>
                                        {i.toString().padStart(2, '0')}
                                      </Text>
                                    </View>
                                  );
                                })}

                                {/* Нижний отступ для центрирования */}
                                <View style={{ height: 80 }} />
                              </ScrollView>
                            </View>
                          </View>
                        </View>

                        <Text style={[styles.selectedTimePreview, { color: colors.text }]}>
                          Выбрано: {formData.reminderTime}
                        </Text>

                        <TouchableOpacity
                          style={[styles.selectorButton, { backgroundColor: colors.primary }]}
                          onPress={() => handleFieldSelect(formData.reminderTime)}
                        >
                          <Text style={styles.selectorButtonText}>Готово</Text>
                        </TouchableOpacity>
                      </View>
                    )}
        </Animated.View>
      </View>
    );
  };

const isFormComplete = () => {
    const requiredFields = ['name', 'description', 'category', 'type', 'icon', 'color', 'reminder'];
    
    if (formData.type === 'number') {
      requiredFields.push('details');
    } else if (formData.type === 'weight') {
      requiredFields.push('weightGoal');
      if (formData.weightGoal !== 'maintain') {
        requiredFields.push('details');
      }
    }
    
    // Частота требуется для всех типов
    requiredFields.push('frequency');
    
    // Добавим логирование для отладки
    console.log('Required fields:', requiredFields);
    console.log('Completed fields:', Array.from(completedFields));
    console.log('Form is complete:', requiredFields.every(field => completedFields.has(field)));
    
    return requiredFields.every(field => completedFields.has(field));
  };

  // === ОСНОВНОЙ РЕНДЕР ===
  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Заголовок */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {habit ? 'Редактировать привычку' : 'Новая привычка'}
            </Text>
            <View style={styles.headerRight} />
          </View>
          
          {/* Превью привычки */}
          {renderHabitPreview()}
          
          {/* Текстовый контент */}
          {renderTextContent()}
          
          {/* Кнопки действий */}
          <View style={[styles.actionButtons, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.surface }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Отмена
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.saveButton,
                { 
                  backgroundColor: isFormComplete() ? colors.primary : colors.surface,
                  opacity: isFormComplete() ? 1 : 0.5
                }
              ]}
              onPress={handleSave}
              disabled={!isFormComplete()}
            >
              <Text style={[
                styles.saveButtonText,
                { color: isFormComplete() ? '#ffffff' : colors.textSecondary }
              ]}>
                {habit ? 'Сохранить' : 'Создать привычку'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Селектор полей */}
          {renderFieldSelector()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// === СТИЛИ ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  keyboardView: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  
  closeButton: {
    padding: SPACING.xs,
  },
  
  headerTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
  },
  
  headerRight: {
    width: 32,
  },
  
  // === ПРЕВЬЮ ПРИВЫЧКИ ===
  previewContainer: {
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  previewTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  
  previewCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 2,
  },
  
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  
  previewIcon: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  
  previewInfo: {
    flex: 1,
  },
  
  previewName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: 2,
  },

  previewDescription: {
  ...TYPOGRAPHY.caption,
  marginTop: 2,
  marginBottom: 4,
},
  
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  previewType: {
    ...TYPOGRAPHY.caption,
  },
  
  previewTarget: {
    ...TYPOGRAPHY.caption,
    marginLeft: SPACING.xs,
  },
  
  previewFooter: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  
  previewBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  
  // === ТЕКСТОВЫЙ КОНТЕНТ ===
  textContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  
  textWrapper: {
    paddingVertical: SPACING.md,
  },
  
  textLineWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: 2, // Минимальный отступ между строками
  },
  
  textLine: {
    ...TYPOGRAPHY.body,
    lineHeight: 22, // Уменьшенный межстрочный интервал
  },
  
  fieldWrapper: {
    alignSelf: 'flex-start',
  },
  
  textField: {
    ...TYPOGRAPHY.body,
    lineHeight: 22, // Уменьшенный межстрочный интервал
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  
  textFieldEmpty: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    borderStyle: 'dashed',
    minHeight: 24, // Уменьшенная высота
    minWidth: 100,
  },
  
  textFieldCompleted: {
    fontWeight: '600',
    borderBottomWidth: 2,
  },
  
  // === СЕЛЕКТОР ПОЛЕЙ ===
  selectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  selectorBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  selectorContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: '70%',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  
  selectorContent: {
    padding: SPACING.lg,
  },
  
  selectorTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  
  selectorButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  
  selectorButtonText: {
    ...TYPOGRAPHY.button,
    color: '#ffffff',
    fontWeight: '600',
  },
  
  // Поля ввода
  nameInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.sm,
  },

 // Описание
  descriptionInput: {
  borderWidth: 1,
  borderRadius: BORDER_RADIUS.md,
  paddingHorizontal: SPACING.md,
  paddingVertical: SPACING.md,
  ...TYPOGRAPHY.body,
  marginBottom: SPACING.sm,
  minHeight: 80,
  textAlignVertical: 'top',
},

selectorSubtitle: {
  ...TYPOGRAPHY.caption,
  marginBottom: SPACING.md,
  textAlign: 'center',
},
  
  // Категории
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  
  categoryIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  
  categoryInfo: {
    flex: 1,
  },
  
  categoryName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  
  // Типы привычек
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  
  typeIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  
  typeInfo: {
    flex: 1,
  },
  
  typeName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  typeDescription: {
    ...TYPOGRAPHY.caption,
  },
  
  // Детали
  detailsInputs: {
    gap: SPACING.sm,
  },
  
  valueInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    fontSize: 18,
  },
  
  unitSelector: {
    maxHeight: 100,
    marginVertical: SPACING.sm,
  },
  
  unitOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginRight: SPACING.sm,
  },
  
  unitText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '500',
  },
  
  weightInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body,
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Частота
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  
  frequencyOption: {
    width: 70,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  
  frequencyNumber: {
    ...TYPOGRAPHY.h2,
    fontWeight: 'bold',
  },
  
  frequencyLabel: {
    ...TYPOGRAPHY.caption,
  },
  
  // Цвета
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Новые стили для категорий цветов
  colorCategoriesScroll: {
    maxHeight: 400,
  },

  colorCategory: {
    marginBottom: SPACING.xl,
  },

  colorCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  colorCategoryIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },

  colorCategoryTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },

  colorSliderContent: {
    flex: 1,
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },

  colorCategoryGrid: {
      width: 220,
      alignSelf: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: SPACING.md,
      paddingHorizontal: SPACING.sm,
    },

    colorOptionCompact: {
      width: 60,
      height: 60,
      borderRadius: BORDER_RADIUS.full,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      marginBottom: SPACING.sm,
    },

  // Стили слайдера цветов
  colorSliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },

  colorSliderCategoryTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },

  colorSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    minHeight: 140, // фиксированная высота для стабильности
  },

  colorSliderArrow: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  colorSliderArrow: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  colorSliderContent: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },

  colorSliderIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  colorSliderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Иконки
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  iconText: {
    fontSize: 24,
  },
  
// === НОВЫЕ СТИЛИ ДЛЯ ВЫБОРА ВРЕМЕНИ ===
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginVertical: SPACING.md,
  },
  
  timePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  
  timePickerScroll: {
    height: 160,
    width: 80,
  },
  
  timePickerItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  
  timePickerItemText: {
    fontSize: 18,
  },
  
  timePickerSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: SPACING.md,
  },
  
  selectedTimePreview: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  
  // Цели веса
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  
  goalIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  
  goalInfo: {
    flex: 1,
  },
  
  goalName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  goalDescription: {
    ...TYPOGRAPHY.caption,
  },
  
  // === КНОПКИ ДЕЙСТВИЙ ===
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  cancelButtonText: {
    ...TYPOGRAPHY.button,
    fontWeight: '600',
  },
  
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  saveButtonText: {
    ...TYPOGRAPHY.button,
    fontWeight: 'bold',
  },

   // Стили слайдера иконок
    iconSliderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.lg,
    },

    iconCategoryIcon: {
      fontSize: 16,
      marginRight: SPACING.sm,
    },

    iconSliderCategoryTitle: {
      ...TYPOGRAPHY.h4,
      fontWeight: '600',
    },

    iconSliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.lg,
      minHeight: 200,
    },

    iconSliderArrow: {
      width: 44,
      height: 44,
      borderRadius: BORDER_RADIUS.full,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },

    iconSliderContent: {
      flex: 1,
      marginHorizontal: SPACING.md,
    },

    iconCategoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },

    iconOptionCompact: {
      width: '22%', // 4 в ряду
      aspectRatio: 1,
      borderRadius: BORDER_RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },

    iconTextCompact: {
      fontSize: 24,
    },

    iconSliderIndicators: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: SPACING.sm,
    },

    iconSliderDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

// === СТИЛИ ДЛЯ PICKER'А ВРЕМЕНИ ===
timePickerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  height: 240, // Увеличил с 200 до 240
  marginVertical: SPACING.md,
},

timePickerColumn: {
  flex: 1,
  alignItems: 'center',
},

timePickerLabel: {
  fontSize: 12,
  fontWeight: '600',
  marginBottom: SPACING.sm,
  textTransform: 'uppercase',
},

timePickerWrapper: {
  position: 'relative',
  height: 200, // Увеличил с 160 до 200 (5 элементов * 40px)
  width: 80,
},

timePickerFocusZone: {
  position: 'absolute',
  top: 80, // Остается по центру (200/2 - 40/2 = 80)
  left: 0,
  right: 0,
  height: 40,
  borderWidth: 2,
  borderRadius: BORDER_RADIUS.md,
  backgroundColor: 'transparent',
  zIndex: 1,
  pointerEvents: 'none',
},

timePickerScroll: {
  height: 200, // Увеличил с 160 до 200
  width: 80,
},

timePickerItem: {
  height: 40,
  justifyContent: 'center',
  alignItems: 'center',
  marginVertical: 0,
  borderRadius: BORDER_RADIUS.md,
},

timePickerItemText: {
  fontSize: 18,
},

timePickerSeparator: {
  fontSize: 24,
  fontWeight: 'bold',
  marginHorizontal: SPACING.md,
},

selectedTimePreview: {
  textAlign: 'center',
  fontSize: 16,
  fontWeight: '600',
  marginBottom: SPACING.md,
},

});

export default HabitFormModal;