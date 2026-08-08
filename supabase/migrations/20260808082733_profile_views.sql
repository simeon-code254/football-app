-- Backs three UI numbers that had no data source: player Home's "3 scouts
-- viewed your profile this week", player Profile's "Profile Views (30d)"
-- stat, and scout Home's "Views" overview tile. One append-only log table
-- serves all three via different aggregations (view count is a real signal
-- worth keeping full history for, not just a running counter).

create table public.profile_views (
  id bigint generated always as identity primary key,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_profile_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  check (viewer_id <> viewed_profile_id)
);

create index profile_views_viewed_lookup on public.profile_views (viewed_profile_id, viewed_at desc);
create index profile_views_viewer_lookup on public.profile_views (viewer_id, viewed_at desc);

alter table public.profile_views enable row level security;

-- Log your own view of someone else's profile.
create policy profile_views_insert_self on public.profile_views for insert
  with check (viewer_id = auth.uid());
-- See who viewed you, or your own view history — never a third party's.
create policy profile_views_select_own on public.profile_views for select
  using (viewer_id = auth.uid() or viewed_profile_id = auth.uid());
