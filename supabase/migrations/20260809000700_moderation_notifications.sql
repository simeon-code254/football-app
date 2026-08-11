-- Every admin moderation action (suspend/reactivate, remove/restore video)
-- now creates a real notification for the affected user, via the same
-- SECURITY DEFINER trigger pattern already used for trial-status/message/
-- verification notifications (20260808080231_notifications.sql) -- not a
-- new insert policy on notifications, the trigger bypasses RLS as owner.
create or replace function public.notify_suspension_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_active = old.is_active then
    return new;
  end if;
  insert into public.notifications (profile_id, type, title, body, data)
  values (
    new.id,
    'account_suspension',
    case when new.is_active then 'Account reactivated' else 'Account suspended' end,
    case
      when new.is_active then 'Your account has been reactivated.'
      when new.suspended_reason is not null then 'Your account has been suspended. Reason: ' || new.suspended_reason
      else 'Your account has been suspended.'
    end,
    jsonb_build_object('is_active', new.is_active)
  );
  return new;
end;
$$;

create trigger profiles_notify_suspension
  after update of is_active on public.profiles
  for each row execute function public.notify_suspension_change();

create or replace function public.notify_video_removal_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_removed = old.is_removed then
    return new;
  end if;
  insert into public.notifications (profile_id, type, title, body, data)
  values (
    new.player_id,
    'video_moderation',
    case when new.is_removed then 'Video removed' else 'Video restored' end,
    case
      when new.is_removed and new.removed_reason is not null then
        format('Your video "%s" was removed. Reason: %s', coalesce(new.title, 'Untitled'), new.removed_reason)
      when new.is_removed then
        format('Your video "%s" was removed.', coalesce(new.title, 'Untitled'))
      else
        format('Your video "%s" has been restored.', coalesce(new.title, 'Untitled'))
    end,
    jsonb_build_object('video_id', new.id, 'is_removed', new.is_removed)
  );
  return new;
end;
$$;

create trigger videos_notify_removal
  after update of is_removed on public.videos
  for each row execute function public.notify_video_removal_change();
