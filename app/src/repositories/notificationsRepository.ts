import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export type NotificationPage = { items: NotificationRow[]; hasMore: boolean };

export async function listNotifications(
  profileId: string,
  pagination: { page?: number; pageSize?: number } = {}
): Promise<NotificationPage> {
  const pageSize = pagination.pageSize ?? 20;
  const from = (pagination.page ?? 0) * pageSize;
  const to = from + pageSize;

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  return { items: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

export async function markAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllAsRead(profileId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .is('read_at', null);
  if (error) throw error;
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

// Deletes every already-read notification -- deliberately leaves unread
// ones alone (clearing something the user hasn't even seen yet would be
// surprising). Anything nobody clears this way still disappears on its own
// after 72h via the delete_stale_notifications() cron job.
export async function clearReadNotifications(profileId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('profile_id', profileId)
    .not('read_at', 'is', null);
  if (error) throw error;
}

export async function getUnreadCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export function subscribeToNotifications(profileId: string, onInsert: (n: NotificationRow) => void) {
  const channel = supabase
    .channel(`notifications:${profileId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profileId}` },
      (payload) => onInsert(payload.new as NotificationRow)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
