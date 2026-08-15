import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Thin wrapper so screens never deal with platform checks or rejected
// promises. expo-haptics is a no-op on web (there is no vibration motor to
// talk to) and can reject on devices without a taptic engine -- neither is
// worth surfacing to the user, so every call is fire-and-forget.
//
// Used sparingly and only to confirm something REAL happened. A buzz on
// every tap becomes noise the user learns to ignore, which defeats the
// point: haptics work because they are rare enough to still mean something.

const enabled = Platform.OS !== 'web';

/** A real state change the user caused — like, save, follow. */
export function tapFeedback() {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Something completed successfully — upload published, application sent. */
export function successFeedback() {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Something failed and the user needs to notice. */
export function errorFeedback() {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
