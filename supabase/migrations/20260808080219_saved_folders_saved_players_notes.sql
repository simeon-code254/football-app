-- Save-to-folder (spec §21) and private Scout Notes (spec §22). Folders are
-- a first-class, renameable entity per scout (the RN UI has a "Create New
-- Folder" affordance), so this is a real join table, not a text column that
-- would need fanout updates on rename. Notes is a separate table from
-- saved_players since the Notes modal is opened independently of Save in the
-- UI and holds one evolving blob per (scout, player), not folder membership.

create table public.saved_player_folders (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (scout_id, name)
);

-- New scouts get the 4 folders the mockup already shows, so the Save modal
-- isn't empty on day one.
create or replace function public.seed_default_folders()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.saved_player_folders (scout_id, name, is_default) values
    (new.id, 'Favorites', true),
    (new.id, 'U21 Prospects', true),
    (new.id, 'Wingers', true),
    (new.id, 'Potential Signings', true);
  return new;
end;
$$;

create trigger scouts_seed_default_folders
  after insert on public.scouts
  for each row execute function public.seed_default_folders();

create table public.saved_players (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  folder_id uuid references public.saved_player_folders(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (scout_id, player_id)
);

create table public.scout_notes (
  scout_id uuid not null references public.scouts(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (scout_id, player_id)
);

create trigger scout_notes_set_updated_at
  before update on public.scout_notes
  for each row execute function public.set_updated_at();

alter table public.saved_player_folders enable row level security;
alter table public.saved_players enable row level security;
alter table public.scout_notes enable row level security;

-- All three: fully private to the owning scout. Note in particular that
-- scout_notes has NO player-facing read policy at all — that's what makes
-- "Private — players can't see these" true at the database layer, not just
-- hidden in the UI.
create policy folders_own on public.saved_player_folders for all
  using (scout_id = auth.uid()) with check (scout_id = auth.uid());
create policy saved_players_own on public.saved_players for all
  using (scout_id = auth.uid()) with check (scout_id = auth.uid());
create policy scout_notes_own on public.scout_notes for all
  using (scout_id = auth.uid()) with check (scout_id = auth.uid());
