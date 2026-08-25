import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusScreen } from '../src/components/StatusScreen';
import { useThemeColors } from '../src/theme';

// Canvas screen 36. Expo Router has a built-in fallback for unmatched routes,
// but it is developer-facing -- it prints "Unmatched Route" and the path. Any
// user who follows a stale share link or a deep link to a profile that has
// since been removed lands on it, so it is worth a real screen.
//
// Deep links are the realistic way to arrive here: the app shares player
// profiles and trial invitations by URL, and both can outlive their target.
export default function NotFound() {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
      <StatusScreen
        glyph="404"
        title="Page not found"
        body="This link may be old, or the profile or trial it pointed to was removed."
        primaryLabel="Back to home"
        // dismissTo rather than back(): someone arriving from a cold deep
        // link has no history to go back to, and back() would do nothing.
        onPrimary={() => router.dismissTo('/')}
      />
    </SafeAreaView>
  );
}
