-- Puts back the AED 10,000 invite-a-friend reward. 20261204000000_no_app_bonus_cash.sql replaced the whole app_bonus
-- setting instead of only the install and push amounts, which also set the referral reward to nothing.
update public.app_settings set value = value || '{"referral": 10000}'::jsonb where key = 'app_bonus' and not (value ? 'referral');
