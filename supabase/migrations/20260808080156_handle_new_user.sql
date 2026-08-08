-- Auto-provisioning on signup: creates the profiles row plus a skeleton
-- players/scouts row, so profile-complete.tsx and verify-email.tsx (which
-- routes scouts straight to their dashboard) always have a row to work with.
--
-- The RN app's supabase.auth.signUp() call must pass:
--   options.data = { role: 'player' | 'scout', full_name, organization? }

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text := new.raw_user_meta_data->>'role';
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, coalesce(v_role, 'player'), new.raw_user_meta_data->>'full_name');

  if v_role = 'scout' then
    insert into public.scouts (id, organization)
    values (new.id, new.raw_user_meta_data->>'organization');
  else
    insert into public.players (id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
