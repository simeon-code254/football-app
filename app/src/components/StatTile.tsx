import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { fontFamilyDisplay, fontSize, radii, spacing, useThemeColors } from '../theme';
import { Kicker } from './Kicker';

// The small "number over a caption" cell the canvas repeats everywhere -- the
// three-up "THIS WEEK" strip on player home, the PAC/DEF/PHY row inside the
// rating card, the club dashboard's applicants/trials/scouts counters.
//
// Two grounds, both from the canvas:
//   'card'  a bordered white card    -- padding 9px 5px  (the THIS WEEK strip)
//   'inset' a paper-filled recess    -- padding 4px 2px, radius 7 (in-card)
//
// -- NULL IS NOT ZERO --
//
// `value` is nullable and renders an em dash, because these tiles count things
// that can genuinely be unknown -- a rating delta before there is any history,
// a rank before a player has been placed. Rendering 0 for "we do not know yet"
// tells a young player they scored nothing, which is a different and worse
// claim than "no history yet".
export function StatTile({
  value,
  label,
  variant = 'card',
  tone = 'default',
  style,
}: {
  value: string | number | null;
  label: string;
  variant?: 'card' | 'inset';
  /** 'success' for a positive delta, matching the canvas's green "+7". */
  tone?: 'default' | 'success';
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const known = value != null && value !== '';

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          borderRadius: variant === 'card' ? radii.md : radii.sm,
          paddingVertical: variant === 'card' ? spacing.md : spacing.xs,
          paddingHorizontal: variant === 'card' ? spacing.sm : spacing.xs,
        },
        variant === 'card'
          ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
          : { backgroundColor: colors.background },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamilyDisplay.extraBold,
          fontSize: variant === 'card' ? fontSize.headingLg : fontSize.bodyLg,
          color: !known
            ? colors.textMuted
            : tone === 'success'
              ? colors.success
              : colors.textPrimary,
        }}
        maxFontSizeMultiplier={1.4}
      >
        {known ? value : '—'}
      </Text>
      <Kicker size={fontSize.caption} style={{ marginTop: 2 }}>
        {label}
      </Kicker>
    </View>
  );
}
