-- The app moved to mydubailife.app: links in verification and password-reset emails point there.
update public.app_settings set value = value || '{"app_url": "https://mydubailife.app"}'::jsonb where key = 'email';
