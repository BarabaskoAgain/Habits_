-- v2: режимы расписания, срок, напоминания, порядок, заметки, паузы (архив), настройки.
-- Перенос данных v1 — в 003_v2_backfill.mjs.
ALTER TABLE habits ADD COLUMN schedule TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE habits ADD COLUMN active_days INT[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6];
ALTER TABLE habits ADD COLUMN end_day TEXT;
ALTER TABLE habits ADD COLUMN unit_forms TEXT;
ALTER TABLE habits ADD COLUMN reminder_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE habits ADD COLUMN reminder_time TEXT;
ALTER TABLE habits ADD COLUMN last_reminded_day TEXT;
ALTER TABLE habits ADD COLUMN sort INT NOT NULL DEFAULT 0;

ALTER TABLE completions ADD COLUMN note TEXT NOT NULL DEFAULT '';
CREATE INDEX completions_day ON completions (day);

-- Архив = открытая пауза (to_day IS NULL). Полуинтервал [from_day, to_day).
CREATE TABLE habit_pauses (
  id       SERIAL PRIMARY KEY,
  habit_id INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  from_day TEXT NOT NULL,
  to_day   TEXT,
  reason   TEXT NOT NULL DEFAULT 'paused'
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
