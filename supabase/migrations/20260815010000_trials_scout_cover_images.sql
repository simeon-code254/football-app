-- trials.cover_image_path (added in 20260814210100_post_cover_images.sql)
-- has never had a real writer: the post-images bucket's only write
-- policies are admin-only (post_images_admin_write/update/delete), so a
-- scout creating/editing their own trial had no way to ever set a cover
-- image, even though the column and the mobile app's read path
-- (trial/[id].tsx) were already wired up expecting one.
--
-- Path convention matches every other owner-scoped bucket in this project
-- (avatars/{uid}/..., videos/{player_id}/...): a verified scout may write
-- only under their own uid prefix, mirroring trials_insert_own_verified's
-- own is_verified_scout() gate on the trials table itself. Doesn't touch
-- the existing admin policies at all.
create policy post_images_scout_write_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_verified_scout()
  );

create policy post_images_scout_update_own on storage.objects for update to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy post_images_scout_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
