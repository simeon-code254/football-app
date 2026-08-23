import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { StatusScreen } from '../src/components/StatusScreen';
import { useThemeColors } from '../src/theme';

// Canvas screen 38 SERVER ERROR 500.
//
// "it's not you. We've been notified." -- both halves matter. The first stops
// the user retrying something that was never their fault; the second is only
// honest because Sentry is actually wired up in _layout.tsx. If reporting were
// ever removed, this copy would have to change with it.
export default function ServerError() {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusScreen
        icon="alert-triangle"
        tone="danger"
        title="Something broke on our end"
        body="Error 500 · it's not you. We've been notified."
        primaryLabel="Try again"
        onPrimary={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
