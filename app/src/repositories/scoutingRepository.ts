import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type FolderRow = Database['public']['Tables']['saved_player_folders']['Row'];
export type SavedPlayerRow = Database['public']['Tables']['saved_players']['Row'];
export type ScoutPreferencesRow = Database['public']['Tables']['scout_preferences']['Row'];
type ScoutPreferencesUpsert = Database['public']['Tables']['scout_preferences']['Insert'];

export async function listFolders(scoutId: string): Promise<FolderRow[]> {
  const { data, error } = await supabase
    .from('saved_player_folders')
    .select('*')
    .eq('scout_id', scoutId)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createFolder(scoutId: string, name: string): Promise<FolderRow> {
  const { data, error } = await supabase
    .from('saved_player_folders')
    .insert({ scout_id: scoutId, name })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function savePlayerToFolder(scoutId: string, playerId: string, folderId: string) {
  const { error } = await supabase
    .from('saved_players')
    .upsert({ scout_id: scoutId, player_id: playerId, folder_id: folderId }, { onConflict: 'scout_id,player_id' });
  if (error) throw error;
}

export async function unsavePlayer(scoutId: string, playerId: string) {
  const { error } = await supabase
    .from('saved_players')
    .delete()
    .eq('scout_id', scoutId)
    .eq('player_id', playerId);
  if (error) throw error;
}

export async function isPlayerSaved(scoutId: string, playerId: string): Promise<SavedPlayerRow | null> {
  const { data, error } = await supabase
    .from('saved_players')
    .select('*')
    .eq('scout_id', scoutId)
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// For stat tiles ("Saved Players") that only ever needed a number.
export async function getSavedPlayersCount(scoutId: string): Promise<number> {
  const { count, error } = await supabase
    .from('saved_players')
    .select('id', { count: 'exact', head: true })
    .eq('scout_id', scoutId);
  if (error) throw error;
  return count ?? 0;
}

// Just the player IDs a scout has saved, no join -- used to filter Discover
// into a "Saved Players" view. Far cheaper than listSavedPlayers() when the
// row data itself (folder, saved-at, player summary) isn't needed, only
// which players to filter for.
export async function listSavedPlayerIds(scoutId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_players')
    .select('player_id')
    .eq('scout_id', scoutId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => r.player_id);
}

export async function getNote(scoutId: string, playerId: string): Promise<string> {
  const { data, error } = await supabase
    .from('scout_notes')
    .select('note')
    .eq('scout_id', scoutId)
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) throw error;
  return data?.note ?? '';
}

export async function upsertNote(scoutId: string, playerId: string, note: string) {
  const { error } = await supabase
    .from('scout_notes')
    .upsert({ scout_id: scoutId, player_id: playerId, note }, { onConflict: 'scout_id,player_id' });
  if (error) throw error;
}

export async function getPreferences(scoutId: string): Promise<ScoutPreferencesRow | null> {
  const { data, error } = await supabase
    .from('scout_preferences')
    .select('*')
    .eq('scout_id', scoutId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertPreferences(scoutId: string, prefs: Omit<ScoutPreferencesUpsert, 'scout_id'>) {
  const { error } = await supabase
    .from('scout_preferences')
    .upsert({ ...prefs, scout_id: scoutId }, { onConflict: 'scout_id' });
  if (error) throw error;
}

export async function getMatchScore(scoutId: string, playerId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('match_score', { p_scout_id: scoutId, p_player_id: playerId });
  if (error) throw error;
  return data;
}
