-- User blocking. Both Apple and Google require any app with user-generated
-- content to let people block, not just report -- Matobev has had Report at
-- three entry points since the moderation pass but no way to block at all,
-- which is a hard store-review rejection.
--
-- It also matters here beyond compliance: this app connects adults
-- (scouts) with players who are frequently minors, in a market with a
-- documented history of fake scouts. "Stop this specific person contacting
-- me" is a safety control, not a nicety, and it must work without waiting
-- for an admin to action a report.
create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  -- Blocking yourself is meaningless and would silently break the feed
  -- filters below, which exclude blocked ids from results.
  constraint blocked_users_not_self check (blocker_id <> blocked_id)
);

-- Feed/list filtering reads "who have I blocked" on nearly every query, so
-- the blocker_id half of the PK index is the hot path; this covers the
-- reverse lookup ("who blocked me") used when deciding whether a scout may
-- open a conversation.
create index blocked_users_blocked_idx on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

-- Entirely private to the blocker. Deliberately NO policy letting the
-- blocked party read rows about themselves: someone learning they have
-- been blocked is exactly the trigger for retaliation or a second account,
-- which is the opposite of what a safety control should do.
create policy blocked_users_select_own on public.blocked_users for select
  using (blocker_id = auth.uid());
create policy blocked_users_insert_own on public.blocked_users for insert
  with check (blocker_id = auth.uid());
create policy blocked_users_delete_own on public.blocked_users for delete
  using (blocker_id = auth.uid());

-- Admins need visibility for moderation, matching reports_select_admin.
create policy blocked_users_select_admin on public.blocked_users for select
  using (public.is_admin());

-- Blocking must actually stop contact, not just hide content. A scout
-- opening a conversation is the one write path that reaches across the
-- block, so it is enforced in the database rather than trusted to the
-- client -- consistent with how is_verified_scout() already gates
-- conversation creation.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

-- Tighten conversation creation to respect blocks. The existing policy
-- (20260808080228) only required a verified scout; a blocked scout could
-- still open a brand new thread with the person who blocked them, which
-- makes the block worthless for the case it most needs to cover.
drop policy conversations_insert_verified_scout on public.conversations;

create policy conversations_insert_verified_scout on public.conversations for insert
  with check (
    scout_id = auth.uid()
    and public.is_verified_scout()
    and not public.is_blocked_between(auth.uid(), player_id)
  );

-- Same for messages into an existing thread: a block placed AFTER a
-- conversation already existed must stop further messages, not just
-- prevent new threads.
drop policy messages_insert_participant on public.messages;

create policy messages_insert_participant on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.scout_id = auth.uid() or c.player_id = auth.uid())
        and not public.is_blocked_between(c.scout_id, c.player_id)
    )
  );
