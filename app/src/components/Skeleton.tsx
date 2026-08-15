import { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Easing, AccessibilityInfo, type ViewStyle } from 'react-native';
import { radii, spacing, useThemeColors, type ThemeColors } from '../theme';

// Perceived speed is judged separately from actual speed: structure painted
// immediately reads as faster than a spinner that finishes sooner, because
// the user can already see what is arriving. These shapes intentionally
// mirror the real content's layout so nothing jumps when data lands.
//
// Built on React Native's own Animated rather than reanimated -- this is a
// single looping opacity, which the JS driver handles fine with
// useNativeDriver, and it avoids adding a native dependency purely for a
// shimmer.

function usePulse(): Animated.Value {
  const value = useRef(new Animated.Value(0.4)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Respect the OS "reduce motion" setting -- a constantly pulsing screen
    // is exactly the kind of thing that setting exists to stop.
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      value.setValue(0.6); // steady, no animation
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, value]);

  return value;
}

/** One placeholder block. Compose these into screen-shaped skeletons. */
export function SkeletonBlock({
  width,
  height,
  radius = radii.sm,
  style,
}: {
  width?: ViewStyle['width'];
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const colors = useThemeColors();
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: radius, backgroundColor: colors.skeleton, opacity },
        style,
      ]}
    />
  );
}

// The whole skeleton is announced once as "Loading" rather than letting a
// screen reader crawl a dozen meaningless empty blocks.
function SkeletonGroup({ children }: { children: React.ReactNode }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading">
      {children}
    </View>
  );
}

/** Avatar + two text lines. Matches PlayerCard / conversation rows. */
export function SkeletonRow({ count = 6 }: { count?: number }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <SkeletonGroup>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonBlock width={44} height={44} radius={radii.pill} />
          <View style={styles.rowText}>
            <SkeletonBlock width="55%" height={12} />
            <SkeletonBlock width="35%" height={10} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Large media cards. Matches ScoutPlayerCard / news / trial cards. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <SkeletonGroup>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBlock height={150} radius={radii.lg} />
          <SkeletonBlock width="65%" height={13} style={{ marginTop: spacing.md }} />
          <SkeletonBlock width="40%" height={11} style={{ marginTop: spacing.sm }} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Header block + stat strip. Matches the profile screens. */
export function SkeletonProfile() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <SkeletonGroup>
      <View style={styles.profileHead}>
        <SkeletonBlock width={86} height={86} radius={radii.pill} />
        <SkeletonBlock width="45%" height={15} style={{ marginTop: spacing.lg }} />
        <SkeletonBlock width="30%" height={11} style={{ marginTop: spacing.sm }} />
      </View>
      <View style={styles.statRow}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} height={68} radius={radii.lg} style={{ flex: 1 }} />
        ))}
      </View>
    </SkeletonGroup>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    rowText: { flex: 1, marginLeft: spacing.md },
    card: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    profileHead: { alignItems: 'center', paddingVertical: spacing.xxl },
    statRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  });
}
