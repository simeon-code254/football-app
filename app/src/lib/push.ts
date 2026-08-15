import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Push registration.
//
// Deliberately NOT called on first launch. Industry data is consistent on
// this: asking for permission cold gets refused, and a refusal on iOS is
// effectively permanent -- the OS will not show the prompt again, and the
// only way back is the Settings app. Asking after the user has done
// something that makes notifications obviously useful (uploaded a clip,
// applied to a trial) is what lifts opt-in from roughly half to around
// two thirds. The priming screen in the app explains WHAT will be sent
// before this ever runs.

export async function isPushAvailable(): Promise<boolean> {
  // Simulators cannot receive push at all, so prompting there only teaches
  // the developer that it "doesn't work".
  return Device.isDevice && Platform.OS !== 'web';
}

/** Current OS-level permission without prompting. */
export async function getPushPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!(await isPushAvailable())) return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

/**
 * Prompts for permission (if not already decided) and stores the resulting
 * Expo push token against the signed-in profile. Returns false when push
 * is unavailable or the user declined -- callers should treat that as a
 * normal outcome, not an error.
 */
export async function registerForPush(profileId: string): Promise<boolean> {
  if (!(await isPushAvailable())) return false;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    // Only ever prompt when the OS still considers this undecided. Calling
    // request again after a denial silently resolves 'denied' on iOS and
    // just wastes a round-trip.
    if (!existing.canAskAgain) return false;
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return false;

  // projectId is required for getExpoPushTokenAsync in SDK 49+. It comes
  // from EAS config; without it the call throws rather than returning a
  // token, so fail closed instead of surfacing a crash.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return false;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (!token) return false;

  // Upsert on the token itself: reinstalling or handing the phone to
  // another account must REASSIGN that device rather than leave it
  // delivering the previous user's notifications.
  const { error } = await supabase.from('push_tokens').upsert(
    {
      token,
      profile_id: profileId,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );
  if (error) throw error;
  return true;
}

/** Called on sign-out so the device stops receiving that account's pushes. */
export async function unregisterPush(profileId: string) {
  if (!(await isPushAvailable())) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;
    await supabase.from('push_tokens').delete().eq('token', token).eq('profile_id', profileId);
  } catch {
    // Sign-out must never fail because of push cleanup.
  }
}
