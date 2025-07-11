// ====================================
// УТИЛИТЫ С ПОДДЕРЖКОЙ ВЕСА
// src/constants/utils.js
// ====================================

export const MOTIVATIONAL_QUOTES = [
  {
    text: "Мы есть то, что мы постоянно делаем. Совершенство — не действие, а привычка.",
    author: "Аристотель"
  },
  {
    text: "Путь в тысячу миль начинается с одного шага.",
    author: "Лао-цзы"
  },
  {
    text: "Успех — это сумма небольших усилий, повторяемых изо дня в день.",
    author: "Роберт Кольер"
  },
  {
    text: "Дисциплина — это мост между целью и достижением.",
    author: "Джим Рон"
  },
  {
    text: "Не ждите. Время никогда не будет подходящим.",
    author: "Наполеон Хилл"
  }
];

// === УТИЛИТЫ ДЛЯ ГЕНЕРАЦИИ ID ===
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// === УТИЛИТЫ ДЛЯ ДАТ ===
export const dateUtils = {
  today: () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // JavaScript месяцы 0-11, поэтому +1
      const day = now.getDate();
      
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch (error) {
      console.error('Ошибка получения сегодняшней даты:', error);
      return '2024-01-01';
    }
    
  },

  formatDateLocal: (date) => {
  try {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } catch (error) {
    console.error('Ошибка форматирования локальной даты:', error);
    return dateUtils.today();
  }
},
  
  formatDate: (date, locale = 'ru-RU') => {
    try {
      return new Date(date).toLocaleDateString(locale);
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return '';
    }
  },
  
  getWeekStart: (date = new Date()) => {
    try {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
d.setDate(diff);
return dateUtils.formatDateLocal(d);
    } catch (error) {
      console.error('Ошибка получения начала недели:', error);
      return dateUtils.today();
    }
  },
  
  getDaysInMonth: (year, month) => {
    try {
      return new Date(year, month + 1, 0).getDate();
    } catch (error) {
      console.error('Ошибка получения дней в месяце:', error);
      return 30;
    }
  },
  
  isToday: (dateString) => {
    try {
      return dateString === dateUtils.today();
    } catch (error) {
      console.error('Ошибка проверки даты:', error);
      return false;
    }
  },
  
  daysBetween: (date1, date2) => {
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Ошибка вычисления разности дат:', error);
      return 0;
    }
  },
  
  getWeekDays: (weekStartString) => {
    try {
      const weekStart = new Date(weekStartString);
      const days = [];
      const today = dateUtils.today();
      
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
const dateString = dateUtils.formatDateLocal(day);
        
        days.push({
          date: dateString,
          dayName: day.toLocaleDateString('ru-RU', { weekday: 'short' }),
          dayOfMonth: day.getDate(),
          isToday: dateString === today,
          isPast: dateString < today,
          isFuture: dateString > today
        });
      }
      
      return days;
    } catch (error) {
      console.error('Ошибка получения дней недели:', error);
      return [];
    }
  },
  
  getCurrentWeekStart: () => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
return dateUtils.formatDateLocal(monday);
    } catch (error) {
      console.error('Ошибка получения текущего начала недели:', error);
      return dateUtils.today();
    }
  },
  
  getDateRange: (startDate, endDate) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates = [];
      
      const currentDate = new Date(start);
      while (currentDate <= end) {
dates.push(dateUtils.formatDateLocal(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return dates;
    } catch (error) {
      console.error('Ошибка получения диапазона дат:', error);
      return [];
    }
  },

  getWeekLabel: (weekStartString) => {
    try {
      const weekStart = new Date(weekStartString);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startMonth = weekStart.toLocaleDateString('ru-RU', { month: 'short' });
      const endMonth = weekEnd.toLocaleDateString('ru-RU', { month: 'short' });
      
      if (startMonth === endMonth) {
        return `${weekStart.getDate()}-${weekEnd.getDate()} ${startMonth}`;
      } else {
        return `${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth}`;
      }
    } catch (error) {
      console.error('Ошибка получения метки недели:', error);
      return '';
    }
  },

   formatDateRange: (startDate, endDate, locale = 'ru-RU') => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const startDay = start.getDate();
      const startMonth = start.toLocaleDateString(locale, { month: 'long' });
      const startYear = start.getFullYear();

      const endDay = end.getDate();
      const endMonth = end.toLocaleDateString(locale, { month: 'long' });
      const endYear = end.getFullYear();

      if (startYear === endYear) {
        if (startMonth === endMonth) {
          // Один месяц
          return `${startDay}–${endDay} ${endMonth} ${endYear}`;
        } else {
          // Разные месяцы, но год один
          return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
        }
      } else {
        // Разные года
        return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
      }
    } catch (error) {
      console.error('Ошибка форматирования диапазона дат:', error);
      return '';
    }
  }
};

