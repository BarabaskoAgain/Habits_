-- Не больше одной открытой паузы (архива) на привычку: защита от параллельной архивации.
CREATE UNIQUE INDEX habit_pauses_open ON habit_pauses (habit_id) WHERE to_day IS NULL;
