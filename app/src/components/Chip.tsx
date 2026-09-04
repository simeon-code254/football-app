import { Text, View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { fontFamilyDisplay, fontSize, radii, spacing, useThemeColors } from '../theme';

// The small pill the canvas uses for positions, regions, filters and tags.
//
// Three grounds, all lifted from the canvas:
//
//   filled   background:var(--navy); color:var(--gold); border-radius:14px
//            padding:4px 8px; font-size:9px; font-weight:800
//   outline  border:1px solid var(--gold); border-radius:20px; padding:5px 10px
//   muted    the same shape on paper, for an unselected option
//
// Gold on navy is 10.93:1, which is why the filled chip can carry gold text at
// 9px. The muted chip is on paper, so it never does -- it uses textBody. This
// is the gold-on-light rule again, and chips are where it is easiest to get
// wrong because the filled and muted variants sit side by side in a filter row.
export function Chip({
  label,
  variant = 'muted',
  onPress,
  selected,
  style,
}: {
  label: string;
  variant?: 'filled' | 'outline' | 'muted';
  onPress?: () => void;
  /** Announced to screen readers when the chip toggles a filter. */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();

  const ground: ViewStyle =
    variant === 'filled'
      ? { backgroundColor: colors.primaryDark }
      : variant === 'outline'
        ? { borderWidth: 1, borderColor: colors.goldDark, backgroundColor: 'transparent' }
        : { backgroundColor: colors.surfaceMuted };

  const color =
    variant === 'filled'
      ? colors.gold
      : variant === 'outline'
        ? colors.goldDark
        : colors.textBody;

  const body = (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          borderRadius: 4,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
        },
        ground,
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamilyDisplay.extraBold,
          fontSize: fontSize.xs,
          letterSpacing: 0.4,
          color,
        }}
        maxFontSizeMultiplier={1.4}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected == null ? undefined : { selected }}
      // The chip itself is small; the hit area should not be.
      hitSlop={8}
    >
      {body}
    </Pressable>
  );
}
