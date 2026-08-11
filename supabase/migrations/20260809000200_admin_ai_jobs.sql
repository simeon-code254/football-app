-- No admin visibility or write path into video_analysis_jobs at all today.
-- The requeue policy is intentionally narrow -- USING only matches rows
-- already 'failed', WITH CHECK only allows the new row to be 'queued' -- an
-- admin can never set status directly to 'completed' or touch
-- result_summary, preserving the guarantee documented in the table's
-- original migration (20260808080206_video_analysis_jobs.sql): "no player
-- can fake a completed analysis job." Mirrors ai-service's own
-- reap_stale_processing() startup self-heal (ai-service/src/jobs.py), which
-- does the same kind of processing->queued reset and likewise only touches
-- `status` (and started_at) -- the admin action here should do the same,
-- i.e. `update video_analysis_jobs set status = 'queued' where id = ...`
-- and nothing else. Pickup is via ai-service's poll_loop (every
-- POLL_INTERVAL_SECONDS, default 120s) -- its realtime_listener only
-- subscribes to INSERT, not UPDATE, so a requeue is not instant.
create policy jobs_select_admin on public.video_analysis_jobs for select
  using (public.is_admin());

create policy jobs_requeue_admin on public.video_analysis_jobs for update
  using (public.is_admin() and status = 'failed')
  with check (public.is_admin() and status = 'queued');
