-- Backfill for trials-as-news (20260815020000).
--
-- Second instance of the same bug class as 20260815050000: that migration
-- added a trigger-maintained derived row (one news_posts row per trial)
-- but never created rows for trials that already existed. The trigger is
-- `after insert or update on trials`, so a trial created before the
-- migration was applied -- and never edited since -- silently never
-- appears in the news feed or popup at all.
--
-- Verified live before writing this, not assumed: both trials in the
-- project ("test trial" created 2026-08-13, "matobev trial" created
-- 2026-08-15 06:27) had zero matching news_posts rows, because both
-- predate the migration actually being pushed. The trigger itself is
-- correct -- this is purely the missing backfill.
--
-- Deliberately NOT backfilled with `update trials set ...` to fire the
-- existing trigger: trials carries its own trials_set_updated_at trigger,
-- so a no-op update would falsely mark every historical trial as just
-- edited. Instead the sync body is extracted into a plain callable
-- function (same approach as recalc_player_overall_for), so the trigger
-- and the backfill share one definition and cannot drift apart.
--
-- One real behavior change, and the reason it belongs here: published_at
-- now uses the trial's own created_at rather than now(). For a genuinely
-- new trial these are the same instant, so nothing changes in practice --
-- but without it, the two backfilled trials below would claim to have
-- been published today rather than when they were actually created, which
-- would be a visibly wrong date in the news feed. published_at stays out
-- of the ON CONFLICT update list exactly as before, so re-running this
-- never rewrites an existing post's date.

create or replace function public.sync_trial_news_post_for(t public.trials)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.news_posts (title, body, author_id, cover_image_path, is_published, published_at, trial_id)
  values (
    -- left(...) guards against news_posts' own 200/5000-char check
    -- constraints -- trials.title/description have no length limit of
    -- their own, so an unusually long one must never be able to fail the
    -- trial insert/update itself (this runs in the same transaction).
    left('New trial: ' || t.title, 200),
    left(
      t.club || ' — ' || t.location || E'\n\nTrial date: ' || to_char(t.trial_date, 'DD Mon YYYY') ||
        E'\nApply before: ' || to_char(t.application_deadline, 'DD Mon YYYY') ||
        case when t.description is not null and t.description <> '' then E'\n\n' || t.description else '' end,
      5000
    ),
    t.scout_id,
    t.cover_image_path,
    t.status = 'open',
    t.created_at,
    t.id
  )
  on conflict (trial_id) where trial_id is not null do update set
    title = excluded.title,
    body = excluded.body,
    cover_image_path = excluded.cover_image_path,
    -- is_published tracks trial status: a closed/cancelled trial stops
    -- showing as a recruiting opportunity without deleting its history.
    is_published = excluded.is_published;
end;
$$;

-- Identical behavior to before, single definition of the sync body.
create or replace function public.sync_trial_news_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_trial_news_post_for(new);
  return new;
end;
$$;

-- One-time backfill. Idempotent via the same ON CONFLICT the trigger uses,
-- so re-running is safe and will not duplicate posts.
do $$
declare r public.trials;
begin
  for r in select * from public.trials loop
    perform public.sync_trial_news_post_for(r);
  end loop;
end $$;
