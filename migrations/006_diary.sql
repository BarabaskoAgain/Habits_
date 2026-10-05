-- Этап 3: дневник. Описание дня (одна строка на день) и события дня.
CREATE TABLE diary_days (
  day  TEXT PRIMARY KEY,
  text TEXT NOT NULL
);

CREATE TABLE diary_events (
  id     SERIAL PRIMARY KEY,
  day    TEXT NOT NULL,
  kind   TEXT NOT NULL,
  title  TEXT NOT NULL,
  rating INT NOT NULL,
  note   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX diary_events_day ON diary_events (day);
