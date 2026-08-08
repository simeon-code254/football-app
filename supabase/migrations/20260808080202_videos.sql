-- Player video uploads. `upload_intent` maps to the RN Upload screen's
-- Highlight-Reel-vs-AI-Analysis toggle; highlight_only clips never enter the
-- (future) CV pipeline.

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  title text,
  description text,
  match_name text,
  opponent text,
  tags text[] not null default '{}',
  upload_intent text not null check (upload_intent in ('highlight_only','ai_analysis')),
  status text not null default 'uploaded' check (status in ('uploaded','processing','ready','failed')),
  duration_seconds int,
  view_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

create policy videos_select_own on public.videos for select
  using (player_id = auth.uid());
create policy videos_select_ready_public on public.videos for select
  to authenticated using (status = 'ready');
create policy videos_insert_own on public.videos for insert
  with check (player_id = auth.uid());
create policy videos_update_own on public.videos for update
  using (player_id = auth.uid());
create policy videos_delete_own on public.videos for delete
  using (player_id = auth.uid());
