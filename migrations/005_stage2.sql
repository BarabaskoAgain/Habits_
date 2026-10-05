-- Этап 2: push-подписки устройств и полученные достижения.
CREATE TABLE push_subscriptions (
  id         SERIAL PRIMARY KEY,
  endpoint   TEXT NOT NULL UNIQUE,
  keys       JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE achievements (
  code        TEXT PRIMARY KEY,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
