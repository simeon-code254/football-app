import { supabase } from '../lib/supabase';
import { uploadFileToStorage } from '../lib/uploadFile';
import type { Database } from '../lib/database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type PlayerRow = Database['public']['Tables']['players']['Row'];
export type ScoutRow = Database['public']['Tables']['scouts']['Row'];
export type PlayerPublicView = Database['public']['Views']['player_public_view']['Row'];
export type CountryRow = Database['public']['Tables']['countries']['Row'];
type PlayerUpdate = Database['public']['Tables']['players']['Update'];
type ScoutUpdate = Database['public']['Tables']['scouts']['Update'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function getMyProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function getMyPlayer(userId: string): Promise<PlayerRow> {
  const { data, error } = await supabase.from('players').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function getMyScout(userId: string): Promise<ScoutRow> {
  const { data, error } = await supabase.from('scouts').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfileFields(userId: string, patch: ProfileUpdate) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function updatePlayer(userId: string, patch: PlayerUpdate) {
  const { error } = await supabase.from('players').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function updateScout(userId: string, patch: ScoutUpdate) {
  const { error } = await supabase.from('scouts').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function uploadAvatar(userId: string, fileUri: string): Promise<string> {
  const path = `${userId}/avatar.jpg`;
  await uploadFileToStorage('avatars', path, fileUri, 'image/jpeg');
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // cache-bust so the new avatar shows immediately even though the path is stable
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
  await updateProfileFields(userId, { avatar_url: publicUrl });
  return publicUrl;
}

export async function getPlayerPublicView(playerId: string): Promise<PlayerPublicView> {
  const { data, error } = await supabase
    .from('player_public_view')
    .select('*')
    .eq('id', playerId)
    .single();
  if (error) throw error;
  return data;
}

export type PlayerFilters = {
  position?: string;
  positions?: string[];
  ageMin?: number;
  ageMax?: number;
  countryCode?: string;
  countryCodes?: string[];
  preferredFoot?: string[];
  minOverall?: number;
  search?: string;
};

export async function listPlayerPublicViews(filters: PlayerFilters = {}): Promise<PlayerPublicView[]> {
  let query = supabase.from('player_public_view').select('*');
  if (filters.position) query = query.eq('primary_position', filters.position);
  if (filters.positions?.length) query = query.in('primary_position', filters.positions);
  if (filters.ageMin != null) query = query.gte('age', filters.ageMin);
  if (filters.ageMax != null) query = query.lte('age', filters.ageMax);
  if (filters.countryCode) query = query.eq('nationality_code', filters.countryCode);
  if (filters.countryCodes?.length) query = query.in('nationality_code', filters.countryCodes);
  if (filters.preferredFoot?.length) query = query.in('preferred_foot', filters.preferredFoot);
  if (filters.minOverall != null) query = query.gte('overall_rating', filters.minOverall);
  if (filters.search) query = query.ilike('full_name', `%${filters.search}%`);
  const { data, error } = await query.order('overall_rating', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export type AttributeScore = {
  key: string;
  displayName: string;
  sortOrder: number;
  value: number | null;
  confidence: 'High' | 'Medium' | 'Low' | null;
};

export async function getPlayerAttributes(
  playerId: string,
  isGoalkeeper: boolean
): Promise<AttributeScore[]> {
  const category = isGoalkeeper ? 'goalkeeper' : 'outfield';
  const [{ data: defs, error: defErr }, { data: scores, error: scoreErr }] = await Promise.all([
    supabase
      .from('attribute_definitions')
      .select('id,key,display_name,sort_order')
      .eq('category', category)
      .order('sort_order'),
    supabase.from('player_attribute_scores').select('attribute_id,value,confidence').eq('player_id', playerId),
  ]);
  if (defErr) throw defErr;
  if (scoreErr) throw scoreErr;

  const byAttributeId = new Map((scores ?? []).map((s) => [s.attribute_id, s]));
  return (defs ?? []).map((d) => {
    const score = byAttributeId.get(d.id);
    return {
      key: d.key,
      displayName: d.display_name,
      sortOrder: d.sort_order,
      value: score?.value ?? null,
      confidence: (score?.confidence as AttributeScore['confidence']) ?? null,
    };
  });
}

export async function getCountries(): Promise<CountryRow[]> {
  const { data, error } = await supabase.from('countries').select('*').eq('is_active', true).order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getViewsGivenCount(viewerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('viewer_id', viewerId);
  if (error) throw error;
  return count ?? 0;
}

export async function logProfileView(viewerId: string, viewedProfileId: string) {
  if (viewerId === viewedProfileId) return;
  const { error } = await supabase
    .from('profile_views')
    .insert({ viewer_id: viewerId, viewed_profile_id: viewedProfileId });
  if (error) throw error;
}

export async function getProfileViewCount(profileId: string, sinceDays?: number): Promise<number> {
  let query = supabase
    .from('profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('viewed_profile_id', profileId);
  if (sinceDays != null) {
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    query = query.gte('viewed_at', since);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
