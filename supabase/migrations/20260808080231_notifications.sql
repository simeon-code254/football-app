-- No client insert/delete policy: rows are created exclusively by
-- SECURITY DEFINER trigger functions below, which bypass RLS as the
-- function owner regardless of who's calling.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications for select
  using (profile_id = auth.uid());
create policy notifications_update_own on public.notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Trial status change -> notify the applying player.
create or replace function public.notify_application_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_trial_title text;
begin
  if new.status = old.status then
    return new;
  end if;
  select title into v_trial_title from public.trials where id = new.trial_id;
  insert into public.notifications (profile_id, type, title, body, data)
  values (
    new.player_id, 'trial_status_change',
    'Trial application update',
    format('Your application for "%s" is now %s.', v_trial_title, new.status),
    jsonb_build_object('trial_id', new.trial_id, 'status', new.status)
  );
  return new;
end;
$$;

create trigger trial_applications_notify
  after update of status on public.trial_applications
  for each row execute function public.notify_application_status_change();

-- New message -> notify the other conversation participant.
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conv record;
  v_recipient uuid;
begin
  select * into v_conv from public.conversations where id = new.conversation_id;
  v_recipient := case when new.sender_id = v_conv.scout_id then v_conv.player_id else v_conv.scout_id end;
  insert into public.notifications (profile_id, type, title, body, data)
  values (
    v_recipient, 'new_message', 'New message',
    left(new.body, 140),
    jsonb_build_object('conversation_id', new.conversation_id)
  );
  return new;
end;
$$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- Scout verification flips -> notify the scout.
create or replace function public.notify_verification_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status = old.verification_status then
    return new;
  end if;
  insert into public.notifications (profile_id, type, title, body, data)
  values (
    new.id, 'scout_verification',
    'Verification update',
    format('Your scout verification is now %s.', new.verification_status),
    jsonb_build_object('verification_status', new.verification_status)
  );
  return new;
end;
$$;

create trigger scouts_notify_verification
  after update of verification_status on public.scouts
  for each row execute function public.notify_verification_change();
