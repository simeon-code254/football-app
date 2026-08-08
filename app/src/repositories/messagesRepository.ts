import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type ConversationRow = Database['public']['Tables']['conversations']['Row'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];

export async function listConversations(profileId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, scouts(id, organization, profiles(full_name, avatar_url)), players(id, profiles(full_name, avatar_url))')
    .or(`scout_id.eq.${profileId},player_id.eq.${profileId}`)
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateConversation(scoutId: string, playerId: string): Promise<ConversationRow> {
  const { data: existing, error: findErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('scout_id', scoutId)
    .eq('player_id', playerId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ scout_id: scoutId, player_id: playerId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export type ConversationPreview = { lastMessage: string | null; lastMessageAt: string | null; unreadCount: number };

export async function getConversationPreviews(
  conversationIds: string[],
  profileId: string
): Promise<Record<string, ConversationPreview>> {
  if (!conversationIds.length) return {};
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id, body, created_at, sender_id, read_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const previews: Record<string, ConversationPreview> = {};
  for (const id of conversationIds) previews[id] = { lastMessage: null, lastMessageAt: null, unreadCount: 0 };
  for (const m of data ?? []) {
    const preview = previews[m.conversation_id];
    if (!preview.lastMessage) {
      preview.lastMessage = m.body;
      preview.lastMessageAt = m.created_at;
    }
    if (m.sender_id !== profileId && !m.read_at) preview.unreadCount += 1;
  }
  return previews;
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function markMessagesRead(conversationId: string, profileId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', profileId)
    .is('read_at', null);
  if (error) throw error;
}

export function subscribeToMessages(conversationId: string, onInsert: (message: MessageRow) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as MessageRow)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
