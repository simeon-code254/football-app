-- Suspend/ban, admin-only. Unlike a purely decorative flag, this is real
-- enforcement today, no mobile app change required: a suspended player
-- immediately vanishes from players_select_verified_scouts (scout browsing)
-- and a suspended scout immediately vanishes from scouts_select_public
-- (player-facing discovery/messaging), both re-checked live via RLS on
-- every read. What this does NOT yet do: block a suspended user's own
-- writes (upload/message/apply-to-trial etc.) or show them a friendly
-- "you're suspended" message -- that needs policy-by-policy work across
-- many tables plus mobile UI copy, deliberately left for later rather than
-- rushed here.
alter table public.profiles
  add column is_active boolean not null default true,
  add column suspended_reason text,
  add column suspended_at timestamptz,
  add column suspended_by uuid references public.profiles(id);

create or replace function public.stamp_profile_suspension()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_active <> old.is_active then
    if new.is_active = false then
      new.suspended_at = now();
      new.suspended_by = auth.uid();
    else
      new.suspended_at = null;
      new.suspended_by = null;
      new.suspended_reason = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_stamp_suspension
  before update on public.profiles
  for each row execute function public.stamp_profile_suspension();

-- No existing admin write policy on profiles at all -- profiles_update_self
-- only covers auth.uid()=id. profiles_role_immutable (existing trigger)
-- still blocks role tampering even through this broad policy.
create policy profiles_update_admin on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- Narrow the two existing "open to any authenticated user" discovery
-- policies to also require the target account be active. Additive AND
-- condition only -- doesn't grant anything new, just hides suspended
-- accounts from everyone except admin (who keeps full access below).
drop policy players_select_verified_scouts on public.players;
create policy players_select_verified_scouts on public.players for select
  to authenticated using (
    public.is_verified_scout()
    and exists (select 1 from public.profiles pr where pr.id = players.id and pr.is_active)
  );

drop policy scouts_select_public on public.scouts;
create policy scouts_select_public on public.scouts for select
  to authenticated using (
    exists (select 1 from public.profiles pr where pr.id = scouts.id and pr.is_active)
  );

-- scouts had no admin-specific select policy before (scouts_select_public
-- being fully open made one unnecessary) -- narrowing it above means an
-- admin reviewing a suspended scout's own detail page would otherwise now
-- get zero rows. This restores unconditional admin visibility, matching
-- players_select_admin/videos_select_admin's existing pattern.
create policy scouts_select_admin on public.scouts for select
  using (public.is_admin());
