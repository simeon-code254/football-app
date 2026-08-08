import { supabase } from '../lib/supabase';
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

export async function listOpenTrials(): Promise<TrialRow[]> {
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('status', 'open')
    .order('trial_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTrialById(id: string): Promise<TrialRow> {
  const { data, error } = await supabase.from('trials').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function listMyTrials(scoutId: string): Promise<TrialRow[]> {
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('scout_id', scoutId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
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

export async function applyToTrial(playerId: string, trialId: string) {
  const { error } = await supabase
    .from('trial_applications')
    .insert({ player_id: playerId, trial_id: trialId, source: 'applied' });
  if (error) throw error;
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

export async function listApplicants(trialId: string) {
  const { data, error } = await supabase
    .from('trial_applications')
    .select('*, players(*, profiles(full_name, avatar_url), countries(name))')
    .eq('trial_id', trialId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateApplicationStatus(applicationId: string, status: ApplicantStatus) {
  const { error } = await supabase.from('trial_applications').update({ status }).eq('id', applicationId);
  if (error) throw error;
}

export async function getMyApplications(playerId: string) {
  const { data, error } = await supabase
    .from('trial_applications')
    .select('*, trials(*)')
    .eq('player_id', playerId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
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
