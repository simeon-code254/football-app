-- Buckets had no file_size_limit/allowed_mime_types at all -- a client
-- could upload an arbitrarily large file, or mislabel content type (e.g.
-- upload something other than a video with contentType: 'video/mp4', since
-- uploadFile.ts passes the caller-supplied contentType through unchecked).
-- Limits match the upload screen's own stated copy ("MP4, MOV up to
-- 100MB") and typical image sizes for avatars/verification docs.
update storage.buckets set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

update storage.buckets set
  file_size_limit = 100 * 1024 * 1024,
  allowed_mime_types = array['video/mp4', 'video/quicktime', 'image/jpeg']
where id = 'videos';

update storage.buckets set
  file_size_limit = 20 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf']
where id = 'verification-documents';
