-- The tournament's non-cash prize text named the old project name publicly; it's the Dubai Life team.
update public.app_settings
   set value = jsonb_set(value, '{noncash_prize}', to_jsonb(replace(value ->> 'noncash_prize', 'Come To Dubai team', 'Dubai Life team')))
 where key = 'tournament' and value ->> 'noncash_prize' like '%Come To Dubai%';
