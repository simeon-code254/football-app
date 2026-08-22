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
  // Points gained since the last weekly snapshot. Null means no snapshot
  // exists yet (a player new this week), which is deliberately distinct from
  // a delta of 0 -- one says "we have no history", the other says "no
  // improvement", and they should never be conflated on a board about effort.
  rating_delta: number | null;
  rating_has_low_confidence: boolean | null;
};

export type LeaderboardScope = 'region' | 'position' | 'age' | 'improved';

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

  // 'improved' is the one scope not sorted by rating. Every other board puts
  // the same people on top, so a player rated 18 can never place; ranking by
  // movement is where a week of work beats a head start. Rows with no prior
  // snapshot have a null delta and are excluded rather than shown as zero --
  // "no history yet" is not the same claim as "did not improve".
  if (scope === 'improved') {
    const { data, error } = await query
      .not('rating_delta', 'is', null)
      .gt('rating_delta', 0)
      .order('rating_delta', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as LeaderboardRow[];
  }

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

// The three numbers behind the home screen's "THIS WEEK" strip.
//
// Every one of them is read from a real table. There is deliberately no
// fourth: the design canvas also puts a streak counter in the header, and
// nothing in this database records consecutive days of activity, so a streak
// would have to be invented. It is left out rather than faked.
//
// Each field is nullable and null means "we do not know", never zero. On a
// screen whose whole job is to tell a young player whether they are getting
// anywhere, "no improvement this week" and "we have no history for you yet"
// are opposite messages, and a coalesce to 0 would show the discouraging one
// to every player in their first week.
export type WeekSummary = {
  /** Points gained since last week's snapshot. Null: no prior snapshot. */
  ratingDelta: number | null;
  /** 1-based rank within the player's own region. Null: no region or rating. */
  regionRank: number | null;
  /** How many rated players share that region, so the rank has a denominator. */
  regionSize: number | null;
  /** Trial applications this player has submitted. */
  trialsApplied: number;
};

export async function getWeekSummary(playerId: string): Promise<WeekSummary> {
  const [{ data: me, error: meError }, { count: trialsApplied, error: trialsError }] =
    await Promise.all([
      supabase
        .from('player_leaderboard')
        .select('overall_rating, region, rating_delta')
        .eq('id', playerId)
        .maybeSingle(),
      supabase
        .from('trial_applications')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', playerId),
    ]);
  if (meError) throw meError;
  if (trialsError) throw trialsError;

  const summary: WeekSummary = {
    ratingDelta: me?.rating_delta ?? null,
    regionRank: null,
    regionSize: null,
    trialsApplied: trialsApplied ?? 0,
  };

  // player_leaderboard has no rank column and cannot get one -- it is a view,
  // and `create or replace view` can only append columns, never reorder them
  // (see 20260820130000). Rank is therefore counted rather than selected:
  // two head-only counts move no rows, which matters because the alternative
  // is pulling an entire region's board to find one index.
  if (me?.region && me.overall_rating != null) {
    const [{ count: ahead, error: aheadError }, { count: size, error: sizeError }] =
      await Promise.all([
        supabase
          .from('player_leaderboard')
          .select('id', { count: 'exact', head: true })
          .eq('region', me.region)
          .gt('overall_rating', me.overall_rating),
        supabase
          .from('player_leaderboard')
          .select('id', { count: 'exact', head: true })
          .eq('region', me.region),
      ]);
    if (aheadError) throw aheadError;
    if (sizeError) throw sizeError;
    summary.regionRank = (ahead ?? 0) + 1;
    summary.regionSize = size ?? null;
  }

  return summary;
}

export type RatingSnapshot = { week_start: string; overall_rating: number | null };

// A player's weekly rating history, oldest first for charting.
//
// player_rating_snapshots has recorded this since 20260820120000 and nothing
// has ever shown it. It is the only record in the whole system of what a
// rating used to be -- players.overall_rating is a single mutable column, so
// without these rows a player's own progress is invisible to them even though
// improving is the entire thing the app is asking them to do.
//
// Weeks with a null rating are kept rather than filtered: a gap in the series
// is real information (no analysis ran that week), and dropping those rows
// would silently join two non-adjacent weeks into a straight line that looks
// like steady progress nobody made.
export async function getRatingHistory(playerId: string, weeks = 12): Promise<RatingSnapshot[]> {
  const { data, error } = await supabase
    .from('player_rating_snapshots')
    .select('week_start, overall_rating')
    .eq('player_id', playerId)
    .order('week_start', { ascending: false })
    .limit(weeks);
  if (error) throw error;
  return (data ?? []).reverse() as RatingSnapshot[];
}
