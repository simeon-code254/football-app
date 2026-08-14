import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type NewsPostRow = Database['public']['Tables']['news_posts']['Row'];
export type NewsPage = { items: NewsPostRow[]; hasMore: boolean };

export async function listPublishedNews(
  pagination: { page?: number; pageSize?: number } = {}
): Promise<NewsPage> {
  const pageSize = pagination.pageSize ?? 20;
  const from = (pagination.page ?? 0) * pageSize;
  const to = from + pageSize;

  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  return { items: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}
