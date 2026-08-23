import { View, StyleProp, ViewStyle } from 'react-native';
import { elevation, radii, spacing, useThemeColors, useIsDark } from '../theme';

// The canvas's .card:
//
//   .card { background:#fff; border:1px solid #E7E2D3; border-radius:14px }
//
// plus the two lifted variants it draws by hand -- the rating card on player
// home carries `box-shadow:0 14px 30px -14px rgba(10,27,51,.45)` and a larger
// 18px radius, and modals sit higher still.
//
// The shadow does not come from a hand-written boxShadow here: `elevation()`
// already resolves iOS shadow / Android elevation / web boxShadow, and on the
// dark theme it swaps shadows for lifted surfaces plus a hairline, because a
// shadow on a near-black ground is invisible and Android cannot colour one.
export function Card({
  children,
  level = 'flat',
  style,
}: {
  children?: React.ReactNode;
  /**
   * 'flat' is the bordered canvas .card. 'raised' is the hero card that lifts
   * off the ground (the rating card). 'floating' is for sheets and popovers.
   */
  level?: 'flat' | 'raised' | 'floating';
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: level === 'flat' ? radii.lg : radii.xl,
          padding: spacing.lg,
        },
        // The flat card is defined by its border; the lifted ones by their
        // shadow. Giving a raised card both makes the edge read twice.
        level === 'flat'
          ? { borderWidth: 1, borderColor: colors.border }
          : elevation(level === 'raised' ? 'raised' : 'floating', isDark),
        style,
      ]}
    >
      {children}
    </View>
  );
}
