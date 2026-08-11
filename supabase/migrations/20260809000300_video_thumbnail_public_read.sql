-- videos_read_ready only covers the exact source.mp4 path. Any authenticated
-- user viewing someone else's ready video (Reels, scout "Recently Uploaded")
-- has never been able to load that video's thumbnail image -- same root
-- cause as the admin gap fixed in 20260809000100, closed once here for
-- everyone (not admin-specific).
create policy videos_thumbnail_read_ready on storage.objects for select to authenticated
  using (
    bucket_id = 'videos'
    and exists (
      select 1 from public.videos v
      where v.thumbnail_path = name and v.status = 'ready'
    )
  );
