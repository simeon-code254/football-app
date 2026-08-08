-- EAV-shaped scores (not JSONB, not columns-per-attribute): applies_to on
-- attribute_definitions enforces outfield-vs-goalkeeper without duplicated
-- CHECK constraints, and it supports per-attribute confidence/source/history
-- cleanly. `confidence` lives directly here since it's an AI-pipeline output
-- produced in the same write as the value, sharing its lifecycle 1:1.

create table public.player_attribute_scores (
  player_id uuid not null references public.players(id) on delete cascade,
  attribute_id smallint not null references public.attribute_definitions(id),
  value smallint not null check (value between 0 and 99),
  confidence text not null check (confidence in ('High','Medium','Low')),
  source_video_id uuid references public.videos(id),
  job_id uuid references public.video_analysis_jobs(id),
  updated_at timestamptz not null default now(),
  primary key (player_id, attribute_id)
);

create table public.player_attribute_score_history (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  attribute_id smallint not null,
  value smallint not null,
  confidence text not null,
  source_video_id uuid,
  job_id uuid,
  recorded_at timestamptz not null default now()
);

create index player_attribute_score_history_lookup
  on public.player_attribute_score_history (player_id, attribute_id, recorded_at desc);

create or replace function public.append_attribute_score_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.player_attribute_score_history
    (player_id, attribute_id, value, confidence, source_video_id, job_id)
  values (new.player_id, new.attribute_id, new.value, new.confidence, new.source_video_id, new.job_id);
  return new;
end;
$$;

create trigger trg_append_history
  after insert or update on public.player_attribute_scores
  for each row execute function public.append_attribute_score_history();

-- Keeps players.overall_rating as a real, indexable column (Discover/
-- leaderboard screens sort by it) instead of an expensive per-query
-- aggregate over the EAV table.
create or replace function public.recalc_player_overall()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_player_id uuid := coalesce(new.player_id, old.player_id);
begin
  update public.players
    set overall_rating = (
      select round(avg(value)::numeric, 2)
      from public.player_attribute_scores
      where player_id = v_player_id
    )
  where id = v_player_id;
  return null;
end;
$$;

create trigger trg_recalc_overall
  after insert or update or delete on public.player_attribute_scores
  for each row execute function public.recalc_player_overall();

alter table public.player_attribute_scores enable row level security;
alter table public.player_attribute_score_history enable row level security;

-- AI Ratings / AI Analysis tabs are visible to anyone signed in — public
-- performance data. No write policy: service_role only (see header note).
create policy scores_select_all on public.player_attribute_scores
  for select to authenticated using (true);

create policy history_select_own_or_admin on public.player_attribute_score_history
  for select using (player_id = auth.uid() or public.is_admin());
