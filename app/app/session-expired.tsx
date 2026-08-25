import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusScreen } from '../src/components/StatusScreen';
import { useThemeColors } from '../src/theme';

// Canvas screen 35.
//
// Until now an expired refresh token dropped the user at the welcome screen
// with no explanation at all: the auth listener saw a null session, the root
// layout's gate stopped applying, and they simply found themselves signed
// out mid-task. For a player who was part-way through an upload that reads
// as the app losing their work for no reason.
//
// Reached only from an INVOLUNTARY sign-out. authRepository flags every
// deliberate one -- Sign Out, Sign Out Everywhere, Delete Account -- so
// someone who chose to leave never sees this.
export default function SessionExpired() {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusScreen
        icon="clock"
        title="You've been signed out"
        body="Your session expired for security. Sign in again to pick up where you left off."
        primaryLabel="Sign in"
        onPrimary={() => router.replace('/login')}
      />
    </SafeAreaView>
  );
}
