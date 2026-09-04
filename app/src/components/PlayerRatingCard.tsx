import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import { useCountUp } from '../lib/motion';
import {
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  kicker,
  radii,
  spacing,
  elevation,
  useThemeColors,
  useIsDark,
} from '../theme';

// The player's rating, drawn as the design canvas draws it: a white card
// carrying a circular progress ring, the rating inside it, and the top
// attributes as chips alongside.
//
// This replaces a FIFA-style football card. That version borrowed a grammar
// these users read fluently, but the canvas is right that a ring is the
// better instrument here -- a football card states a settled verdict, and a
// ring shows a position on a journey, which is what a rating out of 99 for a
// 16-year-old actually is.
//
// -- SIZES --
//
// The canvas is drawn inside a 266px phone frame; a real device is ~390pt
// across, so every canvas dimension is scaled by ~1.52 before use. That is
// why the ring is 92 here and 64 there, and why the canvas's 7-8.5px labels
// land on this app's 10-11pt caption sizes rather than being copied
// literally. Copying them would have put text at 7pt on a real phone.
//
// -- THE RING COLOUR --
//
// This used to deviate from the canvas. The old gold arc measured 1.29:1
// against its own warm track -- very nearly invisible at 92pt, against the 3:1
// WCAG 1.4.11 asks of a graphic that carries meaning -- so the light theme
// substituted a darker tone.
//
// The re-skinned palette removes the need: the accent is 4.54:1 on the muted
// track it now sits on, and the token resolves to a lighter value on the dark
// theme by itself. So the arc takes `colors.gold` directly, which is what the
// canvas draws.
//
// -- CONFIDENCE IS MARKED, NEVER HIDDEN --
//
// The engine earns a confidence per attribute (ai-service confidence.py) and
// player_attribute_scores.confidence is `not null check (confidence in
// ('High','Medium','Low'))`.
//
// This matters because the values are on the 0-99 scale -- the same scale a
// player reads fluently from FIFA, where 99 is world class. A "1" for pace in
// that grammar says a teenager cannot run. What it usually means is that the
// analysis could not see them move, which is a statement about our footage
// and our detector, not about the player.
//
// So a low-confidence value is shown at full honesty but visibly qualified:
// the number stays, rendered in the muted tone with a marker, and the card
// says plainly what the marker means. Nothing is suppressed -- a scout still
// sees every number the engine produced -- but nobody is told they are a 1
// out of 99 as though we were sure.
export type AttributeConfidence = 'High' | 'Medium' | 'Low';

