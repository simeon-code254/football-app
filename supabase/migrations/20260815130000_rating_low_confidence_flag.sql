-- Carry "is any of this rating low-confidence?" on the player row, so list
-- surfaces can mark it.
--
-- The player's own card and the scout recommended card now mark low-confidence
-- values, because both fetch the full attribute set for one player at a time.
-- Every other rating surface -- the scout players list, Discover, trending --
-- renders from player_public_view, which carries overall_rating and no
-- attribute data at all. There is currently no way for those screens to know
-- the headline number is uncertain, so they show it bare.
--
-- Fetching attributes per row is not an option: that is an N+1 (the scout home
-- already does Promise.all over four players, which does not survive a list of
-- twenty-four). The flag has to live on the row.
--
-- A boolean rather than a rolled-up 'High'/'Medium'/'Low'. Aggregating three
-- tiers across attributes into one tier would mean inventing a rule -- weakest
-- link? weighted mode? -- and every choice would be a claim we cannot justify
-- from the pipeline's output. "At least one contributing attribute was Low"
-- is exactly what the UI marks and exactly what the data supports, with no
-- aggregation rule smuggled in.

alter table public.players
  add column if not exists rating_has_low_confidence boolean not null default false;

comment on column public.players.rating_has_low_confidence is
  'True when at least one scored attribute has confidence = ''Low''. Mirrors '
  'exactly what the rating cards mark; not a rolled-up confidence tier.';

create or replace function public.rating_has_low_confidence(p_player_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.player_attribute_scores
    where player_id = p_player_id and confidence = 'Low'
  );
$$;

revoke all on function public.rating_has_low_confidence(uuid) from public, anon, authenticated;

-- Both columns are derived from the same rows, so they are maintained in the
-- same statement -- two separate updates could interleave and leave the flag
-- describing a rating it no longer matches.
create or replace function public.recalc_player_overall()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_player_id uuid := coalesce(new.player_id, old.player_id);
begin
  update public.players
    set overall_rating = public.weighted_overall(v_player_id),
        rating_has_low_confidence = public.rating_has_low_confidence(v_player_id)
  where id = v_player_id;
  return null;
end;
$$;

-- The position-change trigger deliberately does NOT touch the flag: whether an
-- attribute was measured confidently has nothing to do with what position the
-- player says they play. It only rewrites overall_rating, which does depend on
-- position (see 20260815120000).

update public.players p
set rating_has_low_confidence = public.rating_has_low_confidence(p.id)
where p.rating_has_low_confidence is distinct from public.rating_has_low_confidence(p.id);

-- create or replace view can only append columns, never reorder or rename
-- existing ones, so every column below stays exactly where it was and the new
-- one goes last (same constraint noted in 20260815030000).
create or replace view public.player_public_view as
select
  p.id,
  pr.full_name,
  pr.avatar_url,
  p.primary_position,
  p.secondary_position,
  p.nationality_code,
  c.name as nationality_name,
  date_part('year', age(current_date, p.date_of_birth))::int as age,
  p.club,
  p.overall_rating,
  p.preferred_foot,
  (select count(*) from public.videos v where v.player_id = p.id and v.status = 'ready') as video_count,
  (select bool_or(true) from public.videos v where v.player_id = p.id and v.status = 'ready'
     and v.created_at > now() - interval '14 days') as recently_active,
  p.is_goalkeeper,
  p.height_cm,
  p.weight_kg,
  p.rating_has_low_confidence
from public.players p
join public.profiles pr on pr.id = p.id
left join public.countries c on c.code = p.nationality_code;
