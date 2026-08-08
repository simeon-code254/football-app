-- Reels-tab engagement (like/comment/save/share icons + counts, and the
-- view count on the Upload/Profile Videos surfaces) had no schema behind it
-- at all. Denormalized counters live on `videos` (a vertical feed rendering
-- many rows can't afford a live aggregate per row); like/comment/save each
-- get a real table since "who liked/saved/commented" is meaningful data,
-- not just a number. Share has no per-user meaning shown anywhere in the
-- UI (it opens a native share sheet) so it's a plain counter, incremented
-- via RPC same as view_count.

alter table public.videos
  add column like_count int not null default 0,
  add column comment_count int not null default 0,
  add column save_count int not null default 0,
  add column share_count int not null default 0;

create table public.video_likes (
  video_id uuid not null references public.videos(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, profile_id)
);

create table public.video_saves (
  video_id uuid not null references public.videos(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, profile_id)
);

create table public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Keep the denormalized counters in sync on both sides of each engagement table.
create or replace function public.sync_video_engagement_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_video_id uuid := coalesce(new.video_id, old.video_id);
  v_column text := case tg_table_name
    when 'video_likes' then 'like_count'
    when 'video_saves' then 'save_count'
    when 'video_comments' then 'comment_count'
  end;
  v_delta int := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  execute format('update public.videos set %I = greatest(0, %I + $1) where id = $2', v_column, v_column)
    using v_delta, v_video_id;
  return null;
end;
$$;

create trigger video_likes_sync_count
  after insert or delete on public.video_likes
  for each row execute function public.sync_video_engagement_counts();
create trigger video_saves_sync_count
  after insert or delete on public.video_saves
  for each row execute function public.sync_video_engagement_counts();
create trigger video_comments_sync_count
  after insert or delete on public.video_comments
  for each row execute function public.sync_video_engagement_counts();

-- view_count/share_count have no per-user row to key off, so a plain
-- SECURITY DEFINER RPC does the atomic increment instead of a write policy
-- that would otherwise let any authenticated user UPDATE arbitrary columns
-- on a videos row they don't own.
create or replace function public.increment_video_view(p_video_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.videos set view_count = view_count + 1 where id = p_video_id and status = 'ready';
$$;

create or replace function public.increment_video_share(p_video_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.videos set share_count = share_count + 1 where id = p_video_id and status = 'ready';
$$;

alter table public.video_likes enable row level security;
alter table public.video_saves enable row level security;
alter table public.video_comments enable row level security;

-- Likes/saves: visible to anyone (powers the count), but only the acting
-- user's own row is insertable/deletable — this is a toggle, not a form.
create policy video_likes_select_all on public.video_likes for select
  to authenticated using (true);
create policy video_likes_insert_self on public.video_likes for insert
  with check (profile_id = auth.uid());
create policy video_likes_delete_self on public.video_likes for delete
  using (profile_id = auth.uid());

create policy video_saves_select_self on public.video_saves for select
  using (profile_id = auth.uid());
create policy video_saves_insert_self on public.video_saves for insert
  with check (profile_id = auth.uid());
create policy video_saves_delete_self on public.video_saves for delete
  using (profile_id = auth.uid());

create policy video_comments_select_all on public.video_comments for select
  to authenticated using (true);
create policy video_comments_insert_self on public.video_comments for insert
  with check (author_id = auth.uid());
create policy video_comments_delete_own on public.video_comments for delete
  using (author_id = auth.uid());
