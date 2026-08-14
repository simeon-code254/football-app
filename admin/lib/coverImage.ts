import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/database.types';

type Client = SupabaseClient<Database>;

// Shared by the news and trial forms -- both write into the same public
// 'post-images' bucket (admin-only write, per its storage policy), just
// under a different folder prefix so the two content types don't collide.
export async function uploadCoverImage(supabase: Client, folder: 'news' | 'trials', file: File): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `${folder}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('post-images')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

export function coverImagePublicUrl(supabase: Client, path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
}
