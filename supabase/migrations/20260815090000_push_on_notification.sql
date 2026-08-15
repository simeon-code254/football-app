-- Fires the send-push edge function whenever a notification row is created.
--
-- The dashboard's own "Database Webhooks" UI cannot do this on this
-- project: it generates a trigger calling supabase_functions.http_request(),
-- and that schema does not exist here (confirmed directly -- creating a hook
-- fails with 3F000 schema "supabase_functions" does not exist). Building the
-- trigger on pg_net instead avoids that dependency entirely, and has the
-- advantage of living in version control rather than in dashboard state
-- nobody can review or reproduce.
create extension if not exists pg_net with schema extensions;

-- The shared secret is NOT stored here. It lives in Supabase Vault under
-- the name 'push_webhook_secret' so this migration stays committable; the
-- function reads it at call time. If the secret is missing the trigger
-- simply does nothing rather than sending an unauthenticated request that
-- the edge function would reject anyway.
create or replace function public.notify_push_on_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_secret text;
  v_url text := 'https://qefovzbhnmdhbqldtptc.supabase.co/functions/v1/send-push';
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'push_webhook_secret'
   limit 1;

  if v_secret is null then
    return null;
  end if;

  -- net.http_post QUEUES the request and returns immediately -- it does not
  -- wait for the HTTP response. That property is the whole reason this is
  -- safe to run from a trigger: a slow or failing push service can never
  -- delay or roll back the notification insert itself.
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', new.id,
        'profile_id', new.profile_id,
        'type', new.type,
        'title', new.title,
        'body', new.body,
        'data', new.data
      )
    )
  );

  return null;
exception
  -- Push is a best-effort side channel. A notification must still be
  -- written and visible in-app even if the send path is broken, so any
  -- failure here is swallowed deliberately rather than surfaced.
  when others then
    return null;
end;
$$;

-- AFTER INSERT only. Firing on UPDATE would re-send a push every time a
-- notification is marked as read, which is the most common update there is.
create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.notify_push_on_notification();
