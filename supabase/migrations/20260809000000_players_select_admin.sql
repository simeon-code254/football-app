-- players_select_public (original, fully open) was narrowed to
-- players_select_verified_scouts by 20260808180000_players_restrict_public_select.sql,
-- which gates on is_verified_scout() -- an admin (role='admin', never a row
-- in `scouts`) has never been a verified scout, so admin currently has ZERO
-- read access to the players extension table (position, club, height/weight,
-- bio, overall_rating, socials) despite profiles_select_admin granting full
-- profiles access. The admin webapp's Users/Videos/AI-Pipeline pages all
-- embed players(...) via a PostgREST join and would otherwise silently get
-- a null embed for every row the admin doesn't personally own.
create policy players_select_admin on public.players for select
  using (public.is_admin());
