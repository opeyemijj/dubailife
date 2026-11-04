-- Courses: no wait between steps (user, 2026-11-04: "remove the 18-hour restriction"). The next lesson, and the
-- week's test, open as soon as you pass the one before. academy_record reads this setting (0 = never locked).
update app_settings set value = value || '{"unlock_hours": 0}'::jsonb where key = 'academy';
