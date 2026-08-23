import { supabase } from '../lib/supabase';
import { uploadFileToStorage } from '../lib/uploadFile';
import type { Database } from '../lib/database.types';

// Clubs -- the third role, added by migration 20260822120000_clubs.sql.
//
// Row types come from the generated `database.types.ts` like every other
// repository. They were hand-written here while the migration was unapplied;
// the migration is now live on the matobev project and the types have been
// regenerated, so the hand-written copies are gone and a column renamed in SQL
// will once again fail the type-check rather than fail at runtime.
export type ClubRow = Database['public']['Tables']['clubs']['Row'];
export type ClubUpdate = Database['public']['Tables']['clubs']['Update'];
export type ClubMemberRow = Database['public']['Tables']['club_members']['Row'];

export type ClubVerificationStatus = 'pending' | 'verified' | 'rejected';
export type ClubMemberRole = 'admin' | 'scout';
export type ClubMemberStatus = 'invited' | 'active' | 'removed';

/** A member row with the person's name and avatar joined on, for screen 53. */
export type ClubMemberWithProfile = ClubMemberRow & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

export async function getMyClub(userId: string): Promise<ClubRow | null> {
  const { data, error } = await supabase.from('clubs').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getClub(clubId: string): Promise<ClubRow | null> {
  const { data, error } = await supabase.from('clubs').select('*').eq('id', clubId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateClub(clubId: string, patch: ClubUpdate) {
  const { error } = await supabase.from('clubs').update(patch).eq('id', clubId);
  if (error) throw error;
}

/**
 * The crest. Canvas screen 55 specifies "PNG or SVG · square, 512px minimum",
 * and screen 49 notes it "appears on every trial you post and every message you
 * send" -- so it goes to the public `post-images` bucket rather than a private
 * one, because it is rendered to people who are not the club.
 */
export async function uploadClubCrest(clubId: string, fileUri: string): Promise<string> {
  const path = `clubs/${clubId}/crest-${Date.now()}.jpg`;
  await uploadFileToStorage('post-images', path, fileUri, 'image/jpeg');
  await updateClub(clubId, { crest_path: path });
  return path;
}

// -- TEAM SEATS (canvas screen 53) --
//
// The seat limit is enforced by a database trigger, not here. A client-side
// check would be a courtesy message; two devices inviting at once would still
// race past it, and seats are a billing boundary.

export async function listMembers(clubId: string): Promise<ClubMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('club_members')
    .select('*, profiles(full_name, avatar_url)')
    .eq('club_id', clubId)
    .neq('status', 'removed')
    // Admins first, then by when they were invited, so the ordering does not
    // shuffle as people accept.
    .order('member_role', { ascending: true })
    .order('invited_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClubMemberWithProfile[];
}

export async function countActiveSeats(clubId: string): Promise<number> {
  const { count, error } = await supabase
    .from('club_members')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .neq('status', 'removed');
  if (error) throw error;
  return count ?? 0;
}

export async function inviteMember(clubId: string, profileId: string, memberRole: ClubMemberRole = 'scout') {
  // Re-inviting someone who was removed reuses their row rather than failing
  // the (club_id, profile_id) unique constraint.
  const { error } = await supabase
    .from('club_members')
    .upsert(
      { club_id: clubId, profile_id: profileId, member_role: memberRole, status: 'invited', joined_at: null },
      { onConflict: 'club_id,profile_id' }
    );
  if (error) throw error;
}

export async function removeMember(memberId: string) {
  // Soft-removed rather than deleted, so the seat is freed but the history of
  // who had access is not silently rewritten.
  const { error } = await supabase
    .from('club_members')
    .update({ status: 'removed' })
    .eq('id', memberId);
  if (error) throw error;
}
