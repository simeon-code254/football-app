import { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
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
import { colors } from '../src/theme';
import { queryClient } from '../src/lib/queryClient';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';

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
  const hydrate = useSessionStore((s) => s.hydrate);

  useEffect(() => {
    authRepository.getSession().then(hydrate);
    const subscription = authRepository.onAuthStateChange((session) => {
      hydrate(session);
    });
    return () => subscription.unsubscribe();
  }, [hydrate]);

  const ready = fontsLoaded && sessionStatus !== 'loading';

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
          <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="compare" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="scout-edit-profile" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="messages" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </View>
    </QueryClientProvider>
  );
}
