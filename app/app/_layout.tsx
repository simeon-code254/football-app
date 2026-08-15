import { useEffect, useCallback } from 'react';
import { Stack, useSegments, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
// The package's own root barrel (`@expo-google-fonts/poppins`) requires
// all 18 weight/style .ttf files unconditionally in one module -- importing
// anything from it, even just `useFonts`, pulls every one of them into the
// bundle regardless of which named exports are actually used. Per-weight
// subpath imports avoid that the same way @expo/vector-icons/Feather does.
import { useFonts } from '@expo-google-fonts/poppins/useFonts';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { Poppins_800ExtraBold } from '@expo-google-fonts/poppins/800ExtraBold';
import { useThemeColors, useIsDark } from '../src/theme';
import { queryClient, persistOptions } from '../src/lib/queryClient';
import { startNetworkWatcher } from '../src/lib/network';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';
import { GlobalAlert } from '../src/components/GlobalAlert';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import * as Sentry from '@sentry/react-native';

// Crash + error reporting. Deliberately configured tighter than Sentry's
// own default snippet, because this app handles minors' personal data
// (date of birth, phone, and video of the player themselves):
//
//   sendDefaultPii: false  -- the default `true` attaches IP addresses and
//     user identifiers to every event. Not something to switch on by
//     default for an under-18 user base.
//   no Session Replay      -- mobileReplayIntegration() records the screen.
//     Replaying a minor completing the profile wizard or reviewing their own
//     footage is a privacy problem, not a debugging win. Revisit only with
//     masking configured and a real reason.
//   tracesSampleRate 0.2   -- 100% performance tracing is quota-expensive
//     and unnecessary; a fifth of traffic is plenty to spot regressions.
//
// Disabled entirely without a DSN (fresh checkout, or a contributor who
// hasn't been given one), but deliberately LEFT ON in development: there
// are no production users yet, so the ability to confirm reporting
// actually works is worth more than keeping dev noise out. Every event is
// tagged with its environment, so `environment:development` can be
// filtered out in Sentry -- and once there's real traffic, flipping this
// to `!!SENTRY_DSN && !__DEV__` silences dev again in one line.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
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

  // Teaches React Query what "online" means on a phone. Without it the
  // client assumes it is always connected (its default detection uses
  // browser window events that don't exist here), so requests on a dead
  // connection burn their full retry cycle and nothing refetches when
  // signal returns. Started once for the app's lifetime.
  useEffect(() => {
    startNetworkWatcher();
  }, []);

  const ready = fontsLoaded && sessionStatus !== 'loading';

  // Global route enforcement -- a signed-in user gets bounced to the right
  // place from anywhere (cold start with a persisted session, a deep link,
  // a direct URL on web) instead of relying on every screen to remember
  // its own guard. Three checks, one effect, ONE router.replace() at most
  // per run (each branch below returns immediately after firing one) --
  // this used to be three separate effects, which could each independently
  // decide to redirect on the same render (e.g. right after login, when
  // role/profile/segments all update together) and dispatch multiple
  // navigation actions back to back. React Navigation only cleanly handles
  // one action against a given state at a time; the second dispatch landed
  // on a navigator mid-transition and surfaced as expo-router's own
  // "onUnhandledAction" warning. Explicit priority order fixes that at the
  // root instead of chasing individual redirect races: suspension (blocks
  // everything, both roles) > incomplete player profile (must finish the
  // wizard first) > role-mismatched route (wrong tab group / wrong-role
  // top-level screen).
  const AUTH_STACK_SCREENS = new Set([
    '', 'index', 'onboarding', 'welcome', 'role-select', 'signup',
    'verify-email', 'login', 'forgot-password', 'profile-complete',
  ]);
  const SUSPENSION_EXEMPT_SCREENS = new Set([...AUTH_STACK_SCREENS, 'suspended']);
  // Root-level screens that assume a `players` row exists (ai-ratings,
  // trials, messages, profile-complete) or a `scouts` row exists
  // (scout-edit-profile, scout-verification) are directly addressable by
  // URL on web with no per-screen guard of their own -- a scout landing on
  // /ai-ratings, for example, previously fired a raw 406 from a `.single()`
  // query against a `players` row that will never exist for that account.
  // Covers two distinct route shapes: top-level ungrouped screens
  // (segments[0] is the screen's own name) AND the (player-tabs)/
  // (scout-tabs) route GROUPS themselves (segments[0] is the literal group
  // folder name, not the screen inside it -- expo-router includes group
  // segments as-is, so a scout on /(player-tabs)/profile needs the group
  // check, not just the named-screen one).
  const PLAYER_ONLY_SCREENS = new Set(['ai-ratings', 'trials', 'messages', 'profile-complete']);
  const SCOUT_ONLY_SCREENS = new Set(['scout-edit-profile', 'scout-verification']);
  useEffect(() => {
    if (!ready || sessionStatus !== 'signed-in') return;
    const top = segments[0] ?? '';

    if (profile?.is_active === false) {
      if (!SUSPENSION_EXEMPT_SCREENS.has(top)) router.replace('/suspended');
      return;
    }
    if (role === 'player' && player && !player.profile_completed) {
      if (!AUTH_STACK_SCREENS.has(top)) router.replace('/profile-complete');
      return;
    }
    if (role === 'scout' && (PLAYER_ONLY_SCREENS.has(top) || top === '(player-tabs)')) {
      router.replace('/(scout-tabs)/home');
    } else if (role === 'player' && (SCOUT_ONLY_SCREENS.has(top) || top === '(scout-tabs)')) {
      router.replace('/(player-tabs)/home');
    }
  }, [ready, sessionStatus, role, player, profile, segments]);

  const onLayoutRootView = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!ready) return null;

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <OfflineBanner />
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
    </PersistQueryClientProvider>
  );
}

// Sentry.wrap adds the touch/navigation breadcrumbs that turn a bare stack
// trace into "here's what the user actually did before it broke".
export default Sentry.wrap(RootLayout);
