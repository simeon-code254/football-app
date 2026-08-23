import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { StatusScreen } from '../src/components/StatusScreen';
import { useThemeColors } from '../src/theme';

// Canvas screen 37 NO CONNECTION.
//
// "What you already loaded is still here" is the load-bearing sentence. This
// app persists its query cache (queryClient.ts), so going offline genuinely
// does not empty the screens behind this one -- saying so stops a user on a
// patchy connection assuming their profile is gone.
export default function NoConnection() {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusScreen
        icon="wifi-off"
        tone="danger"
        title="You're offline"
        body="Check your connection. What you already loaded is still here."
        primaryLabel="Retry"
        onPrimary={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
