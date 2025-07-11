// ====================================
// НАСТРОЙКИ И ХРАНИЛИЩЕ
// src/constants/settingsStorage.js
// ====================================

// === СТАТИСТИЧЕСКИЕ ПЕРИОДЫ ===
export const STATS_PERIODS = {
  week: { label: 'Неделя', days: 7 },
  month: { label: 'Месяц', days: 30 },
  quarter: { label: 'Квартал', days: 90 },
  year: { label: 'Год', days: 365 }
};

// === НАСТРОЙКИ УВЕДОМЛЕНИЙ ===
export const NOTIFICATION_TYPES = {
  reminder: {
    label: 'Напоминания',
    description: 'Напоминания о выполнении привычек'
  },
  achievement: {
    label: 'Достижения',
    description: 'Уведомления о новых достижениях'
  },
  streak: {
    label: 'Серии',
    description: 'Предупреждения о потере серий'
  },
  weekly: {
    label: 'Еженедельные',
    description: 'Еженедельные отчеты'
  },
  motivation: {
    label: 'Мотивация',
    description: 'Мотивационные сообщения'
  }
};

// === ЭКСПОРТ/ИМПОРТ ФОРМАТЫ ===
export const EXPORT_FORMATS = {
  json: {
    label: 'JSON',
    extension: '.json',
    description: 'Полные данные для резервного копирования'
  },
  csv: {
    label: 'CSV',
    extension: '.csv',
    description: 'Табличные данные для анализа'
  },
  pdf: {
    label: 'PDF',
    extension: '.pdf',
    description: 'Отчет для печати'
  }
};

// === КОНСТАНТЫ ВАЛИДАЦИИ ===
export const VALIDATION = {
  habitName: {
    minLength: 3,
    maxLength: 50
  },
  habitDescription: {
    maxLength: 200
  },
  streakWarningDays: 2, // Предупреждать за 2 дня до потери серии
  maxHabitsPerUser: 100,
  maxNotesLength: 500
};

// === API ENDPOINTS (для будущего использования) ===
export const API_ENDPOINTS = {
  habits: '/api/habits',
  achievements: '/api/achievements',
  stats: '/api/stats',
  sync: '/api/sync',
  export: '/api/export'
};

// === КЛЮЧИ LOCAL STORAGE ===
export const STORAGE_KEYS = {
  habits: '@habits',
  achievements: '@achievements',
  settings: '@settings',
  theme: '@theme',
  onboarding: '@onboarding_complete',
  lastSync: '@last_sync'
};

// === НАСТРОЙКИ ПО УМОЛЧАНИЮ ===
export const DEFAULT_SETTINGS = {
  theme: 'blue',
  isDarkMode: false,
  notifications: {
    reminder: true,
    achievement: true,
    streak: true,
    weekly: false,
    motivation: true
  },
  reminders: {
    enabled: true,
    defaultTime: '09:00',
    soundEnabled: true,
    vibrationEnabled: true
  },
  privacy: {
    analytics: false,
    crashReporting: true
  },
  display: {
    startWeekOn: 'monday', // или 'sunday'
    dateFormat: 'dd.mm.yyyy',
    timeFormat: '24h'
  }
};