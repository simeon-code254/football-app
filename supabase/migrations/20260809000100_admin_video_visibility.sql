-- Table-level: admin has no path to see another user's video row unless it
-- happens to be status='ready' (videos_select_ready_public). Explicit grant
-- so admin visibility doesn't silently depend on that coincidence -- it
-- matters once a real transcoding/moderation pipeline starts using
-- 'uploaded'/'processing'/'failed' for real (today createVideo() in
-- app/src/repositories/videosRepository.ts hardcodes status:'ready' on every
-- insert, so those states are currently unused, but the admin Videos page
-- must not assume that stays true).
create policy videos_select_admin on public.videos for select
  using (public.is_admin());

-- Storage-level: videos_read_ready (20260808080237_storage.sql) is a
-- path-exact join against videos.storage_path (the source file) -- it does
-- NOT cover the sibling thumbnail object at {player_id}/{video_id}/thumb.jpg
-- (see uploadVideoThumbnail in videosRepository.ts), for ANY video,
-- regardless of status or who's asking. Without this, the admin Videos page
-- can't render a thumbnail for any video it doesn't own. Same shape as the
-- existing verification_docs_admin_read policy on the verification-documents
-- bucket.
create policy videos_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'videos' and public.is_admin());
