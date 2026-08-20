import { supabase } from '../lib/supabase';
import { uploadFileToStorage, type UploadOptions } from '../lib/uploadFile';
import type { Database } from '../lib/database.types';

export type VideoRow = Database['public']['Tables']['videos']['Row'];
export type JobRow = Database['public']['Tables']['video_analysis_jobs']['Row'];
export type CommentRow = Database['public']['Tables']['video_comments']['Row'];

export type FeedVideo = VideoRow & {
  players: {
    primary_position: string | null;
    is_goalkeeper: boolean | null;
    overall_rating: number | null;
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  } | null;
};

export type CreateVideoInput = {
  id: string;
  playerId: string;
  storagePath: string;
  thumbnailPath?: string;
  title?: string;
  description?: string;
  matchName?: string;
  opponent?: string;
  tags: string[];
  uploadIntent: 'highlight_only' | 'ai_analysis';
  durationSeconds?: number;
  /** Normalized (0-1) tap point from the upload flow's "tag yourself" step —
   * where the uploader tapped themselves on the extracted frame — plus the
   * timestamp (ms into the video) that frame was taken from. The AI service
   * needs the timestamp because the subject moves: the same (x,y) means a
   * different thing a few seconds later, so it has to know which of its own
   * independently-decoded frames the tap actually corresponds to. Only set
   * for ai_analysis uploads where the user completed that optional step;
   * the AI service falls back to its own heuristic when absent. */
  subjectHintX?: number;
  subjectHintY?: number;
  subjectHintTimeMs?: number;
};

