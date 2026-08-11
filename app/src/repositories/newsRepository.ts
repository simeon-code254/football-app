import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type NewsPostRow = Database['public']['Tables']['news_posts']['Row'];

export async function listPublishedNews(): Promise<NewsPostRow[]> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
