import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import Animated from 'react-native-reanimated';
import { useShake } from '../lib/motion';
import { fontFamily, fontSize, spacing, useThemeColors, type ThemeColors } from '../theme';
import { useIsOnline } from '../lib/network';
import { useTranslation } from '../i18n';

// Renders nothing while online. Deliberately a thin strip rather than a
// blocking screen: cached content is still readable offline (see
// queryClient.ts), so hiding the whole app behind an error would take away
// something that still works. It only sets the expectation that what's on
// screen may be stale and that writes won't go through yet.
export function OfflineBanner() {
  const online = useIsOnline();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  if (online) return null;

  const styles = makeStyles(colors);
  const shake = useShake();
  return (
    <View
      style={[styles.bar, { paddingTop: insets.top + spacing.xs }]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Showing saved content."
    >
      {/* Canvas screen 37 shakes the offline icon. Kept to the icon rather
          than the whole banner: this bar sits under the status bar across
          every screen, and shaking the text with it makes it unreadable. */}
      <Animated.View style={shake}>
        <Feather name="wifi-off" size={13} color={colors.white} />
      </Animated.View>
      <Text style={styles.text}>{t('offline.banner')}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.textMuted,
    },
    text: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: colors.white,
    },
  });
}
