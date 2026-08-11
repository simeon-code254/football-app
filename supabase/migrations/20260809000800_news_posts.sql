-- Admin-authored news/announcements. Any authenticated user can read
-- published posts (no mobile screen consumes this yet -- built for the
-- admin side now, same "ready when the mobile UI exists" reasoning as the
-- reports queue).
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 200),
  body text not null check (char_length(body) <= 5000),
  author_id uuid references public.profiles(id) on delete set null,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index news_posts_published_idx on public.news_posts (is_published, published_at desc);

create trigger news_posts_set_updated_at
  before update on public.news_posts
  for each row execute function public.set_updated_at();

alter table public.news_posts enable row level security;

create policy news_posts_select_published on public.news_posts for select
  to authenticated using (is_published);
create policy news_posts_select_admin on public.news_posts for select
  using (public.is_admin());
create policy news_posts_insert_admin on public.news_posts for insert
  with check (public.is_admin() and author_id = auth.uid());
create policy news_posts_update_admin on public.news_posts for update
  using (public.is_admin()) with check (public.is_admin());
create policy news_posts_delete_admin on public.news_posts for delete
  using (public.is_admin());
