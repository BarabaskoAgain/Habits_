// Справочники: категории, иконки и цвета — из старой апки (ветка Testing-Core2), единицы — без веса.

export const CATEGORY_GROUPS = [
  { label: 'Здоровье и фитнес', icon: '💪', items: [
    { key: 'physical_activity', label: 'Физическая активность', icon: '🏃', color: '#FF5722' },
    { key: 'nutrition', label: 'Питание', icon: '🥗', color: '#8BC34A' },
    { key: 'hydration', label: 'Гидратация', icon: '💧', color: '#2196F3' },
    { key: 'sleep', label: 'Сон', icon: '😴', color: '#673AB7' },
    { key: 'mental_health', label: 'Ментальное здоровье', icon: '🧘', color: '#9C27B0' }
  ] },
  { label: 'Личностный рост', icon: '📚', items: [
    { key: 'learning', label: 'Обучение', icon: '📖', color: '#2196F3' },
    { key: 'goals', label: 'Цели', icon: '🎯', color: '#FF9800' },
    { key: 'creativity', label: 'Креативность', icon: '🧠', color: '#E91E63' },
    { key: 'reflection', label: 'Рефлексия', icon: '💭', color: '#607D8B' },
    { key: 'hobby', label: 'Хобби', icon: '🎨', color: '#795548' }
  ] },
  { label: 'Продуктивность', icon: '⚡', items: [
    { key: 'work', label: 'Работа', icon: '💻', color: '#424242' },
    { key: 'digital_wellness', label: 'Цифровое благополучие', icon: '📱', color: '#FF5722' },
    { key: 'time_management', label: 'Тайм-менеджмент', icon: '⏰', color: '#FF9800' },
    { key: 'planning', label: 'Планирование', icon: '📋', color: '#2196F3' },
    { key: 'focus', label: 'Фокус', icon: '🔍', color: '#9C27B0' }
  ] },
  { label: 'Социальные связи', icon: '👥', items: [
    { key: 'family', label: 'Семья', icon: '👨‍👩‍👧‍👦', color: '#E91E63' },
    { key: 'friends', label: 'Друзья', icon: '👯', color: '#FF9800' },
    { key: 'networking', label: 'Нетворкинг', icon: '🤝', color: '#2196F3' },
    { key: 'communication', label: 'Общение', icon: '💌', color: '#673AB7' },
    { key: 'care_for_others', label: 'Забота о других', icon: '🎁', color: '#4CAF50' }
  ] },
  { label: 'Образ жизни', icon: '✨', items: [
    { key: 'household', label: 'Быт', icon: '🏠', color: '#795548' },
    { key: 'finances', label: 'Финансы', icon: '💰', color: '#4CAF50' },
    { key: 'ecology', label: 'Экология', icon: '🌱', color: '#8BC34A' },
    { key: 'spirituality', label: 'Духовность', icon: '🙏', color: '#9C27B0' },
    { key: 'self_care', label: 'Самоуход', icon: '💆', color: '#E91E63' }
  ] }
];

const CATEGORY_BY_KEY = Object.fromEntries(CATEGORY_GROUPS.flatMap(g => g.items).map(c => [c.key, c]));
// Категория по ключу Core2; старые v1-записи хранили подпись — показываем как есть
export const categoryOf = (key) => CATEGORY_BY_KEY[key] || (key ? { key, label: key, icon: '🏷️' } : null);

export const ICON_GROUPS = [
  { label: 'Здоровье', icons: ['🏃', '🚶', '🏋️', '🤸', '🦵', '🧘', '💧', '🥗', '😴', '💊', '🚫', '🩺', '🍎', '🥛', '⚖️', '🫁', '🦷', '👁️', '🛌', '🔥'] },
  { label: 'Развитие мозга', icons: ['📚', '🧩', '♟️', '💻', '🎥', '🧘', '✍️', '🎓', '🌐', '🗣️', '🧠', '📖', '🔍', '💡', '📝', '⚡', '🎯', '📊', '🔢', '🗂️'] },
  { label: 'Работа', icons: ['💼', '📋', '⏰', '📞', '📧', '💬', '🎯', '📈', '💡', '🔧', '📊', '💰', '⚡', '🧠', '📌', '⏱️', '🎓', '🌐', '🗃️', '📱'] },
  { label: 'Хобби', icons: ['🎨', '🎵', '📷', '✂️', '💃', '🚴', '🎮', '🧵', '🎭', '🎪', '🎲', '🎸', '🎬', '🎤', '🎹', '🥁', '🏓', '🎳', '🎯', '🌸'] },
  { label: 'Быт', icons: ['🧹', '🍳', '🛒', '📦', '🧺', '☕', '🌱', '💳', '🔧', '📋', '🗂️', '📞', '🏠', '🛏️', '🚿', '🧼', '💡', '🔒', '📅', '♻️'] },
  { label: 'Цели', icons: ['🎯', '📅', '✅', '📋', '💪', '⏰', '🔥', '⭐', '💰', '📈', '🎓', '💼', '❤️', '👥', '🤝', '💬', '🧭', '🚀', '🌟', '✨'] }
];

