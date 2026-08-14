-- validate_profile_completed() only checked required fields at the moment
-- profile_completed flipped false -> true (`not coalesce(old.profile_completed,
-- false)`). Live-confirmed gap: a player could null out a required field on
-- a later, unrelated edit (e.g. clearing nationality_code) and the row
-- stayed profile_completed = true with data missing, since that update
-- never re-triggered the check. Re-validates on every update where the
-- resulting row has profile_completed = true, not just the transition into
-- it -- the invariant now actually holds continuously, not just at one
-- instant.
create or replace function public.validate_profile_completed()
returns trigger language plpgsql as $$
declare
  has_full_name boolean;
begin
  if new.profile_completed then
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
