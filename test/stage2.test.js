// Этап 2: напоминания, сводки, достижения — чистая логика (SPEC §7, §8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kyivNow, inWindow, dueReminders, morningDigest, eveningDigest, weekDigest } from '../lib/reminders.js';
import { achievementProgress, ACHIEVEMENTS } from '../public/js/logic.js';

const H = (x = {}) => ({
  id: 1, name: 'Зарядка', type: 'boolean', target_value: null, unit: '', schedule: 'daily', active_days: [0, 1, 2, 3, 4, 5, 6],
  days_per_week: 7, created_day: '2026-09-01', end_day: null, pauses: [],
  reminder_enabled: true, reminder_time: '09:00', last_reminded_day: null, ...x
});
const NOW = { day: '2026-10-07', hm: '09:05' }; // среда

test('kyivNow: день и время по Киеву при сервере в UTC', () => {
  assert.deepEqual(kyivNow(new Date(Date.UTC(2026, 9, 6, 22, 30))), { day: '2026-10-07', hm: '01:30' });
});

test('окно напоминания: от времени и 15 минут после', () => {
  assert.equal(inWindow('09:00', '09:00'), true);
  assert.equal(inWindow('09:14', '09:00'), true);
  assert.equal(inWindow('09:15', '09:00'), false);
  assert.equal(inWindow('08:59', '09:00'), false);
  assert.equal(inWindow('00:05', '23:55'), false); // через полночь не переносим
});

test('напоминание приходит в окне и только раз в день', () => {
  assert.deepEqual(dueReminders([H()], {}, NOW).map(h => h.id), [1]);
  assert.deepEqual(dueReminders([H({ last_reminded_day: '2026-10-07' })], {}, NOW), []);
  assert.deepEqual(dueReminders([H()], {}, { ...NOW, hm: '08:30' }), []);
  assert.deepEqual(dueReminders([H({ reminder_enabled: false })], {}, NOW), []);
});

test('не напоминает: уже сделано, выходной, архив, счётчик, план недели выполнен', () => {
  assert.deepEqual(dueReminders([H()], { 1: { '2026-10-07': 1 } }, NOW), [], 'уже сделано');
  assert.deepEqual(dueReminders([H({ schedule: 'days', active_days: [0, 4] })], {}, NOW), [], 'среда — выходной');
  assert.deepEqual(dueReminders([H({ pauses: [{ from_day: '2026-10-07', to_day: null }] })], {}, NOW), [], 'в архиве');
  assert.deepEqual(dueReminders([H({ end_day: '2026-10-06' })], {}, NOW), [], 'срок вышел');
  assert.deepEqual(dueReminders([H({ type: 'number', target_value: null })], {}, NOW), [], 'счётчик');
  const weekly = H({ schedule: 'weekly', days_per_week: 2 });
  assert.deepEqual(dueReminders([weekly], { 1: { '2026-10-05': 1, '2026-10-06': 1 } }, NOW), [], 'план недели выполнен');
  assert.equal(dueReminders([weekly], { 1: { '2026-10-05': 1 } }, NOW).length, 1, 'weekly, план не выполнен — напоминаем');
  const num = H({ type: 'number', target_value: 50, unit: 'раз' });
  assert.equal(dueReminders([num], { 1: { '2026-10-07': 20 } }, NOW).length, 1, 'number: частично — напоминаем');
});

test('утренняя сводка: что сегодня по плану', () => {
  const hs = [H({ id: 1, name: 'Зарядка' }), H({ id: 2, name: 'Чтение', type: 'number', target_value: 20, unit: 'мин' }),
    H({ id: 3, name: 'Шахматы', type: 'number', target_value: null, unit: 'партии' })];
  const d = morningDigest(hs, {}, '2026-10-07');
  assert.equal(d.title, '☀️ Сегодня 2 привычки');
  assert.match(d.body, /Зарядка/); assert.match(d.body, /Чтение/); assert.doesNotMatch(d.body, /Шахматы/);
  assert.equal(morningDigest([H({ schedule: 'days', active_days: [0] })], {}, '2026-10-07'), null, 'ничего по плану — тишина');
});

test('вечерняя сводка: только если что-то осталось', () => {
  const hs = [H({ id: 1, name: 'Зарядка' }), H({ id: 2, name: 'Чтение' })];
  const d = eveningDigest(hs, { 1: { '2026-10-07': 1 } }, '2026-10-07');
  assert.equal(d.title, '🌙 Осталось 1 из 2');
  assert.match(d.body, /Чтение/);
  assert.equal(eveningDigest(hs, { 1: { '2026-10-07': 1 }, 2: { '2026-10-07': 1 } }, '2026-10-07'), null);
});

test('итог недели: выполнено из плана и объёмы', () => {
  const hs = [
    H({ id: 1, name: 'Зарядка' }),
    H({ id: 2, name: 'Отжимания', type: 'number', target_value: 50, unit: 'раз' }),
    H({ id: 3, name: 'Шахматы', type: 'number', target_value: null, unit: 'партии' })
  ];
  const comp = {
    1: { '2026-10-05': 1, '2026-10-06': 1 },
    2: { '2026-10-05': 60, '2026-10-07': 40 },
    3: { '2026-10-06': 3 }
  };
  const d = weekDigest(hs, comp, '2026-10-11'); // воскресенье
  assert.equal(d.title, '📊 Итог недели: 3 из 14');
  assert.match(d.body, /Отжимания: 100 раз/);
  assert.match(d.body, /Шахматы: 3 партии/);
});

test('достижения: прогресс и выполнение', () => {
  const hs = [H({ id: 1 }), H({ id: 2, name: 'Отжимания', type: 'number', target_value: 50, unit: 'раз' })];
  const comp = { 1: {}, 2: {} };
  for (let i = 1; i <= 8; i++) comp[1][`2026-09-0${i}`] = 1;               // серия 8 дней
  for (let i = 1; i <= 22; i++) comp[2][`2026-09-${String(i).padStart(2, '0')}`] = 50; // 22 дня по 50
  const p = Object.fromEntries(achievementProgress(hs, comp, '2026-10-07').map(a => [a.code, a]));
  assert.equal(ACHIEVEMENTS.length, 5);
  assert.equal(p.first_step.done, true);
  assert.equal(p.streak_7.done, true);
  assert.equal(p.streak_30.done, false);
  assert.equal(p.fifty.value, 30); assert.equal(p.fifty.done, false);
  assert.equal(p.thousand.value, 1100); assert.equal(p.thousand.done, true);
});