export const COLOR_GROUPS = [
  { label: 'Популярные', colors: ['#FF6A00', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#E91E63', '#673AB7'] },
  { label: 'Пастельные', colors: ['#FF6B9D', '#95E1D3', '#F3D250', '#A8E6CF', '#FFB3BA', '#C7CEEA', '#B39DDB', '#81C784', '#FFD54F'] },
  { label: 'Яркие', colors: ['#FF1744', '#D500F9', '#651FFF', '#3D5AFE', '#2979FF', '#00B0FF', '#1DE9B6', '#00E676', '#76FF03'] },
  { label: 'Природные', colors: ['#8D6E63', '#689F38', '#F57C00', '#5D4037', '#795548', '#558B2F', '#FF8F00', '#827717', '#E65100'] },
  { label: 'Нейтральные', colors: ['#37474F', '#455A64', '#546E7A', '#607D8B', '#78909C', '#90A4AE', '#B0BEC5', '#CFD8DC', '#263238'] },
  { label: 'Энергичные', colors: ['#C6FF00', '#FFEA00', '#FFC400', '#FF9100', '#FF3D00', '#FF4081', '#AB47BC', '#7E57C2', '#5C6BC0'] }
];

// Единицы: u — что хранится в habits.unit; forms — склонение (1 / 2 / 5); time — особый формат
export const UNITS = [
  { u: 'раз', forms: ['раз', 'раза', 'раз'] },
  { u: 'мин', time: 'min' },
  { u: 'ч', time: 'h' },
  { u: 'стр', forms: ['страница', 'страницы', 'страниц'] },
  { u: 'партии', forms: ['партия', 'партии', 'партий'] },
  { u: 'подходы', forms: ['подход', 'подхода', 'подходов'] },
  { u: 'упр', forms: ['упражнение', 'упражнения', 'упражнений'] },
  { u: 'шт', forms: ['шт', 'шт', 'шт'] },
  { u: 'стаканы', forms: ['стакан', 'стакана', 'стаканов'] },
  { u: 'л', forms: ['л', 'л', 'л'] },
  { u: 'км', forms: ['км', 'км', 'км'] },
  { u: 'шаги', forms: ['шаг', 'шага', 'шагов'] }
];
export const unitOf = (u) => UNITS.find(x => x.u === u) || null;

// Быстрые «+N» для ввода количества (SPEC §2: при цели 50 — +10 / +20 / +50)
export function quickSteps(h) {
  const t = Number(h.target_value) || 0;
  if (h.unit === 'мин') return [5, 15, 30, 60];
  if (h.unit === 'ч') return [0.5, 1, 2];
  if (!t) return [1, 5, 10];
  const raw = [Math.round(t / 5), Math.round((t * 2) / 5), t].filter(x => x >= 1);
  return [...new Set(raw.length ? raw : [1])];
}

// Те же правила, что на сервере (routes/habits.js): штучные — целые, лимит значения за день
export const INT_UNITS = new Set(['раз', 'мин', 'стр', 'партии', 'подходы', 'упр', 'шт', 'стаканы', 'шаги']);
export const maxValue = (h) =>
  h.unit === 'мин' ? 1440 : h.unit === 'ч' ? 24 : Math.max(10 * (Number(h.target_value) || 0), 10000);

// Шаблоны первого входа и пустого экрана (создаются по выбору, не автоматически)
export const TEMPLATES = [
  { name: 'Стакан воды', icon: '💧', color: '#2196F3', category: 'hydration', type: 'number', target_value: 8, unit: 'стаканы', schedule: 'daily' },
  { name: 'Отжимания', icon: '💪', color: '#FF6A00', category: 'physical_activity', type: 'number', target_value: 50, unit: 'раз', schedule: 'daily' },
  { name: 'Чтение', icon: '📖', color: '#673AB7', category: 'learning', type: 'number', target_value: 20, unit: 'мин', schedule: 'daily' },
  { name: 'Шахматы', icon: '♟️', color: '#37474F', category: 'hobby', type: 'number', target_value: null, unit: 'партии', schedule: 'daily' },
  { name: 'Тренировка', icon: '🏋️', color: '#F44336', category: 'physical_activity', type: 'boolean', schedule: 'weekly', days_per_week: 3 },
  { name: 'Медитация', icon: '🧘', color: '#9C27B0', category: 'mental_health', type: 'number', target_value: 10, unit: 'мин', schedule: 'daily' },
  { name: '10 000 шагов', icon: '🚶', color: '#4CAF50', category: 'physical_activity', type: 'number', target_value: 10000, unit: 'шаги', schedule: 'daily' },
  { name: 'Без сладкого', icon: '🍎', color: '#8BC34A', category: 'nutrition', type: 'boolean', schedule: 'daily' }
];

// Мотивационные цитаты из старой апки — только в пустом состоянии
export const QUOTES = [
  ['Мы — то, что мы делаем постоянно. Совершенство — не действие, а привычка.', 'Аристотель'],
  ['Путь в тысячу ли начинается с первого шага.', 'Лао-цзы'],
  ['Успех — это сумма небольших усилий, повторяемых изо дня в день.', 'Роберт Кольер'],
  ['Дисциплина — мост между целями и достижениями.', 'Джим Рон'],
  ['Не важно, как медленно ты идёшь, главное — не останавливаться.', 'Наполеон Хилл']
];

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
