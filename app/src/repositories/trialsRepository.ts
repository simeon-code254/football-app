import { supabase } from '../lib/supabase';
import { uploadFileToStorage } from '../lib/uploadFile';
import type { Database } from '../lib/database.types';

export type TrialRow = Database['public']['Tables']['trials']['Row'];
export type TrialApplicationRow = Database['public']['Tables']['trial_applications']['Row'];
export type ApplicantStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

type NewTrialInput = {
  scoutId: string;
  title: string;
  club: string;
  location: string;
  ageMin?: number;
  ageMax?: number;
  positions: string[];
  trialDate: string; // ISO date
  applicationDeadline: string; // ISO date
  description?: string;
};

type TrialEditableFields = {
  title: string;
  club: string;
  location: string;
  ageMin?: number;
  ageMax?: number;
  positions: string[];
  trialDate: string; // ISO date
  applicationDeadline: string; // ISO date
  description?: string;
};

export type TrialPage = { items: TrialRow[]; hasMore: boolean };

// The platform-wide open-trials browse list grows as every scout ever
// creates a trial -- previously unbounded, fetched in full on every visit.
export async function listOpenTrials(
  pagination: { page?: number; pageSize?: number } = {}
): Promise<TrialPage> {
  const pageSize = pagination.pageSize ?? 20;
  const from = (pagination.page ?? 0) * pageSize;
  const to = from + pageSize;

  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('status', 'open')
    .order('trial_date', { ascending: true })
    .range(from, to);
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  return { items: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

export async function getTrialById(id: string): Promise<TrialRow> {
  const { data, error } = await supabase.from('trials').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function listMyTrials(
  scoutId: string,
  opts: { status?: string; page?: number; pageSize?: number } = {}
): Promise<TrialPage> {
  const pageSize = opts.pageSize ?? 20;
  const from = (opts.page ?? 0) * pageSize;
  const to = from + pageSize;

  let query = supabase.from('trials').select('*').eq('scout_id', scoutId);
  if (opts.status) query = query.eq('status', opts.status);
  query = query.order('created_at', { ascending: false }).range(from, to);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  return { items: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

// For stat tiles ("Trials Run") that only ever needed a number.
export async function getMyTrialsCount(scoutId: string): Promise<number> {
  const { count, error } = await supabase
    .from('trials')
    .select('id', { count: 'exact', head: true })
    .eq('scout_id', scoutId);
  if (error) throw error;
  return count ?? 0;
}

export async function getApplicantCounts(trialIds: string[]): Promise<Record<string, number>> {
  if (!trialIds.length) return {};
  const { data, error } = await supabase.from('trial_applications').select('trial_id').in('trial_id', trialIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.trial_id] = (counts[row.trial_id] ?? 0) + 1;
  return counts;
}

export async function createTrial(input: NewTrialInput): Promise<TrialRow> {
  const { data, error } = await supabase
    .from('trials')
    .insert({
      scout_id: input.scoutId,
      title: input.title,
      club: input.club,
      location: input.location,
      age_min: input.ageMin,
      age_max: input.ageMax,
      positions: input.positions as never,
      trial_date: input.trialDate,
      application_deadline: input.applicationDeadline,
      description: input.description,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Backed by the trials_update_own RLS policy (scout_id = auth.uid()) --
// already existed in the schema with no caller anywhere in the app until
// now, same story as deleteTrial below.
export async function updateTrial(trialId: string, input: TrialEditableFields): Promise<TrialRow> {
  const { data, error } = await supabase
    .from('trials')
    .update({
      title: input.title,
      club: input.club,
      location: input.location,
      age_min: input.ageMin,
      age_max: input.ageMax,
      positions: input.positions as never,
      trial_date: input.trialDate,
      application_deadline: input.applicationDeadline,
      description: input.description,
    })
    .eq('id', trialId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTrial(trialId: string) {
  const { error } = await supabase.from('trials').delete().eq('id', trialId);
  if (error) throw error;
}

// post-images is public-read; write is scoped to the caller's own uid
// folder (post_images_scout_write_own, verified scouts only) -- see
// 20260815010000_trials_scout_cover_images.sql. Stores just the storage
// path in trials.cover_image_path (trial/[id].tsx already reads it via
// getPublicStorageUrl), not a full URL.
export async function uploadTrialCoverImage(scoutId: string, trialId: string, fileUri: string): Promise<string> {
  const path = `${scoutId}/trial-covers/${trialId}.jpg`;
  await uploadFileToStorage('post-images', path, fileUri, 'image/jpeg');
  const { error } = await supabase.from('trials').update({ cover_image_path: path }).eq('id', trialId);
  if (error) throw error;
  return path;
}

export async function applyToTrial(playerId: string, trialId: string) {
  const { error } = await supabase
    .from('trial_applications')
    .insert({ player_id: playerId, trial_id: trialId, source: 'applied' });
  if (error) {
    // unique(trial_id, player_id) conflict -- an application already exists
    // (e.g. a second tap that raced the first insert, or the status query
    // hadn't loaded yet when Apply was pressed). The player's intent
    // ("I want to be applied to this trial") is already satisfied, so treat
    // this as a no-op success instead of a scary error alert.
    if (error.code === '23505') return;
    throw error;
  }
}

export async function withdrawApplication(applicationId: string) {
  const { error } = await supabase
    .from('trial_applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId);
  if (error) throw error;
}

export async function inviteToTrial(scoutId: string, trialId: string, playerId: string) {
  const { error } = await supabase.from('trial_applications').insert({
    player_id: playerId,
    trial_id: trialId,
    source: 'invited',
    invited_by_scout_id: scoutId,
  });
  if (error) throw error;
}

export type ApplicantRow = TrialApplicationRow & {
  players: {
    date_of_birth: string | null;
    primary_position: string | null;
    overall_rating: number | null;
    profiles: { full_name: string | null; avatar_url: string | null } | null;
    countries: { name: string | null } | null;
  } | null;
};
export type ApplicantPage = { items: ApplicantRow[]; hasMore: boolean };

// A popular open-call trial can draw far more applicants than fit on one
// screen -- previously the whole applicant list loaded unbounded, then got
// filtered into status tabs client-side, which silently breaks page
// accounting once a fetch is capped (a tab could show 3 of 50 real matches
// just because the rest hadn't loaded yet). Filtering by status server-side
// instead, same fix already applied to Discover's position filter.
export async function listApplicants(
  trialId: string,
  opts: { status?: ApplicantStatus; page?: number; pageSize?: number } = {}
): Promise<ApplicantPage> {
  const pageSize = opts.pageSize ?? 20;
  const from = (opts.page ?? 0) * pageSize;
  const to = from + pageSize;

  let query = supabase
    .from('trial_applications')
    // profiles!players_id_fkey, not a bare profiles(...): the endorsements
    // table added in 20260815110000 has foreign keys to BOTH players and
    // profiles, which makes PostgREST infer a second, many-to-many
    // relationship between them and reject the embed as ambiguous
    // (PGRST201). Same class of breakage already documented in
    // messagesRepository for scouts.verified_by. Naming the FK pins it to
    // the real one-to-one link.
    .select('*, players(date_of_birth, primary_position, overall_rating, profiles!players_id_fkey(full_name, avatar_url), countries(name))')
    .eq('trial_id', trialId);
  if (opts.status) query = query.eq('status', opts.status);
  query = query.order('applied_at', { ascending: false }).range(from, to);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as ApplicantRow[];
  const hasMore = rows.length > pageSize;
  return { items: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

// Backs the status-tab badges (All/Pending/Shortlisted/...) with real counts
// across every applicant, not just whichever page happens to be loaded --
// a single skinny (status-only, no joins) fetch, far cheaper than pulling
// every applicant's full joined player/profile data just to count them.
export async function getApplicantStatusCounts(trialId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('trial_applications').select('status').eq('trial_id', trialId);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}

export async function updateApplicationStatus(applicationId: string, status: ApplicantStatus) {
  const { error } = await supabase.from('trial_applications').update({ status }).eq('id', applicationId);
  if (error) throw error;
}

export type MyApplicationRow = TrialApplicationRow & { trials: TrialRow | null };
export type MyApplicationPage = { items: MyApplicationRow[]; hasMore: boolean };

// A player's full trial-application history only grows over the life of
// their account.
export async function getMyApplications(
  playerId: string,
  pagination: { page?: number; pageSize?: number } = {}
): Promise<MyApplicationPage> {
  const pageSize = pagination.pageSize ?? 20;
  const from = (pagination.page ?? 0) * pageSize;
  const to = from + pageSize;

  const { data, error } = await supabase
    .from('trial_applications')
    .select('*, trials(*)')
    .eq('player_id', playerId)
    .order('applied_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const rows = (data ?? []) as unknown as MyApplicationRow[];
  const hasMore = rows.length > pageSize;
  return { items: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

// For the "Trial Invitations" stat tile that only ever needed a number --
// deriving it from a page of getMyApplications() would have undercounted
// once that call became paginated.
export async function getMyInvitationsCount(playerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('trial_applications')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('source', 'invited');
  if (error) throw error;
  return count ?? 0;
}

export async function getMyApplicationForTrial(
  playerId: string,
  trialId: string
): Promise<TrialApplicationRow | null> {
  const { data, error } = await supabase
    .from('trial_applications')
    .select('*')
    .eq('player_id', playerId)
    .eq('trial_id', trialId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
