import { Platform } from 'react-native';
import { useAlertStore, type AlertButton } from '../store/useAlertStore';

// Drop-in replacement for RN's Alert.alert — same (title, message?, buttons?)
// signature, but works on web too. react-native-web's own Alert.alert is a
// total no-op (see node_modules/react-native-web/dist/exports/Alert —
// `static alert() {}`), so every screen that relied on it for confirmation,
// success, or error feedback was silently doing nothing on web. This renders
// a real in-app modal (see <GlobalAlert/> in app/_layout.tsx) on every
// platform instead of depending on native OS alerts that only exist on
// iOS/Android.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  // On web, RN's Modal marks the app root aria-hidden while open. If the
  // element that triggered this alert (a button/input) still has DOM focus
  // at that moment, the browser logs "Blocked aria-hidden on an element
  // because its descendant retained focus" -- blurring first avoids it.
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }
  useAlertStore.getState().show(title, message, buttons);
}
