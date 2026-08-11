-- Same bug class as the profiles fix (20260808160000): players_select_public
-- (20260808080149_players.sql) grants full-row select -- date_of_birth,
-- height_cm, weight_kg, bio, jersey_number, every social handle -- to any
-- authenticated user, not just verified scouts. The app's actual
-- Discover/browse/leaderboard screens all query the curated
-- player_public_view (20260808080225_player_public_view.sql), which -- as
-- confirmed live for the profiles fix -- keeps working after narrowing the
-- base table policy, since the view runs with its owner's privileges.
drop policy players_select_public on public.players;

create policy players_select_verified_scouts on public.players for select
  to authenticated using (public.is_verified_scout());
