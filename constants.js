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
  // Здоровье и фитнес
  physical_activity: {
    label: 'Физическая активность',
    icon: '🏃',
    color: '#FF5722',
    description: 'Спорт, зарядка, прогулки'
  },
  nutrition: {
    label: 'Питание',
    icon: '🥗',
    color: '#8BC34A',
    description: 'Здоровое питание, диета'
  },
  hydration: {
    label: 'Гидратация',
    icon: '💧',
    color: '#2196F3',
    description: 'Питьевой режим, вода'
  },
  sleep: {
    label: 'Сон',
    icon: '😴',
    color: '#673AB7',
    description: 'Режим сна, отдых'
  },
  mental_health: {
    label: 'Ментальное здоровье',
    icon: '🧘',
    color: '#9C27B0',
    description: 'Медитация, релаксация'
  },

  // Личностный рост
  learning: {
    label: 'Обучение',
    icon: '📖',
    color: '#2196F3',
    description: 'Чтение, курсы, развитие'
  },
  goals: {
    label: 'Цели',
    icon: '🎯',
    color: '#FF9800',
    description: 'Достижения, планы'
  },
  creativity: {
    label: 'Креативность',
    icon: '🧠',
    color: '#E91E63',
    description: 'Творчество, идеи'
  },
  reflection: {
    label: 'Рефлексия',
    icon: '💭',
    color: '#607D8B',
    description: 'Дневник, анализ дня'
  },
  hobby: {
    label: 'Хобби',
    icon: '🎨',
    color: '#795548',
    description: 'Увлечения, творчество'
  },

  // Продуктивность
  work: {
    label: 'Работа',
    icon: '💻',
    color: '#424242',
    description: 'Задачи, проекты, карьера'
  },
  digital_wellness: {
    label: 'Цифровое благополучие',
    icon: '📱',
    color: '#FF5722',
    description: 'Экранное время, соцсети'
  },
  time_management: {
    label: 'Тайм-менеджмент',
    icon: '⏰',
    color: '#FF9800',
    description: 'Управление временем'
  },
  planning: {
    label: 'Планирование',
    icon: '📋',
    color: '#2196F3',
    description: 'Организация, списки дел'
  },
  focus: {
    label: 'Фокус',
    icon: '🔍',
    color: '#9C27B0',
    description: 'Концентрация, внимание'
  },

  // Социальные связи
  family: {
    label: 'Семья',
    icon: '👨‍👩‍👧‍👦',
    color: '#E91E63',
    description: 'Время с близкими'
  },
  friends: {
    label: 'Друзья',
    icon: '👯',
    color: '#FF9800',
    description: 'Общение, встречи'
  },
  networking: {
    label: 'Нетворкинг',
    icon: '🤝',
    color: '#2196F3',
    description: 'Новые знакомства'
  },
  communication: {
    label: 'Общение',
    icon: '💌',
    color: '#673AB7',
    description: 'Звонки, переписка'
  },
  care_for_others: {
    label: 'Забота о других',
    icon: '🎁',
    color: '#4CAF50',
    description: 'Помощь, поддержка'
  },

  // Образ жизни
  household: {
    label: 'Быт',
    icon: '🏠',
    color: '#795548',
    description: 'Уборка, порядок в доме'
  },
  finances: {
    label: 'Финансы',
    icon: '💰',
    color: '#4CAF50',
    description: 'Бюджет, накопления'
  },
  ecology: {
    label: 'Экология',
    icon: '🌱',
    color: '#8BC34A',
    description: 'Экологичный образ жизни'
  },
  spirituality: {
    label: 'Духовность',
    icon: '🙏',
    color: '#9C27B0',
    description: 'Практики, саморазвитие'
  },
  self_care: {
    label: 'Самоуход',
    icon: '💆',
    color: '#E91E63',
    description: 'Красота, уход за собой'
  }
};

