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

// The most recent "a scout viewed your profile", for the home banner.
//
// Asked for on its own rather than filtered out of the recent-notifications
// preview, because that preview is three rows deep: a player with three newer
// notifications would lose the banner even though a scout looked at them an
// hour ago, and this is the one signal on the whole screen that says somebody
// is interested in them.
//
// The row carries no viewer_id by design -- see 20260820100000, constraint 1.
// Most players here are minors, so naming the scout would create a contact
// path nobody has vetted. "A scout" is all this can ever say, and all it
// should.
export async function getLatestProfileView(profileId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, created_at, read_at')
    .eq('profile_id', profileId)
    .eq('type', 'profile_view')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
