import { supabase } from '../lib/supabase';

export type LeaderboardRow = {
  id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  primary_position: string | null;
  region: string | null;
  age_band: string | null;
  overall_rating: number | null;
  video_count: number | null;
  follower_count: number | null;
  endorsement_count: number | null;
};

export type LeaderboardScope = 'region' | 'position' | 'age';

/**
 * Segmented leaderboard. A global board produces a small competitive
 * minority and a large disengaged majority; narrowing to the viewer's own
 * region, position or age band gives everyone a group they can realistically
 * place in.
 */
export async function getLeaderboard(
  scope: LeaderboardScope,
  viewer: { region?: string | null; position?: string | null; ageBand?: string | null },
  limit = 25
): Promise<LeaderboardRow[]> {
  let query = supabase.from('player_leaderboard').select('*');

  if (scope === 'region' && viewer.region) query = query.eq('region', viewer.region);
  if (scope === 'position' && viewer.position) query = query.eq('primary_position', viewer.position);
  if (scope === 'age' && viewer.ageBand) query = query.eq('age_band', viewer.ageBand);

  const { data, error } = await query.order('overall_rating', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

export async function followUser(followerId: string, followedId: string) {
  const { error } = await supabase.from('follows').insert({ follower_id: followerId, followed_id: followedId });
  // Already following is the state the user asked for.
  if (error && error.code !== '23505') throw error;
}

export async function unfollowUser(followerId: string, followedId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('followed_id', followedId);
  if (error) throw error;
}

export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('followed_id')
    .eq('follower_id', followerId)
    .eq('followed_id', followedId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function endorse(endorserId: string, playerId: string, attributeKey: string) {
  const { error } = await supabase
    .from('endorsements')
    .insert({ endorser_id: endorserId, player_id: playerId, attribute_key: attributeKey });
  if (error && error.code !== '23505') throw error;
}

export async function removeEndorsement(endorserId: string, playerId: string, attributeKey: string) {
  const { error } = await supabase
    .from('endorsements')
    .delete()
    .eq('endorser_id', endorserId)
    .eq('player_id', playerId)
    .eq('attribute_key', attributeKey);
  if (error) throw error;
}

/** Endorsement counts per attribute for a player, plus what the viewer gave. */
export async function getEndorsements(playerId: string, viewerId?: string) {
  const { data, error } = await supabase
    .from('endorsements')
    .select('attribute_key, endorser_id')
    .eq('player_id', playerId);
  if (error) throw error;

  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  for (const row of data ?? []) {
    counts[row.attribute_key] = (counts[row.attribute_key] ?? 0) + 1;
    if (viewerId && row.endorser_id === viewerId) mine.add(row.attribute_key);
  }
  return { counts, mine };
}
