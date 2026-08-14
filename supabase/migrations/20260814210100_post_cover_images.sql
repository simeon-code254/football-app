-- News posts and trials are currently text-only. Adds an optional cover
-- image, admin-authored content only -- a scout's own trial can carry one
-- too (trials.cover_image_path is generic, not admin-restricted at the
-- column level), but the admin CRUD is the first real writer.
alter table public.news_posts add column cover_image_path text;
alter table public.trials add column cover_image_path text;

-- Public bucket: news/trial cover images are editorial content already
-- readable by any authenticated user via the base tables' own RLS
-- (news_posts_select_published, trials_select_all) -- gating storage read
-- behind a signed URL would just add a round trip for content that isn't
-- sensitive. Write stays admin-only (news_posts/trials already both use
-- is_admin() for insert/update; storage mirrors that directly rather than
-- re-deriving it from a table join, since these images aren't scoped to any
-- one row until the insert/update that references them completes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy post_images_public_read on storage.objects for select
  using (bucket_id = 'post-images');

create policy post_images_admin_write on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and public.is_admin());

create policy post_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'post-images' and public.is_admin())
  with check (bucket_id = 'post-images' and public.is_admin());

create policy post_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and public.is_admin());
