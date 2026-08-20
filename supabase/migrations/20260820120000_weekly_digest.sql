-- A weekly rhythm, and a category a low-rated player can actually win.
--
-- Everything that brings a player back so far is reactive: a scout looked at
-- you, your rating moved. Nothing brings them back on a schedule, and the
-- leaderboard is a live ranking with no moment -- you are 400th today and
-- 400th tomorrow, which is a reason to stop looking.
--
-- Two things fix that together: a snapshot so improvement can be measured at
-- all, and a weekly digest built only from real movement.
--
-- WHY A SNAPSHOT TABLE
--
-- overall_rating is a single mutable column; nothing anywhere records what it
-- used to be. Without history, "most improved" cannot be computed honestly,
-- and most-improved is the one leaderboard category a player rated 18 can top
-- -- which matters, because a global rating board tells the bottom 90% of
-- users they have no reason to come back.

create table if not exists public.player_rating_snapshots (
  player_id uuid not null references public.players(id) on delete cascade,
  week_start date not null,
  overall_rating numeric(5,2),
  primary key (player_id, week_start)
);

alter table public.player_rating_snapshots enable row level security;

-- Readable by signed-in users because the leaderboard's improvement column is
-- built from it; writes happen only inside the SECURITY DEFINER job below, so
-- no insert/update/delete policy exists at all.
create policy rating_snapshots_select on public.player_rating_snapshots
  for select to authenticated using (true);

-- Notified only when something genuinely happened.
--
-- A digest that says "0 views, no change" every Monday is worse than no
-- digest: it is a weekly reminder that nobody is looking, and it trains
-- people to swipe the notification away unread. Players with a quiet week get
-- nothing, which also means the ones who do get it know it means something.
create or replace function public.run_weekly_digest()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_week_start date := date_trunc('week', now())::date;
  v_prev_week date := (date_trunc('week', now()) - interval '7 days')::date;
  v_sent integer := 0;
  r record;
  v_parts text[];
begin
  for r in
    select
      p.id,
      p.overall_rating as now_rating,
      s.overall_rating as then_rating,
      (select count(*) from public.profile_views v
        where v.viewed_profile_id = p.id
          and v.viewed_at >= now() - interval '7 days') as views
    from public.players p
    left join public.player_rating_snapshots s
      on s.player_id = p.id and s.week_start = v_prev_week
  loop
    v_parts := '{}';

    if r.then_rating is not null and r.now_rating is not null
       and round(r.now_rating) > round(r.then_rating) then
      v_parts := v_parts || format('your rating went up %s to %s',
        round(r.now_rating) - round(r.then_rating), round(r.now_rating));
    end if;

    if r.views > 0 then
      v_parts := v_parts || format('%s scout%s viewed your profile',
        r.views, case when r.views = 1 then '' else 's' end);
    end if;

    if array_length(v_parts, 1) > 0 then
      insert into public.notifications (profile_id, type, title, body, data)
      values (
        r.id,
        'weekly_digest',
        'Your week on Matobev',
        initcap(left(array_to_string(v_parts, ', and '), 1))
          || right(array_to_string(v_parts, ', and '), -1) || '.',
        jsonb_build_object('views', r.views, 'overall', round(r.now_rating))
      );
      v_sent := v_sent + 1;
    end if;
  end loop;

  -- Snapshot AFTER the digest, so this week's numbers become next week's
  -- baseline. Doing it first would compare a week against itself and every
  -- delta would be zero forever.
  insert into public.player_rating_snapshots (player_id, week_start, overall_rating)
  select id, v_week_start, overall_rating from public.players
  on conflict (player_id, week_start) do update set overall_rating = excluded.overall_rating;

  return v_sent;
end;
$$;

revoke all on function public.run_weekly_digest() from public, anon, authenticated;

-- Monday 08:00 UTC: 09:00 in Lagos, 11:00 in Nairobi -- morning across the
-- app's actual user base rather than a US-centric hour. Per-user quiet hours
-- still apply in send-push, so this only decides when the row is written.
select cron.schedule(
  'weekly-digest',
  '0 8 * * 1',
  $$select public.run_weekly_digest()$$
);