export type RatingAttribute = {
  key: string;
  displayName: string;
  value: number | null;
  confidence?: AttributeConfidence | null;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The scale's ceiling, matching the database CHECK on overall_rating. The
// ring is a fraction of this, not of 100.
const RATING_MAX = 99;

const RING_SIZE = 92;
const RING_RADIUS = 44; // in the 100x100 viewBox, matching the canvas
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function PlayerRatingCard({
  name,
  rating,
  position,
  countryCode,
  attributes,
  assessedCount,
  totalCount,
  onPressReport,
}: {
  name: string;
  rating: number | null;
  position?: string | null;
  countryCode?: string | null;
  attributes: RatingAttribute[];
  assessedCount: number;
  totalCount: number;
  onPressReport: () => void;
}) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);

  // Canvas 10 (28 Aug) widened this from three chips to the full six-across
  // grid -- PAC DRI SHO DEF PAS PHY. Still capped rather than unbounded: the
  // attribute set is table-driven (attribute_definitions), so a seventh row
  // added there must not silently reflow the home card.
  const rated = attributes.filter((a) => a.value != null).slice(0, 6);
  const provisional = assessedCount > 0 && assessedCount < totalCount;

  // The overall is a confidence- and position-weighted mean over whatever has
  // been scored (recalc_player_overall), so a Low-confidence attribute still
  // moves the headline. If any contributing attribute is Low, the headline
  // inherits the qualification -- otherwise the card would carefully qualify
  // "1 PAC" while presenting the overall it produced as settled fact.
  const anyLow = attributes.some((a) => a.value != null && a.confidence === 'Low');

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(
      rating != null ? Math.min(rating, RATING_MAX) / RATING_MAX : 0,
      { duration: 900, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }
    );
  }, [rating, progress]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  // Canvas countUp: the number arrives from 8px above as it fades in, keyed
  // on the rating so a changed rating animates in again rather than sitting
  // still. Despite the name it is not a numeric counter in the canvas either.
  const numeralEntrance = useCountUp(rating);

  const arcColor = colors.gold;

  return (
    <View style={[styles.card, elevation('raised', isDark)]}>
      <View style={styles.row}>
        <View
          style={styles.ringWrap}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={
            rating == null
              ? 'Not yet rated'
              : `Overall rating ${Math.round(rating)} out of ${RATING_MAX}${
                  anyLow ? ', based partly on low-confidence analysis' : ''
                }`
          }
        >
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 100 100">
            <Circle
              cx={50}
              cy={50}
              r={RING_RADIUS}
              fill="none"
              stroke={colors.surfaceMuted}
              strokeWidth={7}
            />
            {/* -90deg so the arc starts at twelve o'clock, as the canvas does. */}
            <AnimatedCircle
              cx={50}
              cy={50}
              r={RING_RADIUS}
              fill="none"
              stroke={arcColor}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={arcProps}
              transform="rotate(-90 50 50)"
            />
          </Svg>
          <Animated.View style={[styles.ringCentre, numeralEntrance]} pointerEvents="none">
            <Text style={styles.rating} maxFontSizeMultiplier={1.3}>
              {rating != null ? Math.round(rating) : '–'}
            </Text>
            {anyLow && rating != null && <Text style={styles.ratingMark}>{'·'}</Text>}
          </Animated.View>
        </View>

        <View style={styles.details}>
          <Text style={styles.kicker} numberOfLines={1}>
            {['OVR', position, countryCode?.toUpperCase()].filter(Boolean).join(' · ')}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>

          {rated.length > 0 ? (
            <View style={styles.chips}>
              {rated.map((a) => {
                const low = a.confidence === 'Low';
                return (
                  <View
                    key={a.key}
                    style={styles.chip}
                    // One label for the pair, so a screen reader says
                    // "Pace 1, low confidence" rather than reading a loose
                    // number and an abbreviation it cannot expand.
                    accessible
                    accessibilityLabel={`${a.displayName} ${a.value}${low ? ', low confidence' : ''}`}
                  >
                    <Text style={styles.chipKey} numberOfLines={1}>
                      {a.key.slice(0, 3)}
                    </Text>
                    <View style={styles.chipValueRow}>
                      {/* The number is never removed, only de-emphasised to
                          the muted tone -- which is contrast-checked to AA in
                          both palettes, so "qualified" never means "hard to
                          read". */}
                      <Text style={[styles.chipValue, low && styles.chipValueLow]}>{a.value}</Text>
                      {low && <Text style={styles.chipMark}>{'·'}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.pending}>
              {assessedCount === 0 ? 'Upload a highlight to get rated' : 'Analysis in progress'}
            </Text>
          )}
        </View>
      </View>

      {(anyLow || provisional) && (
        <Text style={styles.footnote}>
          {[
            anyLow && 'A dot marks a number the analysis is not confident about.',
            provisional && `Rated on ${assessedCount} of ${totalCount} attributes so far.`,
          ]
            .filter(Boolean)
            .join(' ')}
        </Text>
      )}

      <Pressable
        onPress={onPressReport}
        style={styles.reportBtn}
        accessibilityRole="button"
        accessibilityLabel="View full rating report"
      >
        <Text style={styles.reportText}>Full report</Text>
        <Feather name="arrow-right" size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      marginHorizontal: spacing.lg,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    ringWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCentre: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rating: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: 38,
      lineHeight: 42,
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    ratingMark: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: 22,
      lineHeight: 26,
      color: colors.textMuted,
      marginLeft: 2,
    },
    details: { flex: 1, gap: 2 },
    kicker: { ...kicker, fontSize: fontSize.caption, color: colors.textMuted },
    name: {
      fontFamily: fontFamilyDisplay.bold,
      fontSize: fontSize.headingLg,
      color: colors.textPrimary,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
    chip: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: radii.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: 2,
    },
    chipKey: { ...kicker, fontSize: fontSize.caption, color: colors.textMuted },
    chipValueRow: { flexDirection: 'row', alignItems: 'flex-start' },
    chipValue: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.heading,
      color: colors.textPrimary,
    },
    chipValueLow: { color: colors.textMuted },
    chipMark: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginLeft: 1,
    },
    pending: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    footnote: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: 16,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
    reportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    reportText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.bodySm,
      color: colors.primary,
    },
  });
}
