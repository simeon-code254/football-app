import { supabase } from './supabase';

// post-images is a public bucket (see supabase/migrations/20260814210100_post_cover_images.sql)
// -- getPublicUrl is pure string construction, no network round-trip, so this
// is safe to call directly in render rather than needing a signed-URL query.
export function getPublicStorageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
