-- Everyone starts with AED 50,000. The one-time AED 50,000 bonuses for notifications and installing the app came
-- within minutes of signing up and doubled that, so they no longer pay (0 turns them off; already paid stays paid).
update public.app_settings set value = '{"install": 0, "push": 0}' where key = 'app_bonus';
