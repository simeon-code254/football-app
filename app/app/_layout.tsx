import { useEffect, useCallback } from 'react';
import { Stack, useSegments, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import { useThemeColors, useIsDark } from '../src/theme';
import { queryClient } from '../src/lib/queryClient';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';
import { GlobalAlert } from '../src/components/GlobalAlert';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  const sessionStatus = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.role);
  const player = useSessionStore((s) => s.player);
  const profile = useSessionStore((s) => s.profile);
  const hydrate = useSessionStore((s) => s.hydrate);
  const segments = useSegments();
  const colors = useThemeColors();
  const isDark = useIsDark();

  useEffect(() => {
    authRepository.getSession().then(hydrate);
    const subscription = authRepository.onAuthStateChange((session) => {
      hydrate(session);
    });
    return () => subscription.unsubscribe();
  }, [hydrate]);

  const ready = fontsLoaded && sessionStatus !== 'loading';

  // Global enforcement, not just a redirect after signup/login: a signed-in
  // player with an incomplete profile gets bounced back to the wizard from
  // anywhere — cold start with a persisted session, a deep link, any future
  // entry point — instead of relying on every screen that routes a player
  // in to remember this check individually.
  const AUTH_STACK_SCREENS = new Set([
    '', 'index', 'onboarding', 'welcome', 'role-select', 'signup',
    'verify-email', 'login', 'forgot-password', 'profile-complete',
  ]);
  useEffect(() => {
    if (!ready || sessionStatus !== 'signed-in' || role !== 'player' || !player) return;
    if (profile?.is_active === false) return; // suspension gate below takes priority
    const top = segments[0] ?? '';
    if (!player.profile_completed && !AUTH_STACK_SCREENS.has(top)) {
      router.replace('/profile-complete');
    }
  }, [ready, sessionStatus, role, player, profile, segments]);

  // Same enforcement shape as above, but keyed only on profile (applies to
  // both roles — an admin can suspend a scout too, not just players). A
  // real UI-level lockout: hides the whole app behind /suspended, though it
  // doesn't block writes at the RLS layer (a separate, larger change) and
  // won't evict someone already mid-session until their next auth event.
  const SUSPENSION_EXEMPT_SCREENS = new Set([...AUTH_STACK_SCREENS, 'suspended']);
  useEffect(() => {
    if (!ready || sessionStatus !== 'signed-in' || !profile) return;
    const top = segments[0] ?? '';
    if (profile.is_active === false && !SUSPENSION_EXEMPT_SCREENS.has(top)) {
      router.replace('/suspended');
    }
  }, [ready, sessionStatus, profile, segments]);

  const onLayoutRootView = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="role-select" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="verify-email" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="profile-complete" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="(player-tabs)" />
            <Stack.Screen name="(scout-tabs)" />
            <Stack.Screen name="player/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="trial/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="scout-verification" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="trials" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="news" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ai-ratings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="suspended" />
            <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="compare" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="scout-edit-profile" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="messages" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account-settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="security-settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="privacy-settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="help-settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="theme-settings" options={{ animation: 'slide_from_right' }} />
          </Stack>
          <GlobalAlert />
        </ErrorBoundary>
      </View>
    </QueryClientProvider>
  );
}
