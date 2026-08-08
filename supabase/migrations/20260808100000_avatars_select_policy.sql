-- The avatars bucket had insert/update/delete policies but no select
-- policy at all. Storage's upsert path (used by uploadAvatar() so a user
-- can replace their photo) needs read access to check for an existing
-- object first — with no select policy, RLS default-denies that read and
-- the whole upsert fails with a generic "row violates row-level security
-- policy" error, even though the object being written passes the insert
-- check on its own. avatars is a public bucket by design, so this is a
-- fully open read policy, matching intent (anyone can view any avatar).

create policy avatars_select_all on storage.objects for select
  using (bucket_id = 'avatars');
