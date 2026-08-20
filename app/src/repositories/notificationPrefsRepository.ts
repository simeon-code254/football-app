import { supabase } from '../lib/supabase';

// Notification types grouped the way a person thinks about them, rather
// than the way triggers happen to name them.
//
// The distinction that matters: some notifications are DISCRETIONARY (a
// scout messaged you) and some are CONSEQUENTIAL (your account was
// suspended, your video was removed). Letting someone mute the second kind
// would mean an account action happening silently, which is exactly the
// pattern app stores and regulators treat as a dark pattern. Only the
// discretionary groups are offered here; the rest always send.
export const MUTABLE_GROUPS = [
  {
    key: 'messages',
    label: 'Messages',
    description: 'A scout sends you a message',
    types: ['new_message'],
  },
  {
    key: 'trials',
    label: 'Trials',
    description: 'Invitations, and updates on trials you applied to',
    types: ['trial_invitation', 'trial_status_change'],
  },
  {
    key: 'ratings',
    label: 'AI ratings',
    description: 'When analysis finishes, and when your rating goes up',
    types: ['analysis_complete', 'analysis_skipped', 'analysis_failed', 'rating_improved'],
  },
  {
    key: 'profile_views',
    label: 'Scout interest',
    // Worded to match what the notification can honestly claim. The scout is
    // never named (see migration 20260820100000), so the description does not
    // promise a name the player will not get.
    description: 'When a scout views your profile — at most one a day',
    types: ['profile_view'],
  },
] as const;

// Never offered as mutable -- listed explicitly so the reason is visible in
// code rather than implied by absence.
export const ALWAYS_SEND_TYPES = ['account_suspension', 'video_moderation', 'scout_verification'];

export type NotificationPrefs = {
  muted_types: string[];
  quiet_from_minute: number | null;
  quiet_to_minute: number | null;
};

export async function getPrefs(profileId: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('muted_types, quiet_from_minute, quiet_to_minute')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data ?? { muted_types: [], quiet_from_minute: null, quiet_to_minute: null };
}

export async function savePrefs(profileId: string, prefs: NotificationPrefs) {
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      profile_id: profileId,
      muted_types: prefs.muted_types,
      quiet_from_minute: prefs.quiet_from_minute,
      quiet_to_minute: prefs.quiet_to_minute,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' }
  );
  if (error) throw error;
}

// Quiet hours are stored as minutes past midnight UTC, because the send
// path (an Edge Function with no access to the user's timezone) compares
// against UTC. The conversion happens here, where the device's own offset
// is actually known.
//
// Known limitation, stated rather than hidden: the offset is captured when
// the setting is saved. Someone who later moves timezone, or lives
// somewhere observing DST, would need to re-save for the window to line up
// again. Most of this app's market does not observe DST, and the failure
// mode is a notification arriving an hour off rather than anything broken.
export function localMinutesToUtc(localMinutes: number): number {
  const offsetMin = new Date().getTimezoneOffset(); // UTC = local + offset
  return ((localMinutes + offsetMin) % 1440 + 1440) % 1440;
}

export function utcMinutesToLocal(utcMinutes: number): number {
  const offsetMin = new Date().getTimezoneOffset();
  return ((utcMinutes - offsetMin) % 1440 + 1440) % 1440;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
