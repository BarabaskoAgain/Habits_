// ====================================
// ПОЛНЫЕ КОНСТАНТЫ С ПОДДЕРЖКОЙ ВЕСА
// src/constants/index.js
// ====================================

// === ЦВЕТОВЫЕ ТЕМЫ ===
export const THEMES = {
  blue: {
    light: {
      primary: '#2196F3',
      primaryDark: '#1976D2',
      secondary: '#03DAC6',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      card: '#FFFFFF',
      text: '#212121',
      textSecondary: '#757575',
      border: '#E0E0E0',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      shadow: 'rgba(0,0,0,0.1)'
    },
    dark: {
      primary: '#64B5F6',
      primaryDark: '#42A5F5',
      secondary: '#80CBC4',
      background: '#121212',
      surface: '#1E1E1E',
      card: '#2D2D2D',
      text: '#FFFFFF',
      textSecondary: '#B0B0B0',
      border: '#404040',
      success: '#66BB6A',
      warning: '#FFA726',
      error: '#EF5350',
      shadow: 'rgba(0,0,0,0.3)'
    }
  },
  purple: {
    light: {
      primary: '#9C27B0',
      primaryDark: '#7B1FA2',
      secondary: '#E91E63',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      card: '#FFFFFF',
      text: '#212121',
      textSecondary: '#757575',
      border: '#E0E0E0',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      shadow: 'rgba(0,0,0,0.1)'
    },
    dark: {
      primary: '#CE93D8',
      primaryDark: '#BA68C8',
      secondary: '#F48FB1',
      background: '#121212',
      surface: '#1E1E1E',
      card: '#2D2D2D',
      text: '#FFFFFF',
      textSecondary: '#B0B0B0',
      border: '#404040',
      success: '#66BB6A',
      warning: '#FFA726',
      error: '#EF5350',
      shadow: 'rgba(0,0,0,0.3)'
    }
  }
};

// === ТИПОГРАФИКА ===
export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  h3: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h4: { fontSize: 20, fontWeight: '500', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  button: { fontSize: 14, fontWeight: '500', lineHeight: 20 }
};

// === ОТСТУПЫ ===
export const SPACING = {
  xs: 4,    // оставить
  sm: 6,    // было 8 → 6
  md: 12,   // было 16 → 12 
  lg: 18,   // было 24 → 18
  xl: 24,   // было 32 → 24
  xxl: 32,  // было 48 → 32
  xxxl: 48  // было 64 → 48
};

// === РАДИУСЫ ===
export const BORDER_RADIUS = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999
};

// === КАТЕГОРИИ ПРИВЫЧЕК ===
export const HABIT_CATEGORIES = {
  health: { 
    label: 'Здоровье', 
    icon: '💊', 
    color: '#4CAF50'
  },
  fitness: { 
    label: 'Фитнес', 
    icon: '💪', 
    color: '#FF5722'
  },
  learning: { 
    label: 'Обучение', 
    icon: '📚', 
    color: '#2196F3'
  },
  productivity: { 
    label: 'Продуктивность', 
    icon: '⚡', 
    color: '#FF9800'
  },
  mindfulness: { 
    label: 'Осознанность', 
    icon: '🧘', 
    color: '#673AB7'
  },
  nutrition: { 
    label: 'Питание', 
    icon: '🥗', 
    color: '#8BC34A'
  }
};

// === ИКОНКИ ПРИВЫЧЕК ===
export const HABIT_ICONS = [
  '💧', '💪', '📚', '🏃', '🧘', '🥗', '🛌', '☀️',
  '🎯', '⚡', '🎨', '🎵', '📝', '💻', '🌱', '🏆',
  '🔥', '⭐', '💎', '🚀', '📖', '🖊️', '💊', '🍎',
  '🌞', '🌙', '⚽', '🏀', '🎸', '📞', '💬', '🙏',
  '🔢', '📊', '📈', '⏱️', '⏰', '🥛', '🥤', '🏋️',
  '⚖️', '📏', '🩺'
];

