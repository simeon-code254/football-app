-- profile_views (20260808082733) had no dedupe at all -- the same viewer
-- could insert unlimited rows for the same profile, directly inflating a
-- trust-relevant number shown to players ("3 scouts viewed your profile
-- this week", "Profile Views (30d)"). One row per viewer+profile+day is
-- the standard "unique view" semantic most products use -- a genuine
-- re-visit tomorrow still counts, rapid repeat-refreshing today doesn't.
alter table public.profile_views
  add column viewed_day date generated always as ((viewed_at at time zone 'utc')::date) stored;

create unique index profile_views_daily_dedupe
  on public.profile_views (viewer_id, viewed_profile_id, viewed_day);
