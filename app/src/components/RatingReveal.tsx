import { Modal, View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  kicker,
  spacing,
  useThemeColors,
} from '../theme';
import { useBadgePop, usePing, useProgressRing } from '../lib/motion';
import { Button } from './Button';
import { Confetti } from './SuccessCheck';

// Canvas screen 11 RATING REVEAL. The one unambiguously celebratory moment in
// the app, and the only place the rating is the entire screen.
//
//   navy ground + radial gold glow at 50% 40%, .22, transparent 55%
//   three confetti particles
//   "OVERALL RATING"                    .mono 10px rgba(255,255,255,.55)
//   190px ring: r=90 on a 200 box, stroke 5, track rgba(255,197,61,.15),
//     gold arc, dasharray 565, progressRing 1.5s
//   inner navy disc inset 16px, numeral 76px gold, letter-spacing -3,
//     badgePop .8s
//   ping ring inset -10px
//   "Your rating is ready."             .h 20px w800
//   "Right-back · 6 of 6 attributes measured"
//   [See the breakdown]  gold on navy
//
// -- THE SUBTITLE IS NOT DECORATION --
//
// "6 of 6 attributes measured" is the honesty line. A rating computed from
// four of ten attributes is a different claim from one computed from ten, and
// this screen is the most persuasive surface in the product -- a big gold
// number on a dark ground reads as authoritative whether or not it has earned
// it. The count, and the low-confidence note under it, are what keep the
// celebration truthful.
const RING = cx(190);
const VIEW = 200;
const R = 90;
const CIRCUMFERENCE = 2 * Math.PI * R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function RatingReveal({
  visible,
  rating,
  attributesAssessed,
  attributesTotal,
  position,
  lowConfidence = false,
  onClose,
}: {
  visible: boolean;
  rating: number;
  attributesAssessed: number;
  attributesTotal: number;
  /** Shown before the attribute count, as the canvas does ("Right-back · …"). */
  position?: string | null;
  lowConfidence?: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const fraction = Math.max(0, Math.min(1, rating / 99));
  const arcProps = useProgressRing(fraction, CIRCUMFERENCE, 1500);
  const numeralStyle = useBadgePop(visible ? rating : null, 800);
  const ping = usePing(2200);

  const partial = attributesTotal > 0 && attributesAssessed < attributesTotal;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.root}>
        {/* radial-gradient(circle at 50% 40%, rgba(255,197,61,.22), transparent 55%) */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="revealGlow" cx="50%" cy="40%" r="55%">
              <Stop offset="0" stopColor="#FFC53D" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#FFC53D" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#revealGlow)" />
        </Svg>

        <Confetti />

        <View style={styles.body}>
          <Text style={styles.kicker}>Overall rating</Text>

          <View style={styles.ringWrap}>
            <Animated.View style={[styles.pingRing, ping]} pointerEvents="none" />
            <Svg
              width={RING}
              height={RING}
              viewBox={`0 0 ${VIEW} ${VIEW}`}
              style={{ transform: [{ rotate: '-90deg' }] }}
            >
              <Circle
                cx={VIEW / 2}
                cy={VIEW / 2}
                r={R}
                fill="none"
                stroke="rgba(255,197,61,0.15)"
                strokeWidth={5}
              />
              <AnimatedCircle
                cx={VIEW / 2}
                cy={VIEW / 2}
                r={R}
                fill="none"
                stroke={colors.gold}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                animatedProps={arcProps}
              />
            </Svg>
            {/* The canvas fills the middle with the ground colour so the arc
                reads as a rim rather than a filled dial. */}
            <View style={styles.disc}>
              <Animated.Text style={[styles.numeral, numeralStyle]} maxFontSizeMultiplier={1.15}>
                {rating}
              </Animated.Text>
            </View>
          </View>

          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Your rating is ready.
          </Text>

          <Text style={styles.subtitle}>
            {[position, `${attributesAssessed} of ${attributesTotal} attributes measured`]
              .filter(Boolean)
              .join(' · ')}
          </Text>

          {/*
            Two qualifications, shown when they apply rather than hidden to
            keep the moment clean. A partial rating and a low-confidence one
            are different problems and read differently, so they are separate
            lines rather than one hedge.
          */}
          {partial && (
            <Text style={styles.caveat}>
              Provisional — more clips will fill in the rest.
            </Text>
          )}
          {lowConfidence && (
            <Text style={styles.caveat}>
              Some attributes were hard to measure in this footage.
            </Text>
          )}

          <Button
            label="See the breakdown"
            variant="gold"
            onPress={onClose}
            style={styles.cta}
          />
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.primaryDark },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: cx(26),
    },
    kicker: {
      ...kicker,
      fontSize: fontSize.caption,
      color: 'rgba(255,255,255,0.55)',
      marginBottom: spacing.sm,
    },
    ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
    pingRing: {
      position: 'absolute',
      width: RING + cx(10) * 2,
      height: RING + cx(10) * 2,
      borderRadius: (RING + cx(10) * 2) / 2,
      borderWidth: 1,
      borderColor: 'rgba(255,197,61,0.3)',
    },
    disc: {
      position: 'absolute',
      top: cx(16),
      right: cx(16),
      bottom: cx(16),
      left: cx(16),
      borderRadius: RING,
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numeral: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: cx(76),
      lineHeight: cx(84),
      letterSpacing: -3,
      color: colors.gold,
    },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.headingLg,
      color: colors.white,
      marginTop: cx(22),
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: 'rgba(255,255,255,0.55)',
      marginTop: 6,
      textAlign: 'center',
    },
    caveat: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: colors.gold,
      marginTop: 6,
      textAlign: 'center',
    },
    cta: { marginTop: spacing.xl, paddingHorizontal: cx(22), alignSelf: 'stretch' },
  });
}
