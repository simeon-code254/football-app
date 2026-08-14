-- Supports the mobile app's move from unbounded list fetches to paginated
-- ones (notifications, chat threads/inbox, open trials, my applications,
-- my videos, video comments) — every one of these filters/sorts on a column
-- that had no supporting index (foreign keys are NOT auto-indexed in
-- Postgres), so pagination alone wouldn't have fixed the slow-query part of
-- the problem, just the payload-size part.

create index if not exists notifications_profile_created_idx
  on public.notifications (profile_id, created_at desc);

create index if not exists trials_status_date_idx
  on public.trials (status, trial_date);

create index if not exists trials_scout_created_idx
  on public.trials (scout_id, created_at desc);

-- trial_applications already has a unique(trial_id, player_id) index, which
-- covers trial_id-leading lookups (listApplicants) -- this adds the missing
-- player_id-leading side (getMyApplications).
create index if not exists trial_applications_player_applied_idx
  on public.trial_applications (player_id, applied_at desc);

create index if not exists videos_player_created_idx
  on public.videos (player_id, created_at desc);

create index if not exists video_comments_video_created_idx
  on public.video_comments (video_id, created_at);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- Computes each conversation's inbox preview (last message + unread count)
-- server-side instead of the client downloading every message in every
-- conversation just to reduce it locally -- that pattern gets worse with
-- every message anyone ever sends, compounded across every conversation in
-- the inbox at once.
--
-- Deliberately NOT security definer: this runs as the calling user, so the
-- existing messages_select_participant RLS policy still applies inside the
-- lateral subqueries below. Passing a conversation_id the caller isn't a
-- participant of simply yields a null/zero row for it, never someone else's
-- message content -- the same "no policy grants this" guarantee as every
-- other table in this schema, not a special case for this function.
create or replace function public.conversation_previews(p_conversation_ids uuid[])
returns table (
  conversation_id uuid,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
stable
set search_path = public
as $$
  select
    conv.id as conversation_id,
    lm.body as last_message,
    lm.created_at as last_message_at,
    coalesce(uc.unread_count, 0) as unread_count
  from unnest(p_conversation_ids) as conv(id)
  left join lateral (
    select m.body, m.created_at
    from public.messages m
    where m.conversation_id = conv.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*) as unread_count
    from public.messages m
    where m.conversation_id = conv.id
      and m.sender_id <> auth.uid()
      and m.read_at is null
  ) uc on true;
$$;

grant execute on function public.conversation_previews(uuid[]) to authenticated;
