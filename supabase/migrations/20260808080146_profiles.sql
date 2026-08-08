-- Shared profile row for every user, 1:1 with auth.users. `role` is set once
-- (via handle_new_user, see later migration) and immutable after that.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('player','scout','admin')),
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.prevent_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role is not null and new.role <> old.role then
    raise exception 'role is immutable once set';
  end if;
  return new;
end;
$$;

create trigger profiles_role_immutable
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- SECURITY DEFINER: this function is called from a `profiles` SELECT policy
-- below. Without SECURITY DEFINER, its own internal query against `profiles`
-- would re-trigger RLS on the same table mid-evaluation (Postgres rejects
-- that as recursive policy evaluation) instead of bypassing it.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

alter table public.profiles enable row level security;

create policy profiles_select_self on public.profiles for select
  using (auth.uid() = id);
create policy profiles_select_players_public on public.profiles for select
  to authenticated using (role = 'player');
create policy profiles_select_admin on public.profiles for select
  using (public.is_admin());
create policy profiles_update_self on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- No delete policy: account deletion goes through the delete-account Edge
-- Function (service_role, cascades via FK) — never a direct client DELETE.
