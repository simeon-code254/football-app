-- Stop unauthenticated strangers reading identifiable data about children.
--
-- Verified against production with the anon key, no login: player_public_view
-- returned full_name, age, a public avatar URL, nationality, primary_position
-- and club for every player. The app's own age gate admits 13-year-olds
-- (profile-complete.tsx, MIN_AGE_YEARS), so that is a browsable directory of
-- identifiable minors with photographs and the name of the club where they
-- can be found in person.
--
-- That is the pattern Google Play's Child Safety Standards policy exists to
-- stop, and it is a COPPA / GDPR-K exposure independent of any app store. It
-- was not a deliberate product decision -- signed-out browse (20260814220000)
-- was built to let visitors sample the app before signing up, and minors were
-- swept in because the view never distinguished them.
--
-- Adults remain visible signed-out, so browse still works as an acquisition
-- surface. Minors become visible only once there is an authenticated account
-- behind the request -- someone the platform can identify, suspend and report.
--
-- Players with no date_of_birth are treated as minors here. We cannot show
-- they are adults, and "unknown age" must fail safe on a screen that is
-- otherwise open to the entire internet.
--
-- This does NOT make a minor's data private in general -- verified scouts and
-- signed-in users still see it, which is the product. It closes the
-- unauthenticated hole.
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
left join public.countries c on c.code = p.nationality_code
where
  -- auth.uid() is null exactly when the request carries no user JWT, i.e. the
  -- anon key alone. Signed-in users are unaffected.
  auth.uid() is not null
  or date_part('year', age(current_date, p.date_of_birth)) >= 18;

-- The view was granted INSERT/UPDATE/DELETE/TRUNCATE to anon and
-- authenticated, inherited from a blanket grant. It runs with its owner's
-- privileges, so a writable path through it would sidestep the RLS on players
-- entirely. Nothing writes through this view -- every write goes to the base
-- tables -- so the write grants are pure attack surface.
revoke insert, update, delete, truncate, references, trigger
  on public.player_public_view from anon, authenticated;
