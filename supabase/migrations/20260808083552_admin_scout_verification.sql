-- Real bug: scouts_verification_lock (previous migration) correctly blocks a
-- scout from approving themselves, but no policy ever granted an ADMIN write
-- access to the scouts table at all — verification_status had no path to
-- ever actually change. This is the fix: an admin-only UPDATE policy, plus
-- auto-stamping verified_at/verified_by so the existing (until now unused)
-- audit columns actually get populated when an approval happens.

create policy scouts_update_admin on public.scouts for update
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.stamp_scout_verification()
returns trigger language plpgsql as $$
begin
  if new.verification_status <> old.verification_status then
    new.verified_at = now();
    new.verified_by = auth.uid();
  end if;
  return new;
end;
$$;

create trigger scouts_stamp_verification
  before update on public.scouts
  for each row execute function public.stamp_scout_verification();
