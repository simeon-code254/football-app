-- Auto-creates a queued video_analysis_jobs row when a player uploads a
-- video with upload_intent = 'ai_analysis'. video_analysis_jobs has no
-- INSERT policy for authenticated/anon (service_role/the future AI service
-- is the only writer of job status) — this SECURITY DEFINER trigger is the
-- only path that can create the row, so every ai_analysis upload reliably
-- gets a real queued job, never a client-fabricated one.

create or replace function public.queue_ai_analysis_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.upload_intent = 'ai_analysis' then
    insert into public.video_analysis_jobs (video_id, player_id, status)
    values (new.id, new.player_id, 'queued');
  end if;
  return new;
end;
$$;

create trigger videos_queue_ai_analysis
  after insert on public.videos
  for each row execute function public.queue_ai_analysis_job();
