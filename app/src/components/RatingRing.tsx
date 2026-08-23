import { View, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { cx, fontFamilyDisplay, useThemeColors, useIsDark } from '../theme';
import { useProgressRing, useCountUp } from '../lib/motion';

// The rating arc from the canvas -- a gold stroke sweeping around a warm track
// with the overall rating counting in at its centre.
//
// The canvas draws it at 64px with r=44 on a 100-unit box, a 7-unit stroke and
// stroke-dasharray 276 (= 2*pi*44, one full lap), rotated -90deg so the sweep
// starts at twelve o'clock:
//
//   <circle r="44" stroke="#EDE8D9" stroke-width="7"/>
//   <circle r="44" stroke="var(--gold)" stroke-dasharray="276"
//           stroke-dashoffset="276" style="--off:61;animation:progressRing ...">
//
// -- WHY THE ARC COLOUR CHANGES WITH THEME --
//
// Gold on the light theme is goldDark #8A5A00, not #FFC53D. The bright gold is
// 1.58:1 on a white card -- the arc would be there and unreadable. On the dark
// theme the card is dark, so the bright gold is correct and is used. This is
// the whole gold-on-light rule, and the ring is where it bites hardest because
// the arc IS the number.
const VIEW = 100;
const R = 44;
const STROKE = 7;
const CIRCUMFERENCE = 2 * Math.PI * R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function RatingRing({
  /** 0-99, the app's rating scale. Null when nothing has been measured yet. */
  value,
  /** Canvas px; the canvas draws 64 on the home card and 132 on the reveal. */
  size = cx(64),
  style,
}: {
  value: number | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  // A null rating draws an empty track and an em dash rather than a zero arc.
  // Zero is a verdict; "not measured" is not, and the two must not look alike.
  const fraction = value == null ? 0 : Math.max(0, Math.min(1, value / 99));
  const arcColor = isDark ? colors.gold : colors.goldDark;

  const animatedProps = useProgressRing(fraction, CIRCUMFERENCE);
  const numeralStyle = useCountUp(value);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        // The canvas rotates the whole SVG so the sweep starts at the top.
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={VIEW / 2}
          cy={VIEW / 2}
          r={R}
          fill="none"
          stroke={colors.track}
          strokeWidth={STROKE}
        />
        {value != null && (
          <AnimatedCircle
            cx={VIEW / 2}
            cy={VIEW / 2}
            r={R}
            fill="none"
            stroke={arcColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
          />
        )}
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.Text
          style={[
            {
              fontFamily: fontFamilyDisplay.extraBold,
              // The numeral is 26/64 of the ring in the canvas; keeping the
              // ratio means the reveal's 132px ring gets a proportionate 54px
              // numeral without a second hardcoded size.
              fontSize: Math.round(size * (26 / 64)),
              color: colors.textPrimary,
            },
            numeralStyle,
          ]}
          // The rating can grow with the OS text setting, but not so far that
          // it overflows its own ring.
          maxFontSizeMultiplier={1.3}
        >
          {value == null ? '—' : value}
        </Animated.Text>
      </View>
    </View>
  );
}
