-- The AI analysis service needs to learn about newly-queued jobs without an
-- inbound public endpoint (it's a local-dev process, not a hosted webhook
-- target) — a Realtime subscription over an outbound connection is the fit.
-- Only messages/notifications were enabled before this.

alter publication supabase_realtime add table public.video_analysis_jobs;
