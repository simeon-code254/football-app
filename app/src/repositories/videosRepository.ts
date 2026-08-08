import { supabase } from '../lib/supabase';
import { uploadFileToStorage } from '../lib/uploadFile';
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

export async function getMyVideos(playerId: string): Promise<VideoRow[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getFeed(cursor?: string, limit = 10): Promise<FeedVideo[]> {
  let query = supabase
    .from('videos')
    .select('*, players(primary_position, is_goalkeeper, overall_rating, profiles(full_name, avatar_url))')
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

export async function listComments(videoId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('video_comments')
    .select('*, profiles(full_name, avatar_url)')
    .eq('video_id', videoId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CommentWithAuthor[];
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

export async function uploadVideoSource(playerId: string, videoId: string, fileUri: string) {
  const path = `${playerId}/${videoId}/source.mp4`;
  await uploadFileToStorage('videos', path, fileUri, 'video/mp4');
  return path;
}

export async function uploadVideoThumbnail(playerId: string, videoId: string, fileUri: string) {
  const path = `${playerId}/${videoId}/thumb.jpg`;
  await uploadFileToStorage('videos', path, fileUri, 'image/jpeg');
  return path;
}

// The `videos` bucket is private — no public URL, always sign.
export async function getVideoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('videos').createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