// === ТИПЫ КАТЕГОРИЙ ПРИВЫЧЕК ===
export const HABIT_CATEGORY_TYPES = {
  health_fitness: {
    label: 'Здоровье и фитнес',
    icon: '💪',
    categories: ['physical_activity', 'nutrition', 'hydration', 'sleep', 'mental_health']
  },
  personal_growth: {
    label: 'Личностный рост',
    icon: '📚',
    categories: ['learning', 'goals', 'creativity', 'reflection', 'hobby']
  },
  productivity: {
    label: 'Продуктивность',
    icon: '⚡',
    categories: ['work', 'digital_wellness', 'time_management', 'planning', 'focus']
  },
  social_connections: {
    label: 'Социальные связи',
    icon: '👥',
    categories: ['family', 'friends', 'networking', 'communication', 'care_for_others']
  },
  lifestyle: {
    label: 'Образ жизни',
    icon: '✨',
    categories: ['household', 'finances', 'ecology', 'spirituality', 'self_care']
  }
};

// === ИКОНКИ ПРИВЫЧЕК ПО КАТЕГОРИЯМ ===
export const HABIT_ICON_CATEGORIES = {
  health: {
    label: 'Здоровье',
    icon: '💪',
    icons: [
      '🏃', '🚶', '🏋️', '🤸',
      '🦵', '🧘', '💧', '🥗',
      '😴', '💊', '🚫', '🩺',
      '🍎', '🥛', '⚖️', '🫁',
      '🦷', '👁️', '🛌', '🔥'
    ]
  },
  brain: {
    label: 'Развитие мозга',
    icon: '🧠',
    icons: [
      '📚', '🧩', '♟️', '💻',
      '🎥', '🧘', '✍️', '🎓',
      '🌐', '🗣️', '🧠', '📖',
      '🔍', '💡', '📝', '⚡',
      '🎯', '📊', '🔢', '🗂️'
    ]
  },
  work: {
    label: 'Работа',
    icon: '💻',
    icons: [
      '💼', '📋', '⏰', '📞',
      '📧', '💬', '🎯', '📈',
      '💡', '🔧', '📊', '💰',
      '⚡', '🧠', '📌', '⏱️',
      '🎓', '🌐', '🗃️', '📱'
    ]
  },
  hobby: {
    label: 'Хобби',
    icon: '🎨',
    icons: [
      '🎨', '🎵', '📷', '✂️',
      '💃', '🚴', '🎮', '🧵',
      '🎭', '🎪', '🎲', '🎸',
      '🎬', '🎤', '🎹', '🥁',
      '🏓', '🎳', '🎯', '🌸'
    ]
  },
  lifestyle: {
    label: 'Быт',
    icon: '🏠',
    icons: [
      '🧹', '🍳', '🛒', '📦',
      '🧺', '☕', '🌱', '💳',
      '🔧', '📋', '🗂️', '📞',
      '🏠', '🛏️', '🚿', '🧼',
      '💡', '🔒', '📅', '♻️'
    ]
  },
  goals: {
    label: 'Цели',
    icon: '🏆',
    icons: [
      '🎯', '📅', '✅', '📋',
      '💪', '⏰', '🔥', '⭐',
      '💰', '📈', '🎓', '💼',
      '❤️', '👥', '🤝', '💬',
      '🧭', '🚀', '🌟', '✨'
    ]
  }
};

// === ВСЕ ИКОНКИ ПРИВЫЧЕК (ПОЛНЫЙ ОБНОВЛЕННЫЙ СПИСОК) ===
export const HABIT_ICONS = [
  // Здоровье
  '🏃', '🚶', '🏋️', '🤸', '🦵', '🧘', '💧', '🥗',
  '😴', '💊', '🚫', '🩺', '🍎', '🥛', '⚖️', '🫁',
  '🦷', '👁️', '🛌', '🔥',
  // Развитие мозга
  '📚', '🧩', '♟️', '💻', '🎥', '🧘', '✍️', '🎓',
  '🌐', '🗣️', '🧠', '📖', '🔍', '💡', '📝', '⚡',
  '🎯', '📊', '🔢', '🗂️',
  // Работа
  '💼', '📋', '⏰', '📞', '📧', '💬', '🎯', '📈',
  '💡', '🔧', '📊', '💰', '⚡', '🧠', '📌', '⏱️',
  '🎓', '🌐', '🗃️', '📱',
  // Хобби
  '🎨', '🎵', '📷', '✂️', '💃', '🚴', '🎮', '🧵',
  '🎭', '🎪', '🎲', '🎸', '🎬', '🎤', '🎹', '🥁',
  '🏓', '🎳', '🎯', '🌸',
  // Быт
  '🧹', '🍳', '🛒', '📦', '🧺', '☕', '🌱', '💳',
  '🔧', '📋', '🗂️', '📞', '🏠', '🛏️', '🚿', '🧼',
  '💡', '🔒', '📅', '♻️',
  // Цели
  '🎯', '📅', '✅', '📋', '💪', '⏰', '🔥', '⭐',
  '💰', '📈', '🎓', '💼', '❤️', '👥', '🤝', '💬',
  '🧭', '🚀', '🌟', '✨'
];

