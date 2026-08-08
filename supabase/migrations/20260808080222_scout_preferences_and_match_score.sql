-- Scouting Preferences (matches the RN form fields exactly) plus
-- match_score(): computed on read, never persisted, since it's a function of
-- two independently-mutable things (a scout's preferences and a player's
-- attributes) — persisting it would go stale the moment either side changes.

create table public.scout_preferences (
  scout_id uuid primary key references public.scouts(id) on delete cascade,
  positions position_code[] not null default '{}',
  age_min smallint,
  age_max smallint,
  countries text[] not null default '{}',
  min_overall smallint,
  updated_at timestamptz not null default now()
);

create trigger scout_preferences_set_updated_at
  before update on public.scout_preferences
  for each row execute function public.set_updated_at();

alter table public.scout_preferences enable row level security;

create policy scout_preferences_own on public.scout_preferences for all
  using (scout_id = auth.uid()) with check (scout_id = auth.uid());

-- SECURITY INVOKER (the default) is correct here, unlike is_admin()/
-- is_verified_scout() — this must respect the CALLER's own RLS on
-- scout_preferences/players, it isn't a privilege-escalation helper.
create or replace function public.match_score(p_scout_id uuid, p_player_id uuid)
returns smallint language plpgsql stable set search_path = public as $$
declare
  pref record;
  plyr record;
  v_score int := 0;
begin
  select * into pref from public.scout_preferences where scout_id = p_scout_id;
  select * into plyr from public.players where id = p_player_id;
  if pref is null or plyr is null then
    return null;
  end if;

  v_score := v_score + case
    when cardinality(pref.positions) = 0
      or plyr.primary_position = any(pref.positions)
      or plyr.secondary_position = any(pref.positions) then 40 else 0 end;

  v_score := v_score + case
    when pref.age_min is null and pref.age_max is null then 20
    when date_part('year', age(current_date, plyr.date_of_birth))
         between coalesce(pref.age_min, 0) and coalesce(pref.age_max, 99) then 20 else 0 end;

  v_score := v_score + case
    when cardinality(pref.countries) = 0 or plyr.nationality_code = any(pref.countries) then 20 else 0 end;

  v_score := v_score + case
    when pref.min_overall is null then 20
    when coalesce(plyr.overall_rating, 0) >= pref.min_overall then 20 else 0 end;

  return v_score;
end;
$$;
