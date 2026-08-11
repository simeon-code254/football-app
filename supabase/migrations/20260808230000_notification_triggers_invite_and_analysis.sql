-- Two events the UI already implies should notify someone, but had no
-- trigger at all: a scout inviting a player to a trial (inviteToTrial()
-- does a raw INSERT into trial_applications with source='invited' --
-- the existing trial_applications_notify trigger only fires on UPDATE OF
-- status, never on INSERT), and an AI analysis job finishing (a player who
-- uploaded for AI Analysis had no way to find out their rating was ready
-- short of manually re-checking their profile).

create or replace function public.notify_trial_invitation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_trial_title text;
begin
  if new.source <> 'invited' then
    return new;
  end if;
  select title into v_trial_title from public.trials where id = new.trial_id;
  insert into public.notifications (profile_id, type, title, body, data)
  values (
    new.player_id, 'trial_invitation',
    'Trial invitation',
    format('You''ve been invited to apply for "%s".', coalesce(v_trial_title, 'a trial')),
    jsonb_build_object('trial_id', new.trial_id)
  );
  return new;
end;
$$;

create trigger trial_applications_notify_invite
  after insert on public.trial_applications
  for each row execute function public.notify_trial_invitation();

create or replace function public.notify_analysis_job_done()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status or new.status not in ('completed', 'failed') then
    return new;
  end if;

  if new.status = 'failed' then
    insert into public.notifications (profile_id, type, title, body, data)
    values (
      new.player_id, 'analysis_failed', 'AI analysis failed',
      coalesce(new.error, 'Something went wrong analyzing your video.'),
      jsonb_build_object('video_id', new.video_id, 'job_id', new.id)
    );
  elsif new.result_summary ->> 'skipped_reason' is not null then
    -- e.g. a goalkeeper video in this phase -- processed, but genuinely
    -- has no scores written; an honest "done, nothing to show yet", not a
    -- fabricated success.
    insert into public.notifications (profile_id, type, title, body, data)
    values (
      new.player_id, 'analysis_skipped', 'Video processed',
      'Your video was processed, but this phase doesn''t score this type of clip yet.',
      jsonb_build_object('video_id', new.video_id, 'job_id', new.id)
    );
  else
    insert into public.notifications (profile_id, type, title, body, data)
    values (
      new.player_id, 'analysis_complete', 'Your AI ratings are ready',
      'Real Pace and Physical scores from your upload are on your profile now.',
      jsonb_build_object('video_id', new.video_id, 'job_id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger video_analysis_jobs_notify
  after update of status on public.video_analysis_jobs
  for each row execute function public.notify_analysis_job_done();