// === УТИЛИТЫ ДЛЯ СТАТИСТИКИ ===
export const statsUtils = {
  getStreak: (habit) => {
    try {
      if (!habit || !habit.completions) return 0;
      
      const today = dateUtils.today();
      const todayDate = new Date(today);
      let streak = 0;
      
      // Проверяем последовательность начиная с сегодня
      for (let i = 0; i >= -365; i--) {
        const checkDate = new Date(todayDate);
        checkDate.setDate(todayDate.getDate() + i);
const dateString = dateUtils.formatDateLocal(checkDate);
        
        const completion = habit.completions[dateString];
        let isCompleted = false;
        
        if (habit.type === 'boolean') {
          isCompleted = completion === true;
        } else if (habit.type === 'weight') {
          isCompleted = completion && typeof completion === 'object' && completion.weight > 0;
        } else if (habit.type === 'number') {
          isCompleted = completion && completion.completed === true;
        }
        
        if (isCompleted) {
          streak++;
        } else {
          break;
        }
      }
      
      return streak;
    } catch (error) {
      console.error('Ошибка вычисления серии:', error);
      return 0;
    }
  },
  
  getCompletionRate: (habit, startDate, endDate) => {
    try {
      if (!habit || !habit.completions) return 0;
      
      const dates = dateUtils.getDateRange(startDate, endDate);
      let completedDays = 0;
      
      dates.forEach(date => {
        const completion = habit.completions[date];
        let isCompleted = false;
        
        if (habit.type === 'boolean') {
          isCompleted = completion === true;
        } else if (habit.type === 'weight') {
          isCompleted = completion && typeof completion === 'object' && completion.weight > 0;
        } else if (habit.type === 'number') {
          isCompleted = completion && completion.completed === true;
        }
        
        if (isCompleted) {
          completedDays++;
        }
      });
      
      return dates.length > 0 ? Math.round((completedDays / dates.length) * 100) : 0;
    } catch (error) {
      console.error('Ошибка вычисления процента выполнения:', error);
      return 0;
    }
  },
  
  getTotalCompletions: (habit) => {
    try {
      if (!habit || !habit.completions) return 0;
      
      return Object.values(habit.completions).reduce((total, completion) => {
        if (habit.type === 'boolean') {
          return total + (completion === true ? 1 : 0);
        } else if (habit.type === 'weight') {
          return total + ((completion && typeof completion === 'object' && completion.weight > 0) ? 1 : 0);
        } else if (habit.type === 'number') {
          return total + (completion?.value || 0);
        }
        return total;
      }, 0);
    } catch (error) {
      console.error('Ошибка подсчета общих выполнений:', error);
      return 0;
    }
  },
  
  getBestStreak: (habit) => {
    try {
      if (!habit || !habit.completions) return 0;
      
      const sortedDates = Object.keys(habit.completions).sort();
      let bestStreak = 0;
      let currentStreak = 0;
      
      sortedDates.forEach(date => {
        const completion = habit.completions[date];
        let isCompleted = false;
        
        if (habit.type === 'boolean') {
          isCompleted = completion === true;
        } else if (habit.type === 'weight') {
          isCompleted = completion && typeof completion === 'object' && completion.weight > 0;
        } else if (habit.type === 'number') {
          isCompleted = completion && completion.completed === true;
        }
        
        if (isCompleted) {
          currentStreak++;
          bestStreak = Math.max(bestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });
      
      return bestStreak;
    } catch (error) {
      console.error('Ошибка поиска лучшей серии:', error);
      return 0;
    }
  },
  
  getAverageValue: (habit, startDate, endDate) => {
    try {
      if (!habit || !habit.completions || habit.type !== 'number') return 0;
      
      const dates = dateUtils.getDateRange(startDate, endDate);
      let totalValue = 0;
      let completedDays = 0;
      
      dates.forEach(date => {
        const completion = habit.completions[date];
        if (completion && completion.value > 0) {
          totalValue += completion.value;
          completedDays++;
        }
      });
      
      return completedDays > 0 ? Math.round((totalValue / completedDays) * 100) / 100 : 0;
    } catch (error) {
      console.error('Ошибка вычисления среднего значения:', error);
      return 0;
    }
  }
};

// === УТИЛИТЫ ДЛЯ ВЕСА ===
export const weightUtils = {
  calculateTrend: (habit, days = 30) => {
    try {
      if (!habit || !habit.completions || habit.type !== 'weight') return null;
      
      const today = dateUtils.today();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days);
      
      const weights = [];
      
      for (let i = 0; i < days; i++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(startDate.getDate() + i);
        const dateString = checkDate.toISOString().split('T')[0];
        
        const completion = habit.completions[dateString];
        if (completion && typeof completion === 'object' && completion.weight > 0) {
          weights.push({
            date: dateString,
            weight: completion.weight
          });
        }
      }
      
      if (weights.length < 2) return null;
      
      const firstWeight = weights[0].weight;
      const lastWeight = weights[weights.length - 1].weight;
      const change = lastWeight - firstWeight;
      
      return {
        change,
        changePercent: (change / firstWeight) * 100,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        firstWeight,
        lastWeight,
        dataPoints: weights.length
      };
    } catch (error) {
      console.error('Ошибка вычисления тренда веса:', error);
      return null;
    }
  },
  
  getWeeklyAverage: (habit, weekStartDate) => {
    try {
      if (!habit || !habit.completions || habit.type !== 'weight') return null;
      
      const weekStart = new Date(weekStartDate);
      const weekData = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        const completion = habit.completions[dateString];
        if (completion && typeof completion === 'object' && completion.weight > 0) {
          weekData.push(completion.weight);
        }
      }
      
      if (weekData.length === 0) return null;
      
      const average = weekData.reduce((sum, weight) => sum + weight, 0) / weekData.length;
      
      return {
        average: Math.round(average * 10) / 10,
        entries: weekData.length,
        minWeight: Math.min(...weekData),
        maxWeight: Math.max(...weekData)
      };
    } catch (error) {
      console.error('Ошибка получения недельной статистики веса:', error);
      return null;
    }
  },
  
  getMonthlyStatistics: (habit, month, year) => {
    try {
      if (!habit || !habit.completions || habit.type !== 'weight') return null;
      
      const daysInMonth = dateUtils.getDaysInMonth(year, month);
      const monthData = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day).toISOString().split('T')[0];
        const completion = habit.completions[date];
        
        if (completion && typeof completion === 'object' && completion.weight > 0) {
          monthData.push({
            date,
            weight: completion.weight,
            day
          });
        }
      }
      
      if (monthData.length === 0) return null;
      
      const weights = monthData.map(d => d.weight);
      const average = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
      
      return {
        average: Math.round(average * 10) / 10,
        entries: monthData.length,
        minWeight: Math.min(...monthData.map(d => d.weight)),
        maxWeight: Math.max(...monthData.map(d => d.weight))
      };
    } catch (error) {
      console.error('Ошибка получения месячной статистики веса:', error);
      return null;
    }
  }
};

