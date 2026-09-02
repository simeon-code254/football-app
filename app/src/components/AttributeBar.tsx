import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { fontFamilyDisplay, fontSize, spacing, useThemeColors } from '../theme';
import { useBarGrow } from '../lib/motion';
import { Kicker } from './Kicker';

// One FIFA-style attribute row from the canvas (screen 12):
//
//   <div class="h" style="font-size:11px">
//     <span>PAC · Pace</span><b>81</b></div>
//   <div style="height:5px;background:#E5E7EA;border-radius:3px;overflow:hidden">
//     <div style="height:100%;background:var(--success);width:81%;
//                 animation:barGrow 1s ease forwards"></div>
//
// -- THE FILL COLOUR IS A VALUE SCALE, NOT A CONFIDENCE ONE --
//
// The canvas colours the fill by the value: 81, 72 and 74 are --success, while
// 58, 65 and 68 are --goldDp. The break is at 70. That is a statement about the
// rating, not about how sure we are of it, and the two must not be conflated --
// see `confidence` below.
//
// -- TWO DELIBERATE DEVIATIONS FROM THE CANVAS --
//
// 1. The track uses colors.track (#EDE8D9) rather than the canvas's #E5E7EA
//    here. The canvas uses the warm #EDE8D9 for the rating ring's track 39
//    times and this cool grey 13 times; on a warm paper ground the cool one
//    reads as a rendering artefact, and one track colour beats two.
//
// 2. The canvas draws no confidence anywhere on this screen. This component
//    requires it. A 0-99 number on the scale players read from FIFA is a
//    verdict, and a Low confidence usually means the footage could not be
//    tracked -- a fact about the video, not about the player. Showing the
//    number bare would assert a certainty the pipeline never had. It is a
//    text label, never colour alone.
const HIGH_VALUE = 70;

export type Confidence = 'High' | 'Medium' | 'Low';

export function AttributeBar({
  /** Short code, e.g. 'PAC'. */
  code,
  /** Full name, e.g. 'Pace'. */
  name,
  /** 0-99, or null when this attribute was not scored in the run. */
  value,
  confidence,
  /** Index in the list; the canvas staggers each bar 100ms after the last. */
  index = 0,
}: {
  code: string;
  name: string;
  value: number | null;
  confidence: Confidence | null;
  index?: number;
}) {
  const colors = useThemeColors();

  const scored = value != null;
  const fraction = scored ? value / 99 : 0;
  // The accent token is theme-aware, so one value serves both grounds: the
  // canvas draws this with var(--gold) and the token resolves per theme.
  const belowColor = colors.gold;
  const fillColor = !scored
    ? colors.textDisabled
    : value >= HIGH_VALUE
      ? colors.success
      : belowColor;

  const fillStyle = useBarGrow(fraction, 1000 + index * 100);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
        <Text
          style={{
            flex: 1,
            fontFamily: fontFamilyDisplay.bold,
            fontSize: fontSize.bodySm,
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {code} · {name}
        </Text>
        <Text
          style={{
            fontFamily: fontFamilyDisplay.extraBold,
            fontSize: fontSize.bodySm,
            color: scored ? colors.textPrimary : colors.textMuted,
          }}
        >
          {scored ? value : 'Not measured'}
        </Text>
      </View>

      <View
        style={{
          height: 6,
          backgroundColor: colors.track,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {scored && (
          <Animated.View style={[{ height: '100%', backgroundColor: fillColor }, fillStyle]} />
        )}
      </View>

      {/*
        Always rendered when there is a value, never suppressed to make the row
        look cleaner. An unqualified number is the failure this guards against.
      */}
      {scored && confidence != null && (
        <Kicker size={fontSize.caption} style={{ marginTop: 3 }}>
          {confidence} confidence
        </Kicker>
      )}
      {!scored && (
        <Kicker size={fontSize.caption} style={{ marginTop: 3 }}>
          Not enough clear footage
        </Kicker>
      )}
    </View>
  );
}
