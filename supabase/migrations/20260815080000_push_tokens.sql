-- Device push tokens.
--
-- The app already has a full notifications pipeline: a `notifications`
-- table written exclusively by SECURITY DEFINER triggers (trial status
-- changes, invitations, analysis results, moderation actions), plus a
-- Realtime subscription that updates the UI live. All of that only works
-- while the app is OPEN, which is precisely when a notification matters
-- least. Push is what reaches someone who has closed the app -- the single
-- largest retention gap in the product.
--
-- Deliberately keyed on the token, not the profile: one person can install
-- on several devices and should be reachable on all of them, while the same
-- device handed to a different account must not keep receiving the previous
-- user's notifications (hence the upsert-on-token behaviour the client
-- relies on, which reassigns ownership rather than duplicating).
create table public.push_tokens (
  token text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_tokens_profile_idx on public.push_tokens (profile_id);

alter table public.push_tokens enable row level security;

-- A device may only ever register itself against the signed-in account.
create policy push_tokens_insert_own on public.push_tokens for insert
  with check (profile_id = auth.uid());
create policy push_tokens_update_own on public.push_tokens for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy push_tokens_select_own on public.push_tokens for select
  using (profile_id = auth.uid());
-- Sign-out removes the device so the next person to use that phone does not
-- inherit the previous account's notifications.
create policy push_tokens_delete_own on public.push_tokens for delete
  using (profile_id = auth.uid());

-- Per-type opt-outs. Notification types are free text by design (see
-- 20260808080231), so this stores the types a user has switched OFF rather
-- than enumerating every type -- new notification types then work by
-- default without a migration, and an existing user's preferences are never
-- silently reset.
create table public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  muted_types text[] not null default '{}',
  -- Quiet hours in the user's own local time, stored as minutes past
  -- midnight so the send path needs no timezone parsing. Null disables.
  quiet_from_minute smallint check (quiet_from_minute between 0 and 1439),
  quiet_to_minute smallint check (quiet_to_minute between 0 and 1439),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy notification_prefs_select_own on public.notification_preferences for select
  using (profile_id = auth.uid());
create policy notification_prefs_insert_own on public.notification_preferences for insert
  with check (profile_id = auth.uid());
create policy notification_prefs_update_own on public.notification_preferences for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
