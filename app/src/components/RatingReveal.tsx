import { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, gradients, useThemeColors, type ThemeColors, useIsDark, elevation } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { successFeedback } from '../lib/haptics';

// The one orchestrated moment in the app.
//
// Getting rated is the whole reason a player is here, and until now the
// number simply appeared in a list. Everything else in this codebase is
// deliberately restrained about motion -- this is the single place where a
// real moment is worth building, because it is the emotional peak of the
// product and the thing someone screenshots and sends to their friends.
//
// ReduceMotion.System on every animation means the OS setting is honoured
// automatically rather than by hand: with it on, values jump to their end
// state instead of animating.
export function RatingReveal({
  visible,
  rating,
  attributesAssessed,
  attributesTotal,
  lowConfidence = false,
  onClose,
}: {
  visible: boolean;
  rating: number;
  attributesAssessed: number;
  attributesTotal: number;
  // True when at least one contributing attribute was scored at Low
  // confidence. This is the app's most celebratory moment, which is exactly
  // why it has to be honest: a number delivered with fanfare is the one a
  // player remembers and repeats.
  lowConfidence?: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);

  const badgeScale = useSharedValue(0.4);
  const badgeOpacity = useSharedValue(0);
  const detailY = useSharedValue(14);
  const detailOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      badgeScale.value = 0.4;
      badgeOpacity.value = 0;
      detailY.value = 14;
      detailOpacity.value = 0;
      return;
    }

    // The badge lands first with a slight overshoot, then the supporting
    // text follows -- sequenced rather than everything moving at once, so
    // the eye is led to the number.
    badgeOpacity.value = withTiming(1, { duration: 180, reduceMotion: ReduceMotion.System });
    badgeScale.value = withSequence(
      withSpring(1.08, { damping: 9, stiffness: 140, reduceMotion: ReduceMotion.System }),
      withSpring(1, { damping: 14, stiffness: 160, reduceMotion: ReduceMotion.System })
    );
    detailOpacity.value = withDelay(220, withTiming(1, { duration: 260, reduceMotion: ReduceMotion.System }));
    detailY.value = withDelay(
      220,
      withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System })
    );

    successFeedback();
    // Screen readers get the result announced directly -- the animation
    // conveys nothing to them, so the substance has to be spoken.
    AccessibilityInfo.announceForAccessibility(
      `Your rating is ready. Overall ${rating}, based on ${attributesAssessed} of ${attributesTotal} attributes.${
        lowConfidence ? ' Some values were low confidence because the footage was hard to measure.' : ''
      }`
    );
  }, [visible, rating, attributesAssessed, attributesTotal, lowConfidence, badgeScale, badgeOpacity, detailY, detailOpacity]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));
  const detailStyle = useAnimatedStyle(() => ({
    opacity: detailOpacity.value,
    transform: [{ translateY: detailY.value }],
  }));

  const provisional = attributesAssessed < attributesTotal;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View accessibilityViewIsModal style={styles.backdrop}>
        <View style={[styles.sheet, elevation('overlay', isDark)]}>
          <Animated.View style={badgeStyle}>
            <LinearGradient colors={gradients.primaryButton} style={styles.badge}>
              <Text style={styles.badgeValue}>{rating}</Text>
              <Text style={styles.badgeLabel}>OVR</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={[detailStyle, styles.detail]}>
            <Text style={styles.title}>Your rating is ready</Text>
            {/* Honest by default. The engine currently scores a subset of
                attributes, and saying so plainly is worth more than a
                confident number a scout later finds hollow. */}
            <Text style={styles.sub}>
              {provisional
                ? `Provisional — ${attributesAssessed} of ${attributesTotal} attributes assessed so far.`
                : `All ${attributesTotal} attributes assessed.`}
            </Text>
            {lowConfidence && (
              // Deliberately not softened away at the celebration. Telling
              // someone their footage was hard to read costs a little of the
              // moment; letting them believe a shaky number is a verdict on
              // them costs more.
              <Text style={styles.sub}>
                Some values were hard to measure in your footage — clearer video will improve them.
              </Text>
            )}

            <PrimaryButton label="See the breakdown" onPress={onClose} style={{ width: '100%', marginTop: spacing.lg }} />
            <Pressable onPress={onClose} hitSlop={10} style={styles.later} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.laterText}>Close</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: spacing.xxl },
    sheet: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xxl, alignItems: 'center' },
    badge: {
      width: 104,
      height: 104,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeValue: { fontFamily: fontFamily.extraBold, fontSize: 38, color: colors.white, lineHeight: 42 },
    badgeLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.white, letterSpacing: 1 },
    detail: { alignSelf: 'stretch', alignItems: 'center', marginTop: spacing.lg },
    title: { fontFamily: fontFamily.bold, fontSize: fontSize.heading, color: colors.textPrimary, textAlign: 'center' },
    sub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 19,
    },
    later: { marginTop: spacing.md, paddingVertical: spacing.sm },
    laterText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textMuted },
  });
}
