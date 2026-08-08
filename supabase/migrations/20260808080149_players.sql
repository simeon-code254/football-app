-- Player extension row. A skeleton row is inserted by handle_new_user()
-- (next migration but one) at signup; profile-complete.tsx then UPDATEs it
-- across its 4 steps — never INSERTs — which is why there's no insert
-- policy for `authenticated` below (only the SECURITY DEFINER trigger
-- function can insert, bypassing RLS).

create table public.players (
  id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date,
  gender text check (gender in ('Male','Female','Prefer not to say')),
  nationality_code text references public.countries(code),
  primary_position position_code,
  secondary_position position_code,
  is_goalkeeper boolean generated always as (primary_position = 'GK') stored,
  preferred_foot text check (preferred_foot in ('Right','Left','Both')),
  height_cm smallint,
  weight_kg smallint,
  club text,
  jersey_number smallint,
  years_playing smallint,
  bio text check (char_length(bio) <= 500),
  instagram_handle text,
  youtube_url text,
  tiktok_handle text,
  facebook_url text,
  overall_rating numeric(5,2),
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

alter table public.players enable row level security;

create policy players_select_self on public.players for select
  using (auth.uid() = id);
-- Scouts (and other players) need broad browse access for Discover/leaderboard
-- screens; verification gates messaging/trials, not browsing.
create policy players_select_public on public.players for select
  to authenticated using (true);
create policy players_update_self on public.players for update
  using (auth.uid() = id) with check (auth.uid() = id);
