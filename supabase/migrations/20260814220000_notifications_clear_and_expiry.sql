-- Lets a signed-in user actually delete their own notification rows --
-- previously only select and update(read_at) existed, so "clear" had no
-- real backend path at all; the trash icon would have had nothing to call.
create policy notifications_delete_own on public.notifications for delete
  using (profile_id = auth.uid());

-- Auto-expiry: a notification nobody ever manually clears still disappears
-- on its own after 72h, so the table can never grow unbounded purely by
-- staying unread -- same "nothing accumulates forever" standard already
-- applied to messages/videos/players pagination this session, just via
-- actual deletion instead of a query-time filter (a hidden-but-still-there
-- row would silently re-introduce the exact unbounded-growth problem this
-- project has spent this session eliminating everywhere else).
create extension if not exists pg_cron with schema extensions;

create or replace function public.delete_stale_notifications()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.notifications where created_at < now() - interval '72 hours';
end;
$$;

-- cron.schedule() with a job name that already exists updates that job in
-- place rather than erroring, so this migration stays safe to review even
-- though it can never actually re-run against the same database.
select cron.schedule('delete-stale-notifications', '0 * * * *', $$select public.delete_stale_notifications();$$);
