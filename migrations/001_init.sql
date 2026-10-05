-- Дни храним текстом 'YYYY-MM-DD': это локальная дата пользователя, без часовых поясов.
CREATE TABLE habits (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  icon          TEXT NOT NULL DEFAULT '✅',
  color         TEXT NOT NULL DEFAULT '#FF6A00',
  category      TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'boolean',
  target_value  DOUBLE PRECISION,
  unit          TEXT NOT NULL DEFAULT '',
  days_per_week INT NOT NULL DEFAULT 7,
  created_day   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ
);

CREATE TABLE completions (
  habit_id INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day      TEXT NOT NULL,
  value    DOUBLE PRECISION NOT NULL DEFAULT 1,
  PRIMARY KEY (habit_id, day)
);
