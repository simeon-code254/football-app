-- Tracks the (future) AI pipeline's processing status per video. No
-- insert/update/delete policy for authenticated/anon at all — service_role
-- (an Edge Function or the AI service) is the only writer. This is the
-- integrity guarantee behind "no player can fake a completed analysis job."

create table public.video_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  result_summary jsonb
);

alter table public.video_analysis_jobs enable row level security;

create policy jobs_select_own on public.video_analysis_jobs for select
  using (player_id = auth.uid());
