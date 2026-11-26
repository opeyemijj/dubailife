-- Two new attraction games for Doha's stadiums (src/components/arcade/games/stadium): Match Night (watch a match
-- from your seat and lead the crowd) and Penalty Shootout. Their rewards join public.arcade_rule (src/data/arcade/games.json).

create or replace function public.arcade_rule(p_game text) returns jsonb
language sql immutable set search_path = public as $$
  select (case p_game
    when 'boxing'   then '{"perStar":150,"dailyCap":1500,"maxScore":100000,"maxLevel":30}'
    when 'gym'      then '{"perStar":40,"dailyCap":400,"maxScore":100000,"maxLevel":30}'
    when 'scan'     then '{"perStar":50,"dailyCap":300,"maxScore":100000,"maxLevel":3}'
    when 'labour'   then '{"perStar":300,"dailyCap":900,"maxScore":100000,"maxLevel":1}'
    when 'court'    then '{"perStar":200,"dailyCap":1200,"maxScore":100000,"maxLevel":30}'
    when 'hall'     then '{"perStar":150,"dailyCap":600,"maxScore":100000,"maxLevel":30}'
    when 'bridal'   then '{"perStar":100,"dailyCap":600,"maxScore":100000,"maxLevel":30}'
    when 'nails'    then '{"perStar":60,"dailyCap":600,"maxScore":100000,"maxLevel":30}'
    when 'goldsouk' then '{"perStar":80,"dailyCap":640,"maxScore":100000,"maxLevel":30}'
    when 'stadium'  then '{"perStar":60,"dailyCap":480,"maxScore":100000,"maxLevel":1}'
    when 'penalty'  then '{"perStar":60,"dailyCap":480,"maxScore":100000,"maxLevel":10}'
  end)::jsonb
$$;

