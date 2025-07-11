// ====================================
// ДЕМО ДАННЫЕ
// src/constants/demoData.js
// ====================================

// Простая функция генерации ID для избежания циклической зависимости
const generateSimpleId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// === ГЕНЕРАТОР РЕАЛИСТИЧНЫХ ВЫПОЛНЕНИЙ ДЛЯ БУЛЕВЫХ ПРИВЫЧЕК ===
export const generateRealisticCompletions = (days = 30, successRate = 0.8) => {
  try {
    const completions = {};
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Увеличиваем вероятность выполнения в начале недели
      const dayOfWeek = new Date(date).getDay();
      let adjustedSuccessRate = successRate;
     
      if (dayOfWeek === 1 || dayOfWeek === 2) { // Понедельник, вторник
        adjustedSuccessRate *= 1.1;
      } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Выходные
        adjustedSuccessRate *= 0.8;
      }
      
      // Добавляем небольшие "провалы" каждые 7-10 дней для реалистичности
      if (i > 0 && i % 8 === 0) {
        adjustedSuccessRate *= 0.3;
      }
      
      if (Math.random() < adjustedSuccessRate) {
        completions[date] = true;
      }
    }
    
    return completions;
  } catch (error) {
    console.error('Ошибка генерации выполнений:', error);
    return {};
  }
};

// === ГЕНЕРАТОР КОЛИЧЕСТВЕННЫХ ВЫПОЛНЕНИЙ ===
export const generateQuantitativeCompletions = (days = 30, targetValue = 10, successRate = 0.75, variability = 0.3) => {
  try {
    const completions = {};
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Определяем базовую вероятность активности
      const dayOfWeek = new Date(date).getDay();
      let activityRate = successRate;
      
      if (dayOfWeek === 1 || dayOfWeek === 2) { // Понедельник, вторник
        activityRate *= 1.15;
      } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Выходные
        activityRate *= 0.85;
      }
      
      // Добавляем "плохие" дни
      if (i > 0 && i % 9 === 0) {
        activityRate *= 0.2;
      }
      
      // Решаем, была ли активность в этот день
      if (Math.random() < activityRate) {
        // Генерируем количество с вариативностью
        const variation = (Math.random() - 0.5) * 2 * variability;
        let value = Math.round(targetValue * (1 + variation));
        
        // Иногда добавляем "отличные" дни с перевыполнением
        if (Math.random() < 0.1) {
          value = Math.round(targetValue * (1.5 + Math.random() * 0.5));
        }
        
        // Минимальное значение = 1
        value = Math.max(1, value);
        
        // Простая структура выполнения
        const hours = Math.floor(Math.random() * 14) + 9;
        const minutes = Math.floor(Math.random() * 60);
        
        completions[date] = {
          value: value,
          targetValue: targetValue,
          unit: 'times',
          completed: value >= targetValue,
          isGoalMet: value >= targetValue,
          completedAt: `${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`
        };
      }
    }
    
    return completions;
  } catch (error) {
    console.error('Ошибка генерации количественных выполнений:', error);
    return {};
  }
};

// === ДЕМО-ПРИВЫЧКИ ===
export const DEMO_HABITS = [
  // === 1 БУЛЕВАЯ ПРИВЫЧКА ===
  {
    id: 'demo_water',
    name: "Выпить стакан воды утром",
    description: "Начать день с гидратации организма",
    icon: "💧",
    color: "#2196F3",
    category: "health",
    type: "boolean",
    targetDaysPerWeek: 7,
    reminderTime: "07:30",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    completions: generateRealisticCompletions(30, 0.9),
    archived: false
  },

  // === 1 КОЛИЧЕСТВЕННАЯ ПРИВЫЧКА (отжимания) ===
  {
    id: 'demo_pushups',
    name: "Отжимания",
    description: "Ежедневные отжимания для поддержания формы",
    icon: "💪",
    color: "#FF5722",
    category: "fitness",
    type: "number",
    targetValue: 20,
    unit: "times",
    allowOverachievement: true,
    targetDaysPerWeek: 6,
    reminderTime: "07:30",
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    completions: generateQuantitativeCompletions(35, 20, 0.8, 0.4),
    archived: false
  },

  // === 1 КОЛИЧЕСТВЕННАЯ ПРИВЫЧКА (чтение) ===
  {
    id: 'demo_reading',
    name: "Чтение книг",
    description: "Ежедневное чтение для саморазвития",
    icon: "📚",
    color: "#4CAF50",
    category: "learning",
    type: "number",
    targetValue: 30,
    unit: "minutes",
    allowOverachievement: true,
    targetDaysPerWeek: 7,
    reminderTime: "21:00",
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    completions: generateQuantitativeCompletions(40, 30, 0.75, 0.5),
    archived: false
  }
];

// === ГЕНЕРАТОР ПЕРВОГО ЗАПУСКА ===
export const generateOnboardingHabits = () => {
  return [
    {
      id: generateSimpleId(),
      name: "Выпить стакан воды",
      description: "Простая привычка для начала",
      icon: "💧",
      color: "#2196F3",
      category: "health",
      type: "boolean",
      targetDaysPerWeek: 7,
      reminderTime: "09:00",
      createdAt: new Date().toISOString(),
      completions: {},
      archived: false
    },
    {
      id: generateSimpleId(),
      name: "10 отжиманий",
      description: "Укрепление мышц",
      icon: "💪",
      color: "#FF5722",
      category: "fitness",
      type: "number",
      targetValue: 10,
      unit: "times",
      allowOverachievement: true,
      targetDaysPerWeek: 5,
      reminderTime: "07:30",
      createdAt: new Date().toISOString(),
      completions: {},
      archived: false
    }
  ];
};

export default {
  DEMO_HABITS,
  generateRealisticCompletions,
  generateQuantitativeCompletions,
  generateOnboardingHabits
};