export async function createVideo(input: CreateVideoInput): Promise<VideoRow> {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      id: input.id,
      player_id: input.playerId,
      storage_path: input.storagePath,
      thumbnail_path: input.thumbnailPath,
      title: input.title,
      description: input.description,
      match_name: input.matchName,
      opponent: input.opponent,
      tags: input.tags,
      upload_intent: input.uploadIntent,
      duration_seconds: input.durationSeconds,
      subject_hint_x: input.subjectHintX,
      subject_hint_y: input.subjectHintY,
      subject_hint_time_ms: input.subjectHintTimeMs,
      // No transcoding/moderation pipeline yet — the clip is watchable
      // immediately. video_analysis_jobs.status is what tracks AI progress.
      status: 'ready',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Bounded rather than paginated: a player's own video grid (and a scout's
// view of it) renders inline inside a ScrollView tab, not a load-more list,
// so a generous cap replaces the old fully-unbounded query without a bigger
// screen rewrite. No real uploader is likely to ever approach this limit.
export async function getMyVideos(playerId: string, limit = 60): Promise<VideoRow[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getFeed(cursor?: string, limit = 10): Promise<FeedVideo[]> {
  let query = supabase
    .from('videos')
    // profiles!players_id_fkey, not a bare profiles(...): the endorsements
    // table added in 20260815110000 has foreign keys to BOTH players and
    // profiles, which makes PostgREST infer a second, many-to-many
    // relationship between them and reject the embed as ambiguous
    // (PGRST201). Same class of breakage already documented in
    // messagesRepository for scouts.verified_by. Naming the FK pins it to
    // the real one-to-one link.
    .select('*, players(primary_position, is_goalkeeper, overall_rating, profiles!players_id_fkey(full_name, avatar_url))')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (cursor) query = query.lt('created_at', cursor);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as FeedVideo[];
}

// Recent uploads across all players (scout dashboard "Recently Uploaded") —
// same shape as getFeed, just a distinct name for a distinct call site.
export async function getRecentUploads(limit = 6): Promise<FeedVideo[]> {
  return getFeed(undefined, limit);
}

export async function getVideoAnalysisJob(videoId: string): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from('video_analysis_jobs')
    .select('*')
    .eq('video_id', videoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// The AI Ratings screen previously showed attribute rows appearing (or not)
// with no signal about *why* -- a player mid-analysis and a player who
// simply never uploaded looked identical. This surfaces the real, live
// video_analysis_jobs status (RLS: jobs_select_own already lets a player
// read their own rows) for whichever job is most recent.
export async function getLatestAnalysisJob(playerId: string): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from('video_analysis_jobs')
    .select('*')
    .eq('player_id', playerId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyEngagement(profileId: string, videoIds: string[]) {
  if (!videoIds.length) return { liked: new Set<string>(), saved: new Set<string>() };
  const [{ data: likes, error: likeErr }, { data: saves, error: saveErr }] = await Promise.all([
    supabase.from('video_likes').select('video_id').eq('profile_id', profileId).in('video_id', videoIds),
    supabase.from('video_saves').select('video_id').eq('profile_id', profileId).in('video_id', videoIds),
  ]);
  if (likeErr) throw likeErr;
  if (saveErr) throw saveErr;
  return {
    liked: new Set((likes ?? []).map((l) => l.video_id)),
    saved: new Set((saves ?? []).map((s) => s.video_id)),
  };
}

export async function toggleLike(videoId: string, profileId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from('video_likes')
      .delete()
      .eq('video_id', videoId)
      .eq('profile_id', profileId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('video_likes').insert({ video_id: videoId, profile_id: profileId });
    if (error) throw error;
  }
}

export async function toggleSave(videoId: string, profileId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase
      .from('video_saves')
      .delete()
      .eq('video_id', videoId)
      .eq('profile_id', profileId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('video_saves').insert({ video_id: videoId, profile_id: profileId });
    if (error) throw error;
  }
}

export type CommentWithAuthor = CommentRow & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};
export type CommentPage = { items: CommentWithAuthor[]; hasMore: boolean };

// A popular clip can draw far more comments than a viewer needs loaded at
// once -- previously the entire comment history downloaded unbounded every
// time the comments sheet opened. Newest first (page 0 = latest), same
// convention as chat threads.
export async function listComments(
  videoId: string,
  pagination: { page?: number; pageSize?: number } = {}
): Promise<CommentPage> {
  const pageSize = pagination.pageSize ?? 30;
  const from = (pagination.page ?? 0) * pageSize;
  const to = from + pageSize;

  const { data, error } = await supabase
    .from('video_comments')
    .select('*, profiles(full_name, avatar_url)')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const rows = (data ?? []) as unknown as CommentWithAuthor[];
  const hasMore = rows.length > pageSize;
  return { items: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

export async function addComment(videoId: string, authorId: string, body: string): Promise<CommentRow> {
  const { data, error } = await supabase
    .from('video_comments')
    .insert({ video_id: videoId, author_id: authorId, body })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function incrementView(videoId: string) {
  const { error } = await supabase.rpc('increment_video_view', { p_video_id: videoId });
  if (error) throw error;
}

export async function incrementShare(videoId: string) {
  const { error } = await supabase.rpc('increment_video_share', { p_video_id: videoId });
  if (error) throw error;
}

// The bucket only allows video/mp4 and video/quicktime
// (20260808190000_storage_upload_limits.sql). Previously every upload was
// labelled video/mp4 and stored as `source.mp4` regardless of what was
// actually picked, so a QuickTime .mov -- the default for iOS-recorded
// footage -- was stored under a mismatched extension and content type.
function videoMimeFor(fileUri: string, fileName?: string | null): { mime: string; ext: string } {
  const source = (fileName || fileUri).toLowerCase();
  if (source.endsWith('.mov')) return { mime: 'video/quicktime', ext: 'mov' };
  return { mime: 'video/mp4', ext: 'mp4' };
}

export async function uploadVideoSource(
  playerId: string,
  videoId: string,
  fileUri: string,
  fileName?: string | null,
  opts?: UploadOptions
) {
  const { mime, ext } = videoMimeFor(fileUri, fileName);
  const path = `${playerId}/${videoId}/source.${ext}`;
  await uploadFileToStorage('videos', path, fileUri, mime, opts);
  return path;
}

export async function uploadVideoThumbnail(playerId: string, videoId: string, fileUri: string) {
  const path = `${playerId}/${videoId}/thumb.jpg`;
  await uploadFileToStorage('videos', path, fileUri, 'image/jpeg');
  return path;
}

// Cleanup for a partially-completed upload: the source and/or thumbnail
// made it into storage but the `videos` row insert failed, leaving objects
// nothing references. Removes both known paths for the id; `remove()` does
// not error on paths that were never written.
export async function deleteVideoObjects(playerId: string, videoId: string) {
  const prefix = `${playerId}/${videoId}`;
  const { error } = await supabase.storage
    .from('videos')
    .remove([`${prefix}/source.mp4`, `${prefix}/source.mov`, `${prefix}/thumb.jpg`]);
  if (error) throw error;
}

// The `videos` bucket is private — no public URL, always sign.
export async function getVideoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('videos').createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// Batched form of getVideoUrl — one round-trip for N paths instead of N
// parallel round-trips. Callers signing a whole feed/grid's worth of
// thumbnails at once should use this instead of Promise.all-ing getVideoUrl.
export async function getVideoUrls(storagePaths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(storagePaths));
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from('videos').createSignedUrls(unique, 3600);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map[row.path] = row.signedUrl;
  }
  return map;
}
