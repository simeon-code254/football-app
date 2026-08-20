import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { uploadFileToStorage } from '../lib/uploadFile';
import type { Database } from '../lib/database.types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// .or() takes a raw PostgREST filter string -- there's no structured/object
// form for it in supabase-js, so profileId (always a session-derived auth
// uid in practice) still ends up interpolated into query-language syntax.
// This guard makes that safe by construction instead of by convention: a
// malformed value can never reach the filter string, it throws first.
function assertUuid(value: string): string {
  if (!UUID_RE.test(value)) throw new Error('Invalid profile id.');
  return value;
}

export type ConversationRow = Database['public']['Tables']['conversations']['Row'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type ConversationWithParties = ConversationRow & {
  scouts: {
    id: string;
    organization: string | null;
    verification_status: string;
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  } | null;
  players: { id: string; profiles: { full_name: string | null; avatar_url: string | null } | null } | null;
};
export type ConversationPage = { items: ConversationWithParties[]; nextCursor?: string };

// An active scout/player's inbox only grows over the life of the account --
// previously fetched in full every time, with no bound.
//
// Cursor-based on last_message_at, not numeric offset: that column bumps
// every time a message arrives, and both messages screens call
// refetchConversations() on every send/read. Refetching cached pages by
// their original numeric offsets against a column that just reordered is
// how the same conversation ends up in two pages at once (or, the mirror
// case, silently drops out of the list) -- confirmed live via a duplicate
// React key on the conversation list. A cursor sidesteps this the same way
// the Reels feed's pagination does: each page's boundary is the last row's
// own last_message_at, not a row count that drifts when the sort key does.
export async function listConversations(
  profileId: string,
  pagination: { cursor?: string; pageSize?: number } = {}
): Promise<ConversationPage> {
  const pageSize = pagination.pageSize ?? 20;
  assertUuid(profileId);

  let query = supabase
    .from('conversations')
    // Both nested profiles embeds are FK-hinted, and for two separate
    // reasons. scouts also has scouts.verified_by referencing profiles; and
    // players is now linked to profiles a second way through endorsements
    // (20260815110000), which has FKs to both. Either one alone makes an
    // unhinted profiles(...) PGRST201 and breaks the inbox for both roles.
    //
    // The players half of this query was left unhinted when the scouts half
    // was fixed, and it broke later when endorsements shipped -- so treat any
    // unhinted embed as a latent break, not a working one.
    .select('*, scouts(id, organization, verification_status, profiles!scouts_id_fkey(full_name, avatar_url)), players(id, profiles!players_id_fkey(full_name, avatar_url))')
    .or(`scout_id.eq.${profileId},player_id.eq.${profileId}`)
    .order('last_message_at', { ascending: false })
    .limit(pageSize);
  if (pagination.cursor) query = query.lt('last_message_at', pagination.cursor);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as ConversationWithParties[];
  const nextCursor = rows.length === pageSize ? rows[rows.length - 1].last_message_at ?? undefined : undefined;
  return { items: rows, nextCursor };
}

// For stat tiles ("Players Contacted") that only ever needed a number --
// previously they called listConversations() and read .length off the full
// joined result, fetching every conversation row just to count them.
export async function getConversationsCount(profileId: string): Promise<number> {
  assertUuid(profileId);
  const { count, error } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .or(`scout_id.eq.${profileId},player_id.eq.${profileId}`);
  if (error) throw error;
  return count ?? 0;
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

// Computed server-side by the conversation_previews() SQL function --
// previously this downloaded every message in every conversation shown in
// the inbox just to reduce it to "last message + unread count" locally,
// which got slower with every message anyone ever sent, compounded across
// every conversation at once. RLS (messages_select_participant) still
// applies inside the function, same guarantee as any other query here.
export async function getConversationPreviews(
  conversationIds: string[]
): Promise<Record<string, ConversationPreview>> {
  if (!conversationIds.length) return {};
  const { data, error } = await supabase.rpc('conversation_previews', { p_conversation_ids: conversationIds });
  if (error) throw error;

  const previews: Record<string, ConversationPreview> = {};
  for (const id of conversationIds) previews[id] = { lastMessage: null, lastMessageAt: null, unreadCount: 0 };
  for (const row of data ?? []) {
    previews[row.conversation_id] = {
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      unreadCount: row.unread_count,
    };
  }
  return previews;
}

export type MessagePage = { items: MessageRow[]; hasMore: boolean };

// A long-running conversation only grows -- previously the entire thread
// loaded in full every time it was opened. Fetches the newest `pageSize`
// messages first (page 0), each subsequent page reaching further back;
// within a page results come back oldest-first so callers can just prepend
// older pages to what's already displayed.
export async function listMessages(
  conversationId: string,
  pagination: { page?: number; pageSize?: number } = {}
): Promise<MessagePage> {
  const pageSize = pagination.pageSize ?? 30;
  const from = (pagination.page ?? 0) * pageSize;
  const to = from + pageSize;

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  return { items: page.reverse(), hasMore };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  attachmentPath?: string
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body, attachment_path: attachmentPath ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Path convention: {conversation_id}/{random}.{ext} -- matches the storage
// policy's (storage.foldername(name))[1] = conversation id check.
export async function uploadMessageAttachment(
  conversationId: string,
  fileUri: string,
  fileName: string,
  mimeType?: string | null
): Promise<string> {
  const ext = fileName.includes('.') ? fileName.split('.').pop() : undefined;
  const id = Crypto.randomUUID();
  const path = `${conversationId}/${id}${ext ? `.${ext}` : ''}`;
  await uploadFileToStorage('message-attachments', path, fileUri, mimeType || 'application/octet-stream');
  return path;
}

// The `message-attachments` bucket is private -- always sign. Batched form
// (one round-trip for N paths) since a thread's bubbles are rendered as a
// list, same reasoning as videosRepository.getVideoUrls.
export async function getAttachmentUrls(storagePaths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(storagePaths));
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from('message-attachments').createSignedUrls(unique, 3600);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map[row.path] = row.signedUrl;
  }
  return map;
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
