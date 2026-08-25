-- Clubs: the third role.
--
-- The design canvas offers Player / Scout / Club on the very first screen a
-- user sees (screen 03), and gives clubs nine screens of their own -- a
-- dashboard, an applicant pipeline, a scouting team with seats, a public
-- profile. None of that had a table behind it: `club` was a free-text column on
-- players and trials, and profiles.role only permitted player/scout/admin, so
-- choosing Club in the UI would have silently created a Player.
--
-- This mirrors the scouts table deliberately rather than inventing a new shape.
-- A club is the same kind of thing as a scout as far as the database is
-- concerned: an ID-checked account that may look at minors. Reusing the
-- verification_status vocabulary means the existing admin flow, the existing
-- self-change lock and the existing RLS idiom all carry over unchanged.

-- 1. profiles.role gains 'club'.
--
-- Dropping and re-adding is the only way to widen a check constraint. The
-- prevent_role_change() trigger already stops anyone moving between roles
-- after the fact, so widening the set does not let an existing account become
-- a club.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('player','scout','club','admin'));

create table public.clubs (
  id uuid primary key references public.profiles(id) on delete cascade,
  name text,
  crest_path text,
  about text,
  city text,
  league text,
  founded int check (founded is null or (founded between 1850 and extract(year from now())::int)),
  -- The league registration number an admin checks before granting the gold
  -- badge. Nullable because it is collected during verification, not signup.
  registration_no text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected')),
  verification_notes text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clubs_set_updated_at
  before update on public.clubs
  for each row execute function public.set_updated_at();

-- Same lock as scouts: a club can edit its own row but never its own
-- verification_status. Reuses the existing function, which keys off
-- auth.uid() = old.id and is therefore table-agnostic.
create trigger clubs_verification_lock
  before update on public.clubs
  for each row execute function public.prevent_verification_self_change();

create or replace function public.is_verified_club(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clubs where id = uid and verification_status = 'verified'
  );
$$;

-- 2. Club scouting team -- the "5 seats · 2 free" model on canvas screen 53.
--
-- A member is a profile (a scout account) attached to a club, not a new kind of
-- user. `seat_limit` lives on the club rather than being hardcoded so a plan
-- change is a data change.
alter table public.clubs add column seat_limit int not null default 5
  check (seat_limit between 1 and 100);

create table public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'scout' check (member_role in ('admin','scout')),
  status text not null default 'invited' check (status in ('invited','active','removed')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  -- One row per person per club. Re-inviting someone updates the existing row.
  unique (club_id, profile_id)
);

create index club_members_club_idx on public.club_members (club_id) where status <> 'removed';
create index club_members_profile_idx on public.club_members (profile_id) where status = 'active';

-- Seats are enforced in the database, not in the client. A club that could
-- exceed its seat limit by racing two invites through two devices would be a
-- billing hole, and the UI cannot close it.
create or replace function public.enforce_club_seat_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit int;
  v_used int;
begin
  if new.status = 'removed' then
    return new;
  end if;

  select seat_limit into v_limit from public.clubs where id = new.club_id;

  select count(*) into v_used
  from public.club_members
  where club_id = new.club_id
    and status <> 'removed'
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_used >= v_limit then
    raise exception 'club % has no seats left (limit %)', new.club_id, v_limit;
  end if;

  return new;
end;
$$;

create trigger club_members_seat_limit
  before insert or update on public.club_members
  for each row execute function public.enforce_club_seat_limit();

-- 3. Trials can belong to a club.
--
-- Nullable and additive: every existing trial keeps its scout_id and nothing
-- about the scout flow changes. A club-posted trial carries both -- club_id for
-- ownership and scout_id for the person who actually posted it.
alter table public.trials add column club_id uuid references public.clubs(id) on delete cascade;
create index trials_club_idx on public.trials (club_id) where club_id is not null;

-- 4. A verified club sees players on the same terms as a verified scout.
--
-- Canvas screen 03 states the rule the app must keep: "Scouts and clubs are
-- ID-checked before they can see under-18 players." These helpers are what the
-- existing policies gate on, so extending access means extending them rather
-- than rewriting a dozen policies.
create or replace function public.is_verified_scout(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.scouts where id = uid and verification_status = 'verified'
  ) or exists (
    select 1 from public.clubs where id = uid and verification_status = 'verified'
  );
$$;

comment on function public.is_verified_scout(uuid) is
  'True for a verified scout OR a verified club. Named for scouts because that
   is what every existing policy calls; it answers "may this account see
   players, including minors?", which both ID-checked roles may.';

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;

-- A club profile is public: players browse clubs and apply to their trials.
create policy clubs_select_public on public.clubs for select
  to authenticated using (true);
create policy clubs_update_self on public.clubs for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Members are visible to the club itself and to the member. Not public: the
-- canvas shows a club's team only inside the club workspace.
create policy club_members_select_own_club on public.club_members for select
  using (
    auth.uid() = club_id
    or auth.uid() = profile_id
  );

-- Only the club account manages its own seats.
create policy club_members_write_own_club on public.club_members for all
  using (auth.uid() = club_id) with check (auth.uid() = club_id);

-- 5. Signup creates the club row, mirroring the scout branch.
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
  elsif v_role = 'club' then
    -- The club's display name comes in as organization, the same field the
    -- signup form already collects for scouts.
    insert into public.clubs (id, name)
    values (new.id, coalesce(new.raw_user_meta_data->>'organization',
                             new.raw_user_meta_data->>'full_name'));
  else
    insert into public.players (id) values (new.id);
  end if;

  return new;
end;
$$;

-- enforce_club_seat_limit() is a trigger function. Postgres refuses a direct
-- call anyway ("can only be called as a trigger"), but it should not be
-- reachable on /rest/v1/rpc at all -- an exposed SECURITY DEFINER symbol is
-- surface with no upside. Flagged by the Supabase security advisor after this
-- migration was first applied.
revoke execute on function public.enforce_club_seat_limit() from anon, authenticated;