// === УТИЛИТЫ ДЛЯ ВАЛИДАЦИИ ===
export const validationUtils = {
  validateHabitName: (name) => {
    try {
      if (!name || typeof name !== 'string') {
        return 'Название должно быть строкой';
      }
      if (name.trim().length < 3) {
        return 'Название должно содержать минимум 3 символа';
      }
      if (name.length > 50) {
        return 'Название не должно превышать 50 символов';
      }
      return null;
    } catch (error) {
      console.error('Ошибка валидации названия:', error);
      return 'Ошибка валидации названия';
    }
  },
  
  validateHabitDescription: (description) => {
    try {
      if (description && typeof description !== 'string') {
        return 'Описание должно быть строкой';
      }
      if (description && description.length > 150) {
        return 'Описание не должно превышать 150 символов';
      }
      return null;
    } catch (error) {
      console.error('Ошибка валидации описания:', error);
      return 'Ошибка валидации описания';
    }
  },
  
  validateTargetValue: (value, unit) => {
    try {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 1) {
        return 'Целевое значение должно быть больше 0';
      }
      if (numValue > 10000) {
        return 'Целевое значение слишком большое (максимум 10000)';
      }
      
      // Специфичные проверки для разных типов единиц
      if (unit === 'hours' && numValue > 24) {
        return 'Количество часов не может превышать 24 в день';
      }
      if (unit === 'minutes' && numValue > 1440) {
        return 'Количество минут не может превышать 1440 в день';
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка валидации целевого значения:', error);
      return 'Ошибка валидации целевого значения';
    }
  },
  
  validateWeight: (weight, unit = 'kg') => {
    try {
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
    } catch (error) {
      console.error('Ошибка валидации веса:', error);
      return 'Ошибка валидации веса';
    }
  },
  
  validateCompletionValue: (value, targetValue, allowOverachievement = true) => {
    try {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0) {
        return 'Значение должно быть положительным числом';
      }
      
      if (!allowOverachievement && numValue > targetValue) {
        return `Значение не может превышать цель (${targetValue})`;
      }
      
      if (numValue > targetValue * 10) {
        return 'Значение слишком большое (максимум в 10 раз больше цели)';
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка валидации значения выполнения:', error);
      return 'Ошибка валидации значения выполнения';
    }
  }
};

