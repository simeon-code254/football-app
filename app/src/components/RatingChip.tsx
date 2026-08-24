import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { fontFamilyDisplay, fontSize, radii, spacing, useThemeColors } from '../theme';

// The rounded rectangle carrying an overall rating, which the canvas puts on
// every player row and card:
//
//   background:var(--navy); color:var(--gold); font-weight:800
//   padding:4px 8px; border-radius:7px
//
// and inverted on dark photo grounds, where the chip itself becomes gold with
// navy digits so it still separates from the image behind it.
//
// This is distinct from the circular `RatingBadge` already in the codebase --
// the canvas uses the circle for the hero rating and this chip everywhere a
// rating appears beside a name. Both exist on purpose.
//
// Gold on navy is 10.93:1 and navy on gold is the same pairing inverted, so
// either direction is safe. What the chip must never do is put gold digits on
// paper, which is why there is no "plain" variant.
//
// -- ROUNDING HAPPENS HERE, NOT AT THE CALL SITE --
//
// players.overall_rating is numeric(5,2), so the database hands back 18.62.
// A rating is a whole number in this product's language -- the canvas draws
// 78 and 83, never 78.40 -- and leaving each of ~20 call sites to remember
// Math.round is how "18.62" reached a profile screen. Rounding at the display
// boundary means no caller can leak a decimal.
export function RatingChip({
  value,
  variant = 'navy',
  size = 'md',
  style,
}: {
  /** Null renders an em dash: an unrated player is not a zero-rated one. */
  value: number | null;
  variant?: 'navy' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();

  const fs =
    size === 'sm' ? fontSize.bodySm : size === 'lg' ? fontSize.headingLg : fontSize.bodyLg;

  return (
    <View
      style={[
        {
          backgroundColor: variant === 'gold' ? colors.gold : colors.primaryDark,
          borderRadius: radii.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          alignSelf: 'flex-start',
        },
        style,
      ]}
      accessible
      accessibilityLabel={value == null ? 'Not yet rated' : `Overall rating ${Math.round(value)}`}
    >
      <Text
        style={{
          fontFamily: fontFamilyDisplay.extraBold,
          fontSize: fs,
          color: variant === 'gold' ? colors.primaryDark : colors.gold,
        }}
        maxFontSizeMultiplier={1.3}
      >
        {value == null ? '—' : Math.round(value)}
      </Text>
    </View>
  );
}