// === ЦВЕТА ПРИВЫЧЕК ===
export const HABIT_COLORS = [
  // Популярные
  '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#E91E63', '#FF5722', '#673AB7', '#FFC107',
  // Пастельные
  '#FF6B9D', '#95E1D3', '#F3D250', '#A8E6CF', '#FFB3BA',
  '#C7CEEA', '#FFDAB9', '#B39DDB', '#81C784', '#FFD54F',
  // Яркие
  '#FF1744', '#D500F9', '#651FFF', '#3D5AFE', '#2979FF',
  '#00B0FF', '#00E5FF', '#1DE9B6', '#00E676', '#76FF03',
  // Природные
  '#8D6E63', '#689F38', '#F57C00', '#5D4037', '#795548',
  '#558B2F', '#FF8F00', '#6D4C41', '#827717', '#E65100',
  // Нейтральные
  '#37474F', '#455A64', '#546E7A', '#607D8B', '#78909C',
  '#90A4AE', '#B0BEC5', '#CFD8DC', '#ECEFF1', '#263238',
  // Энергичные
  '#C6FF00', '#FFEA00', '#FFC400', '#FF9100', '#FF3D00',
  '#FF4081', '#AB47BC', '#7E57C2', '#5C6BC0', '#42A5F5'
];

// === ЦВЕТА ПРИВЫЧЕК ПО КАТЕГОРИЯМ ===
export const HABIT_COLOR_CATEGORIES = {
  popular: {
    label: 'Популярные',
    icon: '⭐',
    colors: [
      '#2196F3', '#4CAF50', '#FF9800',
      '#9C27B0', '#F44336', '#00BCD4',
      '#E91E63', '#FF5722', '#673AB7'
    ]
  },
  pastel: {
    label: 'Пастельные',
    icon: '🌸',
    colors: [
      '#FF6B9D', '#95E1D3', '#F3D250',
      '#A8E6CF', '#FFB3BA', '#C7CEEA',
      '#B39DDB', '#81C784', '#FFD54F'
    ]
  },
  bright: {
    label: 'Яркие',
    icon: '⚡',
    colors: [
      '#FF1744', '#D500F9', '#651FFF',
      '#3D5AFE', '#2979FF', '#00B0FF',
      '#1DE9B6', '#00E676', '#76FF03'
    ]
  },
  nature: {
    label: 'Природные',
    icon: '🌿',
    colors: [
      '#8D6E63', '#689F38', '#F57C00',
      '#5D4037', '#795548', '#558B2F',
      '#FF8F00', '#827717', '#E65100'
    ]
  },
  neutral: {
    label: 'Нейтральные',
    icon: '🎨',
    colors: [
      '#37474F', '#455A64', '#546E7A',
      '#607D8B', '#78909C', '#90A4AE',
      '#B0BEC5', '#CFD8DC', '#263238'
    ]
  },
  vibrant: {
    label: 'Энергичные',
    icon: '🔥',
    colors: [
      '#C6FF00', '#FFEA00', '#FFC400',
      '#FF9100', '#FF3D00', '#FF4081',
      '#AB47BC', '#7E57C2', '#5C6BC0'
    ]
  }
};

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
  },
  developer: {
    showBuildInfo: false // Показывать дату и время последнего обновления
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