// === УТИЛИТЫ ДЛЯ ФОРМАТИРОВАНИЯ ===
export const formatUtils = {
  pluralize: (count, singular, few, many) => {
    try {
      if (!count && count !== 0) return '';
      
      const mod10 = count % 10;
      const mod100 = count % 100;
      
      if (mod10 === 1 && mod100 !== 11) {
        return `${count} ${singular}`;
      } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        return `${count} ${few}`;
      } else {
        return `${count} ${many}`;
      }
    } catch (error) {
      console.error('Ошибка множественного числа:', error);
      return `${count}`;
    }
  },
  
  formatStreak: (streak) => {
    try {
      return formatUtils.pluralize(streak, 'день', 'дня', 'дней');
    } catch (error) {
      console.error('Ошибка форматирования серии:', error);
      return `${streak} дней`;
    }
  },
  
  formatQuantity: (value, unit, includeUnit = true) => {
    try {
      if (!value && value !== 0) return '0';
      
      const formattedValue = value % 1 === 0 ? value.toString() : value.toFixed(1);
      
      if (!includeUnit) return formattedValue;
      
      // Получаем информацию о единице измерения
      const MEASUREMENT_UNITS = {
        minutes: { shortLabel: 'мин' },
        hours: { shortLabel: 'ч' },
        times: { shortLabel: 'раз' },
        pieces: { shortLabel: 'шт' },
        pages: { shortLabel: 'стр' },
        exercises: { shortLabel: 'упр' },
        games: { shortLabel: 'игр' },
        sets: { shortLabel: 'под' },
        liters: { shortLabel: 'л' },
        glasses: { shortLabel: 'ст' },
        kilometers: { shortLabel: 'км' },
        steps: { shortLabel: 'шаг' },
        kg: { shortLabel: 'кг' },
        lbs: { shortLabel: 'фунт' }
      };
      
      const unitInfo = MEASUREMENT_UNITS[unit];
      const unitLabel = unitInfo ? unitInfo.shortLabel : unit;
      
      return `${formattedValue} ${unitLabel}`;
    } catch (error) {
      console.error('Ошибка форматирования количества:', error);
      return value ? value.toString() : '0';
    }
  },

  formatWeight: (weight, unit = 'kg') => {
    try {
      if (!weight && weight !== 0) return '0 кг';
      
      const formattedWeight = weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
      const unitLabel = unit === 'kg' ? 'кг' : 'фунт';
      
      return `${formattedWeight} ${unitLabel}`;
    } catch (error) {
      console.error('Ошибка форматирования веса:', error);
      return `${weight} кг`;
    }
  },

  formatWeightChange: (change, unit = 'kg') => {
    try {
      if (!change && change !== 0) return '';
      
      const absChange = Math.abs(change);
      const formattedChange = absChange % 1 === 0 ? absChange.toString() : absChange.toFixed(1);
      const unitLabel = unit === 'kg' ? 'кг' : 'фунт';
      const prefix = change > 0 ? '+' : '-';
      
      return `${prefix}${formattedChange} ${unitLabel}`;
    } catch (error) {
      console.error('Ошибка форматирования изменения веса:', error);
      return `${change} кг`;
    }
  },

  formatPercentage: (value, decimals = 0) => {
    try {
      if (typeof value !== 'number') return '0%';
      return `${value.toFixed(decimals)}%`;
    } catch (error) {
      console.error('Ошибка форматирования процентов:', error);
      return '0%';
    }
  }
};

