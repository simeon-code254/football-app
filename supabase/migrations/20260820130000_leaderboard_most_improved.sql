-- A leaderboard category a low-rated player can actually top.
--
-- Every existing scope -- region, position, age band -- sorts by
-- overall_rating, so the same people are at the top of all three. A player
-- rated 18 cannot place in any of them, which for most of this app's users
-- means the leaderboard is a screen that only ever tells them they are
-- nowhere. Improvement is the one ranking where effort this week beats a head
-- start, and it is now computable because 20260820120000 started recording
-- what a rating used to be.
--
-- Left join, not inner: a player with no prior snapshot (new this week) gets
-- null rather than being dropped from every other scope's ranking. Null sorts
-- last on a descending improvement sort, which is the correct place for
-- "we have no history for you yet" -- and it is genuinely different from an
-- improvement of zero, so it is not coerced to 0.
--
-- create or replace view can only append columns, never reorder or rename
-- existing ones, so every column below stays exactly where it was (same
-- constraint noted in 20260815030000).
create or replace view public.player_leaderboard as
select
  p.id,
  p.full_name,
  p.avatar_url,
  p.primary_position,
  p.nationality_code,
  c.region,
  p.overall_rating,
  p.video_count,
  case
    when p.age is null then 'unknown'
    when p.age < 16 then 'u16'
    when p.age < 18 then 'u18'
    when p.age < 21 then 'u21'
    else 'senior'
  end as age_band,
  (select count(*) from public.follows f where f.followed_id = p.id) as follower_count,
  (select count(*) from public.endorsements e where e.player_id = p.id) as endorsement_count,
  p.rating_has_low_confidence,
  round(p.overall_rating - s.overall_rating, 2) as rating_delta
from public.player_public_view p
left join public.countries c on c.code = p.nationality_code
left join lateral (
  -- The most recent snapshot from BEFORE the current week. Using the current
  -- week's own row would compare a week against itself and every delta would
  -- be zero.
  select rs.overall_rating
  from public.player_rating_snapshots rs
  where rs.player_id = p.id
    and rs.week_start < date_trunc('week', now())::date
  order by rs.week_start desc
  limit 1
) s on true
where p.overall_rating is not null;