// === ЦВЕТА ПРИВЫЧЕК ===
export const HABIT_COLORS = [
  '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#8BC34A', '#FF5722', '#673AB7', '#607D8B',
  '#E91E63', '#795548', '#009688', '#3F51B5', '#FFC107'
];

// === ТИПЫ ПРИВЫЧЕК ===
export const HABIT_TYPES = {
  boolean: {
    label: 'Выполнить/Не выполнить',
    description: 'Простая привычка типа "да/нет"',
    icon: '✅',
    examples: ['Выпить воду', 'Сделать зарядку', 'Помедитировать']
  },
  number: {
    label: 'Количественная',
    description: 'Привычка с подсчетом количества',
    icon: '🔢',
    examples: ['10 приседаний', '30 минут чтения', '2 литра воды']
  },
  weight: {
    label: 'Отслеживание веса',
    description: 'Ежедневное взвешивание с целевым весом',
    icon: '⚖️',
    examples: ['Достичь 70 кг', 'Поддерживать 65 кг', 'Набрать до 80 кг']
  }
};

// === ЕДИНИЦЫ ИЗМЕРЕНИЯ ===
export const MEASUREMENT_UNITS = {
  // Время
  minutes: { label: 'минут', shortLabel: 'мин', type: 'duration', icon: '⏱️' },
  hours: { label: 'часов', shortLabel: 'ч', type: 'duration', icon: '🕐' },
  
  // Количество
  times: { label: 'раз', shortLabel: 'раз', type: 'count', icon: '🔢' },
  pieces: { label: 'штук', shortLabel: 'шт', type: 'count', icon: '📊' },
  pages: { label: 'страниц', shortLabel: 'стр', type: 'count', icon: '📖' },
  exercises: { label: 'упражнений', shortLabel: 'упр', type: 'count', icon: '💪' },
  games: { label: 'игр', shortLabel: 'игр', type: 'count', icon: '🎮' },
  sets: { label: 'подходов', shortLabel: 'под', type: 'count', icon: '🏋️' },
  
  // Объем
  liters: { label: 'литров', shortLabel: 'л', type: 'volume', icon: '🥤' },
  glasses: { label: 'стаканов', shortLabel: 'ст', type: 'volume', icon: '🥛' },
  
  // Расстояние
  kilometers: { label: 'километров', shortLabel: 'км', type: 'distance', icon: '🛣️' },
  steps: { label: 'шагов', shortLabel: 'шаг', type: 'distance', icon: '👣' },
  
  // Вес
  kg: { label: 'килограммов', shortLabel: 'кг', type: 'weight', icon: '⚖️' },
  lbs: { label: 'фунтов', shortLabel: 'фунт', type: 'weight', icon: '⚖️' }
};

// === КЛЮЧИ ХРАНИЛИЩА ===
export const STORAGE_KEYS = {
  habits: '@habits',
  archivedHabits: '@archivedHabits', // ← ДОБАВИТЬ ТОЛЬКО ЭТО
  achievements: '@achievements',
  settings: '@settings',
  onboarding: '@onboarding_complete'
};

// === НАСТРОЙКИ ПО УМОЛЧАНИЮ ===
export const DEFAULT_SETTINGS = {
  theme: 'blue',
  isDarkMode: false,
  notifications: {
    reminder: true,
    achievement: true,
    streak: true
  },
  buttonAnimation: {
    enabled: true,
    color: 'primary',
    speed: 1
  },
  weight: {
    unit: 'kg', // kg или lbs
    showBMI: false,
    reminderTime: '20:00' // вечернее взвешивание
  }
};

