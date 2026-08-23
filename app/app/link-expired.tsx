import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { StatusScreen } from '../src/components/StatusScreen';
import { useThemeColors } from '../src/theme';

// Canvas screen 43 DEEP LINK · EXPIRED.
//
// The seven days is not arbitrary copy -- guardian consent tokens are
// single-use and time-limited by design (supabase/functions/guardian-consent),
// because the unguessable token IS the credential. Naming the window tells a
// parent who opened a stale email why, rather than leaving them on a dead page.
export default function LinkExpired() {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusScreen
        icon="clock"
        tone="danger"
        title="This link has expired"
        body="The guardian consent link is only valid for 7 days."
        primaryLabel="Request a new link"
        onPrimary={() => router.replace('/guardian-consent')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
