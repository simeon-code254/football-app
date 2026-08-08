-- Scout and admin extension rows, plus the is_verified_scout() helper used
-- by RLS policies on trials/conversations/etc. in later migrations.

create table public.scouts (
  id uuid primary key references public.profiles(id) on delete cascade,
  organization text,
  bio text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected')),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  scout_since date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger scouts_set_updated_at
  before update on public.scouts
  for each row execute function public.set_updated_at();

-- Scouts can update their own row, but never their own verification_status —
-- that's an admin/service_role-only action (mirrors profiles.role immutability).
create or replace function public.prevent_verification_self_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status <> old.verification_status and auth.uid() = old.id then
    raise exception 'verification_status can only be changed by an admin';
  end if;
  return new;
end;
$$;

create trigger scouts_verification_lock
  before update on public.scouts
  for each row execute function public.prevent_verification_self_change();

create or replace function public.is_verified_scout(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.scouts where id = uid and verification_status = 'verified'
  );
$$;

create table public.admins (
  id uuid primary key references public.profiles(id) on delete cascade,
  admin_level text not null default 'moderator' check (admin_level in ('moderator','superadmin')),
  created_at timestamptz not null default now()
);

alter table public.scouts enable row level security;
alter table public.admins enable row level security;

create policy scouts_select_self on public.scouts for select
  using (auth.uid() = id);
create policy scouts_select_public on public.scouts for select
  to authenticated using (true);
create policy scouts_update_self on public.scouts for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- admins: RLS enabled, zero policies — deliberately unreachable from
-- anon/authenticated. Only service_role (SQL editor, a future admin tool)
-- can read or write this table.
