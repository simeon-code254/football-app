import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

// Persisted via the same AsyncStorage already used as Supabase's own auth
// session storage adapter (src/lib/supabase.ts) -- no new dependency.
// 'system' (follow OS) is the default so installing the app doesn't force
// either theme on someone who hasn't chosen one yet.
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'matobev-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
