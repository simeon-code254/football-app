import { supabase } from '../lib/supabase';

// Guardian consent for under-18 players.
//
// The database is the enforcement point (migration 20260820151000 blocks
// ai_analysis uploads from a minor without confirmed consent). Everything here
// exists so the app can ask *before* the user spends data uploading a video
// that would be rejected, and so a minor has somewhere to go rather than an
// error.

export type GuardianConsent = {
  id: string;
  guardian_name: string;
  guardian_email: string;
  consents_to_ai_analysis: boolean;
  confirmed_at: string | null;
  confirmation_token: string;
};

/** The player's live (unrevoked) consent record, if any. */
export async function getMyConsent(playerId: string): Promise<GuardianConsent | null> {
  const { data, error } = await supabase
    .from('guardian_consents')
    .select('id, guardian_name, guardian_email, consents_to_ai_analysis, confirmed_at, confirmation_token')
    .eq('player_id', playerId)
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw error;
  return (data as GuardianConsent) ?? null;
}

/** Authoritative check, using the same function the upload trigger uses. */
export async function hasAiConsent(playerId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_ai_consent', { p_player_id: playerId });
  if (error) throw error;
  return !!data;
}

export async function requestConsent(
  playerId: string,
  guardian: { name: string; email: string; relationship?: string }
): Promise<GuardianConsent> {
  const { data, error } = await supabase
    .from('guardian_consents')
    .insert({
      player_id: playerId,
      guardian_name: guardian.name.trim(),
      guardian_email: guardian.email.trim(),
      guardian_relationship: guardian.relationship?.trim() || null,
      // What is being asked for. The guardian sees exactly these on the
      // confirmation page -- the page renders the record rather than a fixed
      // list, so it can never ask for more than was requested here.
      consents_to_account: true,
      consents_to_ai_analysis: true,
      consents_to_scout_contact: true,
    })
    .select('id, guardian_name, guardian_email, consents_to_ai_analysis, confirmed_at, confirmation_token')
    .single();
  if (error) throw error;
  return data as GuardianConsent;
}

/**
 * The link a guardian opens. Built from the project URL rather than hardcoded
 * so it follows the environment the app is actually pointed at.
 *
 * Shared by the player over WhatsApp or SMS rather than emailed, because that
 * is how this audience actually passes something to a parent -- and because it
 * needs no mail infrastructure to work.
 */
export function consentLink(token: string): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/functions/v1/guardian-consent?token=${token}`;
}
