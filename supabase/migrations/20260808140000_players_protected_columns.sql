-- players_update_self (20260808080149_players.sql) has no column
-- restriction at all -- a raw API call (bypassing the app UI) can set an
-- arbitrary overall_rating (used in Discover sort and scout match-score,
-- meant to be AI-computed only) or flip profile_completed=true without the
-- wizard's required fields ever being filled in. Same pattern as the
-- existing scouts.verification_status guard in
-- 20260808080153_scouts_and_admins.sql's prevent_verification_self_change()
-- -- auth.uid() = old.id identifies a self-update; the AI service's
-- service_role writes (and the overall_rating recalc trigger it feeds) run
-- with auth.uid() null/different, so they're unaffected.

create or replace function public.prevent_overall_rating_self_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.overall_rating is distinct from old.overall_rating and auth.uid() = old.id then
    raise exception 'overall_rating can only be set by the AI analysis pipeline';
  end if;
  return new;
end;
$$;

create trigger players_overall_rating_lock
  before update on public.players
  for each row execute function public.prevent_overall_rating_self_change();

-- profile_completed must only become true when the fields the wizard
-- actually requires (profile-complete.tsx's own client-side check) are
-- really present -- mirrors that validation server-side too, so a raw API
-- call can't fake a completed profile and skip onboarding.
create or replace function public.validate_profile_completed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  has_full_name boolean;
begin
  if new.profile_completed and not coalesce(old.profile_completed, false) then
    select (full_name is not null and length(trim(full_name)) > 0) into has_full_name
      from public.profiles where id = new.id;

    if not has_full_name
      or new.date_of_birth is null
      or new.nationality_code is null
      or new.primary_position is null
    then
      raise exception 'profile_completed requires full_name, date_of_birth, nationality_code, and primary_position to be set';
    end if;
  end if;
  return new;
end;
$$;

create trigger players_profile_completed_validate
  before update on public.players
  for each row execute function public.validate_profile_completed();
