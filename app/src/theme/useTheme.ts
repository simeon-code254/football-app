import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { lightColors, darkColors, type ThemeColors } from './colors';

// Resolves the user's stored preference ('light'/'dark'/'system') against
// the OS-reported scheme when 'system' is chosen. useColorScheme() itself
// subscribes to OS changes, so this stays live if the OS theme flips while
// the app is open, not just on cold start.
export function useIsDark(): boolean {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  return mode === 'system' ? system === 'dark' : mode === 'dark';
}

export function useThemeColors(): ThemeColors {
  return useIsDark() ? darkColors : lightColors;
}
