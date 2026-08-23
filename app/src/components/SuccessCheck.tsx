import { View, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { cx, useThemeColors } from '../theme';
import { useBadgePop, useCheckDraw, useConfetti } from '../lib/motion';

// The green success mark: a circle that pops in, then a tick that draws itself
// onto it a beat later. The canvas uses it on upload success, payment success
// and trial-applied success, each time with the same two-part timing --
// `badgePop` on the disc and `checkDraw .5s .35s ease forwards` on the tick,
// so the tick lands after the disc has settled rather than with it.
//
// The delay is the whole effect. Drawing both at once reads as one shape
// appearing; staggering them reads as a thing being confirmed.

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The tick path on a 24-unit box, and its own length. Measured rather than
// computed at runtime: getTotalLength() needs a laid-out DOM node, which
// react-native-svg does not give us, and this path is fixed.
//
//   M5 13 l4 4 L19 7  ->  sqrt(32) + sqrt(200) ~= 5.66 + 14.14
const CHECK_PATH = 'M5 13l4 4L19 7';
const CHECK_LENGTH = Math.sqrt(32) + Math.sqrt(200);

export function SuccessCheck({
  /** Changing this replays the animation. */
  replayKey,
  size = cx(52),
  style,
}: {
  replayKey?: unknown;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const discStyle = useBadgePop(replayKey);
  const tickProps = useCheckDraw(replayKey, CHECK_LENGTH);

  return (
    <Animated.View
      style={[{ width: size, height: size }, discStyle, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Done"
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={12} fill={colors.success} />
        <AnimatedPath
          d={CHECK_PATH}
          fill="none"
          stroke={colors.white}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_LENGTH}
          animatedProps={tickProps}
        />
      </Svg>
    </Animated.View>
  );
}

// The nine falling particles the canvas scatters behind a success mark.
//
// Each gets its own delay (the canvas uses .1s to 1s) so they do not fall in
// lockstep -- identical delays collapse the burst into a single clump. The
// offsets below are the canvas's own, and the horizontal positions are spread
// across the container rather than randomised, so the burst looks the same on
// every render instead of reshuffling when the screen re-renders.
const PARTICLES = [
  { left: '12%', delay: 100, color: 'gold' },
  { left: '26%', delay: 500, color: 'success' },
  { left: '38%', delay: 900, color: 'gold' },
  { left: '50%', delay: 150, color: 'primary' },
  { left: '62%', delay: 600, color: 'gold' },
  { left: '74%', delay: 1000, color: 'success' },
  { left: '86%', delay: 550, color: 'gold' },
  { left: '20%', delay: 900, color: 'primary' },
  { left: '68%', delay: 100, color: 'gold' },
] as const;

export function Confetti({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useThemeColors();
  const tint = {
    gold: colors.gold,
    success: colors.success,
    primary: colors.primary,
  } as const;

  return (
    <View
      pointerEvents="none"
      // Decorative only -- never announced, and it carries no information that
      // is not also in the success copy beside it.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, style]}
    >
      {PARTICLES.map((p, i) => (
        <ConfettiParticle key={i} left={p.left} delay={p.delay} color={tint[p.color]} />
      ))}
    </View>
  );
}

// One particle per component, so the hook call sits at the top level of a
// component rather than inside the .map callback above.
function ConfettiParticle({
  left,
  delay,
  color,
}: {
  left: DimensionValue;
  delay: number;
  color: string;
}) {
  const style = useConfetti(delay);
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left,
          width: 6,
          height: 9,
          borderRadius: 1,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
