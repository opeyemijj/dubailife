-- Run after the 21+ sign-up is deployed: removes the old sign-up that took no date of birth, so nobody
-- can skip the age check by calling it directly.
drop function if exists public.register_account(text, text, text, text);
