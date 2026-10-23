-- Emails are sent from noreply@mydubailife.app.
update public.app_settings set value = value || '{"from": "Dubai Life <noreply@mydubailife.app>"}'::jsonb where key = 'email';
