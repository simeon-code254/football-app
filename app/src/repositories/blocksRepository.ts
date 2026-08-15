import { supabase } from '../lib/supabase';

// Blocking is enforced in the database too (see
// 20260815070000_blocked_users.sql): a blocked scout cannot open a new
// conversation or send into an existing one, because the RLS policies call
// is_blocked_between(). These functions are the client half -- the list is
// used to filter feeds and lists so blocked people also disappear from
// view, not just lose the ability to make contact.

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  // Already blocked is the same end state the user asked for, so a unique
  // violation is a no-op rather than an error -- same treatment as the
  // duplicate trial application.
  if (error && error.code !== '23505') throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

/** Profile ids the signed-in user has blocked. Used to filter lists. */
export async function listBlockedIds(blockerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', blockerId);
  if (error) throw error;
  return (data ?? []).map((r) => r.blocked_id);
}

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