// === УТИЛИТЫ ДЛЯ ДОСТИЖЕНИЙ ===
export const achievementUtils = {
  checkAchievement: (achievement, habits) => {
    try {
      if (!achievement || !habits) return false;
      
      switch (achievement.type) {
        case 'streak': {
          return habits.some(habit => statsUtils.getStreak(habit) >= achievement.requirement);
        }
        
        case 'completion': {
          const totalCompletions = habits.reduce((sum, habit) => 
            sum + statsUtils.getTotalCompletions(habit), 0
          );
          return totalCompletions >= achievement.requirement;
        }
        
        case 'quantity': {
          const totalQuantity = habits
            .filter(habit => habit.type === 'number')
            .reduce((sum, habit) => sum + statsUtils.getTotalCompletions(habit), 0);
          return totalQuantity >= achievement.requirement;
        }
        
        case 'consistency': {
          const completionRates = habits.map(habit => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return statsUtils.getCompletionRate(habit, thirtyDaysAgo.toISOString().split('T')[0], dateUtils.today());
          });
          
          const avgCompletionRate = completionRates.length > 0 
            ? completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length 
            : 0;
          
          return avgCompletionRate >= achievement.requirement;
        }
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Ошибка проверки достижения:', error);
      return false;
    }
  },
  
  getProgress: (achievement, habits) => {
    try {
      if (!achievement || !habits) return 0;
      
      switch (achievement.type) {
        case 'streak': {
          const maxStreak = Math.max(...habits.map(habit => statsUtils.getStreak(habit)));
          return Math.min((maxStreak / achievement.requirement) * 100, 100);
        }
        
        case 'completion': {
          const totalCompletions = habits.reduce((sum, habit) => 
            sum + statsUtils.getTotalCompletions(habit), 0
          );
          return Math.min((totalCompletions / achievement.requirement) * 100, 100);
        }
        
        case 'quantity': {
          const totalQuantity = habits
            .filter(habit => habit.type === 'number')
            .reduce((sum, habit) => sum + statsUtils.getTotalCompletions(habit), 0);
          return Math.min((totalQuantity / achievement.requirement) * 100, 100);
        }
        
        case 'consistency': {
          const completionRates = habits.map(habit => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return statsUtils.getCompletionRate(habit, thirtyDaysAgo.toISOString().split('T')[0], dateUtils.today());
          });
          
          const avgCompletionRate = completionRates.length > 0 
            ? completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length 
            : 0;
          
          return Math.min((avgCompletionRate / achievement.requirement) * 100, 100);
        }
        
        default:
          return 0;
      }
    } catch (error) {
      console.error('Ошибка получения прогресса достижения:', error);
      return 0;
    }
  }
};