import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export async function listNotifications(profileId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
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
