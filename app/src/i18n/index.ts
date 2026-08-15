import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, type Locale, SUPPORTED_LOCALES } from './translations';

export { SUPPORTED_LOCALES };
export type { Locale };

const i18n = new I18n(translations);
// Falls back to English for any key a translation hasn't covered yet, so a
// partially translated locale degrades to readable English rather than
// showing a raw key like "browse.lede" to a real user.
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

/** The device's preferred language, if Matobev speaks it. */
function deviceLocale(): Locale {
  const supported = SUPPORTED_LOCALES.map((l) => l.code) as string[];
  for (const l of getLocales()) {
    // languageCode is the bare tag ("fr" from "fr-SN"), which is what
    // matters here -- a Senegalese and a French user get the same strings.
    if (l.languageCode && supported.includes(l.languageCode)) return l.languageCode as Locale;
  }
  return 'en';
}

type LocaleState = {
  /** null means "follow the device", which is the default. */
  override: Locale | null;
  setOverride: (l: Locale | null) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      override: null,
      setOverride: (override) => set({ override }),
    }),
    { name: 'matobev-locale', storage: createJSONStorage(() => AsyncStorage) }
  )
);

/** Resolved locale: explicit choice if made, otherwise the device's. */
export function activeLocale(): Locale {
  return useLocaleStore.getState().override ?? deviceLocale();
}

/**
 * Translate. Call inside a component via useTranslation() so the UI
 * re-renders when the language changes; this bare form is for the few
 * places outside React (alerts fired from repositories, for example).
 */
export function t(key: string, options?: Record<string, unknown>): string {
  i18n.locale = activeLocale();
  return i18n.t(key, options);
}

/**
 * Hook form. Subscribing to the store is what makes a language switch
 * repaint the app immediately instead of on next mount.
 */
export function useTranslation() {
  const override = useLocaleStore((s) => s.override);
  const locale = override ?? deviceLocale();
  i18n.locale = locale;
  return {
    t: (key: string, options?: Record<string, unknown>) => i18n.t(key, options),
    locale,
    setLocale: useLocaleStore.getState().setOverride,
  };
}
