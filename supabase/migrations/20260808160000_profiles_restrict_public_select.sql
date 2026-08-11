-- profiles_select_players_public (20260808080146_profiles.sql) grants
-- full-row select -- including `phone` -- on every player's profile to any
-- authenticated user, not just verified scouts. The app's actual
-- Discover/browse screens query the phone-free player_public_view
-- (20260808080225_player_public_view.sql), which -- being a plain view --
-- runs with its owner's privileges rather than the caller's, so it keeps
-- working once this direct-table policy is narrowed. Scouts still get full
-- profile access once verified, since they have a legitimate reason to see
-- contact details; ordinary players don't need each other's phone numbers.
drop policy profiles_select_players_public on public.profiles;

create policy profiles_select_players_verified_scouts on public.profiles for select
  to authenticated using (role = 'player' and public.is_verified_scout());
