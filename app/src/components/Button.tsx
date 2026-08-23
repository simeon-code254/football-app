import { Pressable, Text, ActivityIndicator, View, StyleProp, ViewStyle } from 'react-native';
import { fontFamily, fontSize, radii, useThemeColors, elevation, useIsDark } from '../theme';

// The canvas's buttons. It draws exactly three, and which one appears is
// decided by the ground behind it, not by importance:
//
//   gold      background:var(--gold); color:var(--navy)   -- primary ON NAVY
//   navy      background:var(--navy); color:var(--gold)   -- primary ON PAPER
//   outline   border:1px solid rgba(255,255,255,.25)      -- secondary on navy
//
// Both primaries are gold-and-navy, just inverted, because that pairing is
// 10.93:1 either way round. What must never happen is gold-on-paper or
// navy-on-navy, which is why the variant names the ground rather than the rank.
//
// The canvas draws these 46px tall. They are 52 here -- see rule 5 in
// theme/canvas.ts: a control's height is an ergonomic constant, and 46 scaled
// by the canvas ratio would be 62, which is oversized on a real device.
const HEIGHT = 52;

export function Button({
  label,
  onPress,
  variant = 'navy',
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  /** Name the ground the button sits on: 'gold'/'outline' on navy, 'navy' on paper. */
  variant?: 'gold' | 'navy' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const inert = disabled || loading;

  const ground: ViewStyle =
    variant === 'gold'
      ? { backgroundColor: colors.gold }
      : variant === 'navy'
        ? { backgroundColor: colors.primaryDark }
        : { borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' };

  const labelColor =
    variant === 'gold'
      ? colors.primaryDark
      : variant === 'navy'
        ? colors.gold
        : colors.white;

  return (
    <Pressable
      onPress={inert ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      style={({ pressed }) => [
        {
          height: HEIGHT,
          borderRadius: radii.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: inert ? 0.55 : pressed ? 0.85 : 1,
        },
        ground,
        // The canvas gives the navy button a drop shadow where it sits on
        // paper; the gold one on navy has none, and a shadow on a dark ground
        // would not be visible anyway.
        variant === 'navy' ? elevation('raised', isDark) : null,
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={labelColor} />}
      <Text
        style={{ fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: labelColor }}
        maxFontSizeMultiplier={1.4}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The underlined text link the canvas puts under the buttons on navy grounds
 * -- "Browse without an account", "Upload another", "Back to trials".
 *
 * Rendered as a real button with a full-height hit area rather than tappable
 * text, because at 11px the text alone is well under the 44dp touch minimum.
 */
export function LinkButton({
  label,
  onPress,
  tone = 'onNavy',
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: 'onNavy' | 'onPaper';
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 }, style]}
    >
      <View>
        <Text
          style={{
            fontFamily: fontFamily.medium,
            fontSize: fontSize.bodySm,
            textAlign: 'center',
            textDecorationLine: 'underline',
            color: tone === 'onNavy' ? colors.accentOnNavy : colors.primary,
          }}
          maxFontSizeMultiplier={1.5}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