// === ДОСТИЖЕНИЯ ===
export const DEFAULT_ACHIEVEMENTS = [
  {
    id: 'first_habit',
    name: 'Первый шаг',
    description: 'Создайте свою первую привычку',
    icon: '🌱',
    type: 'special',
    rarity: 'common',
    requirement: 1
  },
  {
    id: 'streak_7',
    name: 'Неделя силы',
    description: 'Выполните любую привычку 7 дней подряд',
    icon: '🔥',
    type: 'streak',
    rarity: 'common',
    requirement: 7
  },
  {
    id: 'streak_30',
    name: 'Месячный марафон',
    description: 'Выполните любую привычку 30 дней подряд',
    icon: '🌟',
    type: 'streak',
    rarity: 'rare',
    requirement: 30
  },
  {
    id: 'completion_50',
    name: 'Полсотни',
    description: 'Выполните привычки 50 раз',
    icon: '⭐',
    type: 'completion',
    rarity: 'common',
    requirement: 50
  },
  {
    id: 'quantity_1000',
    name: 'Тысячник',
    description: 'Наберите 1000 единиц в количественных привычках',
    icon: '📊',
    type: 'quantity',
    rarity: 'rare',
    requirement: 1000
  },
  {
    id: 'weight_tracker',
    name: 'Весовой контроль',
    description: 'Отслеживайте вес 7 дней подряд',
    icon: '⚖️',
    type: 'weight_tracking',
    rarity: 'common',
    requirement: 7
  },
  {
    id: 'weight_goal',
    name: 'Цель достигнута',
    description: 'Достигните целевого веса',
    icon: '🎯',
    type: 'weight_goal',
    rarity: 'rare',
    requirement: 1
  }
];

// === УТИЛИТЫ ДЛЯ ВЕСА ===
export const WEIGHT_UTILS = {
  // Валидация веса
  validateWeight: (weight, unit = 'kg') => {
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight <= 0) {
      return 'Вес должен быть положительным числом';
    }
    
    if (unit === 'kg') {
      if (numWeight < 20 || numWeight > 300) {
        return 'Вес должен быть от 20 до 300 кг';
      }
    } else if (unit === 'lbs') {
      if (numWeight < 44 || numWeight > 660) {
        return 'Вес должен быть от 44 до 660 фунтов';
      }
    }
    
    return null;
  },
  
  // Конвертация между единицами
  convertWeight: (weight, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return weight;
    
    if (fromUnit === 'kg' && toUnit === 'lbs') {
      return Math.round(weight * 2.20462 * 10) / 10;
    } else if (fromUnit === 'lbs' && toUnit === 'kg') {
      return Math.round(weight / 2.20462 * 10) / 10;
    }
    
    return weight;
  },
  
  // Получить статус относительно цели
  getWeightStatus: (currentWeight, targetWeight, tolerance = 1) => {
    const diff = Math.abs(currentWeight - targetWeight);
    
    if (diff <= tolerance) {
      return { status: 'on_target', message: 'В пределах цели', color: '#4CAF50' };
    } else if (currentWeight > targetWeight) {
      return { status: 'above_target', message: `+${diff.toFixed(1)} кг от цели`, color: '#FF9800' };
    } else {
      return { status: 'below_target', message: `-${diff.toFixed(1)} кг от цели`, color: '#2196F3' };
    }
  },
  
  // Рассчитать средний вес за период
  calculateAverageWeight: (weightData, days = 7) => {
    if (!weightData || weightData.length === 0) return null;
    
    const recentWeights = weightData
      .slice(-days)
      .map(entry => entry.weight)
      .filter(weight => weight > 0);
    
    if (recentWeights.length === 0) return null;
    
    const sum = recentWeights.reduce((acc, weight) => acc + weight, 0);
    return Math.round(sum / recentWeights.length * 10) / 10;
  },
  
  // Рассчитать тренд (набор/потеря)
  calculateWeightTrend: (weightData, days = 14) => {
    if (!weightData || weightData.length < 2) return null;
    
    const recentWeights = weightData.slice(-days);
    if (recentWeights.length < 2) return null;
    
    const firstWeight = recentWeights[0].weight;
    const lastWeight = recentWeights[recentWeights.length - 1].weight;
    const change = lastWeight - firstWeight;
    
    return {
      change: Math.round(change * 10) / 10,
      trend: change > 0.1 ? 'gain' : change < -0.1 ? 'loss' : 'stable',
      period: recentWeights.length
    };
  }
};



export default {
  THEMES,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  HABIT_CATEGORIES,
  HABIT_ICONS,
  HABIT_COLORS,
  HABIT_TYPES,
  MEASUREMENT_UNITS,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_ACHIEVEMENTS,
  WEIGHT_UTILS
};