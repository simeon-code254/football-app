-- Trials "pop as news": unifies scout-created trials into the same
-- news_posts feed/popup mechanism players and scouts already see
-- (NewsPopup, app/news.tsx both just query news_posts) -- zero new
-- client-side merge logic needed. A security-definer trigger is the only
-- non-admin writer to this table; news_posts_insert/update_admin stay
-- admin-only for direct client writes, unchanged. Same pattern as
-- queue_ai_analysis_job().
alter table public.news_posts add column trial_id uuid references public.trials(id) on delete cascade;

-- Partial unique index (not a plain unique constraint) since admin-authored
-- posts have trial_id = null and there can be many of those -- Postgres
-- unique constraints already treat every NULL as distinct, but a partial
-- index expresses the real intent (one synced post per trial) directly and
-- is what ON CONFLICT below targets.
create unique index news_posts_trial_id_unique on public.news_posts (trial_id) where trial_id is not null;

create or replace function public.sync_trial_news_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.news_posts (title, body, author_id, cover_image_path, is_published, published_at, trial_id)
  values (
    -- left(...) guards against news_posts' own 200/5000-char check
    -- constraints -- trials.title/description have no length limit of
    -- their own, so an unusually long one must never be able to fail the
    -- trial insert/update itself (this trigger runs in the same
    -- transaction).
    left('New trial: ' || new.title, 200),
    left(
      new.club || ' — ' || new.location || E'\n\nTrial date: ' || to_char(new.trial_date, 'DD Mon YYYY') ||
        E'\nApply before: ' || to_char(new.application_deadline, 'DD Mon YYYY') ||
        case when new.description is not null and new.description <> '' then E'\n\n' || new.description else '' end,
      5000
    ),
    new.scout_id,
    new.cover_image_path,
    new.status = 'open',
    now(),
    new.id
  )
  on conflict (trial_id) where trial_id is not null do update set
    title = excluded.title,
    body = excluded.body,
    cover_image_path = excluded.cover_image_path,
    -- is_published tracks trial status: a closed/cancelled trial stops
    -- showing as a recruiting opportunity without deleting its history.
    is_published = excluded.is_published;

  return new;
end;
$$;

-- Fires on both insert (trial just created) and update (edited, cover
-- image attached after creation via the id-first-then-upload pattern, or
-- status changed to closed/cancelled) -- trial deletion is handled by the
-- trial_id foreign key's own on delete cascade, no trigger needed for that.
create trigger trials_sync_news_post
  after insert or update on public.trials
  for each row execute function public.sync_trial_news_post();
