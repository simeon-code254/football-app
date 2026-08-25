import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { StatusScreen } from '../src/components/StatusScreen';
import { useThemeColors } from '../src/theme';

// Canvas screen 45 MAINTENANCE.
//
// No action button, deliberately: there is nothing the user can do, and a
// "Retry" that cannot succeed is worse than no button. The canvas draws none
// either.
export default function Maintenance() {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusScreen
        icon="clock"
        title="Quick maintenance"
        body="We're improving the AI rating model. Back in about 20 minutes."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
