import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

// The published legal documents, and how to show them.
//
// Hosted on GitHub Pages rather than Supabase. Both Supabase routes refuse to
// serve a browsable HTML page by design: Storage overrides a stored text/html
// mimetype to text/plain, and Edge Functions get a sandboxing
// Content-Security-Policy applied to browser navigations. Neither is
// configurable.
const BASE = 'https://simeon-code254.github.io/football-app';

export const LEGAL_URLS = {
  privacy: `${BASE}/privacy-policy`,
  terms: `${BASE}/terms-of-service`,
} as const;

export type LegalDoc = keyof typeof LEGAL_URLS;

/**
 * Opens a document in an in-app browser sheet rather than handing the user to
 * Chrome or Safari.
 *
 * This matters most at signup. Someone part-way through creating an account
 * who taps "Privacy Policy" should be able to read it and come straight back
 * to the form they were filling in -- leaving the app mid-signup is a good way
 * to lose them, and worse, a good way for them to give up and accept without
 * reading. The whole point of making these documents reachable is that people
 * actually read them.
 *
 * Falls back to the system browser if the in-app sheet is unavailable, and on
 * web where openBrowserAsync has nothing to open into.
 */
export async function openLegal(doc: LegalDoc): Promise<void> {
  const url = LEGAL_URLS[doc];
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url, {
      // Matches the app's header so the sheet does not look like a different
      // product. Deliberately light: these pages follow the system theme and
      // a light chrome reads correctly against both.
      toolbarColor: '#FFFFFF',
      // Canvas navy2. This was still the old teal brand colour, which is
      // the one place in the app it survived the re-skin -- it sets the
      // Chrome Custom Tab chrome, so it never appears in a screenshot of
      // the app itself.
      controlsColor: '#123A6B',
      enableBarCollapsing: true,
    });
  } catch {
    await Linking.openURL(url);
  }
}
