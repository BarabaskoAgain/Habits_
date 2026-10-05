// fmtValue (SPEC §0) и защита SHELL service worker (R1: один 404 — и новый SW не ставится).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { fmtValue, fmtTarget, scheduleText } from '../public/js/fmt.js';

const num = (unit, extra = {}) => ({ type: 'number', unit, target_value: 50, ...extra });

test('минуты → «1 ч 30 мин», коротко «1ч30»', () => {
  const h = num('мин');
  assert.equal(fmtValue(h, 45), '45 мин');
  assert.equal(fmtValue(h, 90), '1 ч 30 мин');
  assert.equal(fmtValue(h, 120), '2 ч');
  assert.equal(fmtValue(h, 90, { short: true }), '1ч30');
  assert.equal(fmtValue(h, 45, { short: true }), '45');
});

test('минуты с дробью не дают «1 ч 60 мин»', () => {
  const h = num('мин');
  assert.equal(fmtValue(h, 119.5), '2 ч');
  assert.equal(fmtValue(h, 59.6), '1 ч');
  assert.equal(fmtValue(h, 119.5, { short: true }), '2ч');
});

test('часы дробные', () => {
  assert.equal(fmtValue(num('ч'), 1.5), '1,5 ч');
});

test('склонения единиц: партии, раз, своя единица', () => {
  const chess = num('партии', { target_value: null });
  assert.equal(fmtValue(chess, 1), '1 партия');
  assert.equal(fmtValue(chess, 3), '3 партии');
  assert.equal(fmtValue(chess, 214), '214 партий');
  assert.equal(fmtValue(chess, 11), '11 партий');
  assert.equal(fmtValue(num('раз'), 12340).replace(/\s/g, ' '), '12 340 раз');
  const custom = num('круг', { unit_forms: ['круг', 'круга', 'кругов'] });
  assert.equal(fmtValue(custom, 22), '22 круга');
});

test('узкие ячейки: 999+ и тысячи', () => {
  assert.equal(fmtValue(num('шаги'), 1500, { short: true }), '999+');
  assert.equal(fmtValue(num('шаги'), 12000, { short: true }), '12к');
});

test('boolean: дни', () => {
  assert.equal(fmtValue({ type: 'boolean' }, 5), '5 дней');
  assert.equal(fmtValue({ type: 'boolean' }, 1, { short: true }), '✓');
});

test('цель и расписание текстом', () => {
  assert.equal(fmtTarget(num('мин', { target_value: 20 })), '20 мин');
  assert.equal(fmtTarget(num('партии', { target_value: null })), 'без цели');
  assert.equal(scheduleText({ type: 'boolean', schedule: 'weekly', days_per_week: 3 }), '3 раза в неделю');
  assert.equal(scheduleText({ type: 'boolean', schedule: 'days', active_days: [0, 2, 4] }), 'Пн, Ср, Пт');
});

test('SW SHELL: все файлы существуют и все модули в нём', () => {
  const pub = fileURLToPath(new URL('../public/', import.meta.url));
  const src = readFileSync(pub + 'sw.js', 'utf8');
  const shell = JSON.parse(src.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  for (const p of shell) if (p !== '/') assert.ok(existsSync(pub + p.slice(1)), `нет файла ${p}`);
  const modules = [
    ...readdirSync(pub + 'js').filter(f => f.endsWith('.js')).map(f => '/js/' + f),
    ...readdirSync(pub + 'js/logic').map(f => '/js/logic/' + f)
  ];
  for (const m of modules) assert.ok(shell.includes(m), `модуль ${m} не в SHELL`);
});
