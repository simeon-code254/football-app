-- Tell a player when a scout looks at their profile.
--
-- Every notification type in the app so far is transactional -- a trial
-- invitation, an analysis result, a message, a moderation action. All of them
-- say "something you did has finished". None of them say "someone is
-- interested in you", which for a scouting app is the entire emotional loop
-- and the single strongest reason a young player opens the app again.
--
-- The data has been collected since 20260808082733 and never surfaced: every
-- scout opening a player's profile already writes a profile_views row.
--
-- THREE DELIBERATE CONSTRAINTS
--
-- 1. The scout is never named, and viewer_id is deliberately NOT put in the
--    notification payload. Naming them would expose one club's interest to
--    whoever the player tells, invites players to contact scouts directly
--    around the app's own messaging, and -- since most players here are
--    minors -- creates a contact path nobody has vetted. "A scout" is the
--    honest and safe amount of detail.
--
-- 2. At most one per player per day. profile_views already dedupes per
--    (viewer, player, day), but ten scouts browsing a list would still be ten
--    notifications. One a day is a reason to come back; ten is a reason to
--    turn notifications off.
--
-- 3. Only scout viewers, only player recipients. A player viewing another
--    player must never produce "a scout viewed your profile" -- that would be
--    a fabricated signal, which is the one thing this app does not do.
--
-- Mute and quiet hours come for free: send-push filters on
-- notification_preferences.muted_types before sending, so a player can turn
-- this off in settings without losing the in-app record.

create or replace function public.notify_profile_view()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_viewer_role text;
  v_viewed_role text;
begin
  select role into v_viewer_role from public.profiles where id = new.viewer_id;
  select role into v_viewed_role from public.profiles where id = new.viewed_profile_id;

  if v_viewer_role is distinct from 'scout' or v_viewed_role is distinct from 'player' then
    return null;
  end if;

  -- One a day, counted in the recipient's row rather than per viewer.
  if exists (
    select 1 from public.notifications
    where profile_id = new.viewed_profile_id
      and type = 'profile_view'
      and created_at >= date_trunc('day', now())
  ) then
    return null;
  end if;

  insert into public.notifications (profile_id, type, title, body, data)
  values (
    new.viewed_profile_id,
    'profile_view',
    'A scout viewed your profile',
    'Keep your highlights up to date so scouts see your best work.',
    -- No viewer_id. See constraint 1 above; this is load-bearing, not an
    -- omission.
    jsonb_build_object('viewed_at', new.viewed_at)
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_profile_view on public.profile_views;
create trigger trg_notify_profile_view
  after insert on public.profile_views
  for each row execute function public.notify_profile_view();

-- The once-a-day check reads notifications by (profile_id, type, created_at)
-- on every scout profile open, which is one of the hottest write paths in the
-- app. Without this it degrades into a scan of the player's whole
-- notification history as that history grows.
create index if not exists notifications_profile_type_created_idx
  on public.notifications (profile_id, type, created_at desc);
