import { View, Text } from 'react-native';
import { fontFamilyDisplay, fontSize, useThemeColors } from '../theme';

// The countdown chip on a trial card. Canvas screen 18 draws two states:
//
//   gold fill, navy text   -- closing soon  ("9d")
//   muted fill, muted text -- plenty of time ("21d")
//
// The canvas shows 9d gold and 21d muted, so the break sits between them. Ten
// days is the threshold here: it is far enough out that a player still has
// time to travel and arrange a guardian, and near enough that "soon" is true.
const SOON_DAYS = 10;

/** Whole days from today to `deadline`, floored at 0. */
function daysUntil(deadline: string): number | null {
  const then = new Date(deadline);
  if (Number.isNaN(then.getTime())) return null;
  const today = new Date();
  // Compare calendar days, not instants: a deadline "tomorrow" should read as
  // 1d all day today, not flip to 0d after lunch.
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function DeadlinePill({ deadline }: { deadline: string | null }) {
  const colors = useThemeColors();
  if (!deadline) return null;

  const days = daysUntil(deadline);
  if (days == null) return null;

  const closed = days === 0;
  const soon = days <= SOON_DAYS;

  return (
    <View
      style={{
        backgroundColor: closed ? colors.dangerTint : soon ? colors.gold : colors.surfaceMuted,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
      }}
      accessible
      accessibilityLabel={
        closed ? 'Closes today' : 'Closes in ' + days + (days === 1 ? ' day' : ' days')
      }
    >
      <Text
        style={{
          fontFamily: fontFamilyDisplay.extraBold,
          fontSize: fontSize.caption,
          color: closed ? colors.error : soon ? colors.primaryDark : colors.textMuted,
        }}
        maxFontSizeMultiplier={1.3}
      >
        {closed ? 'Today' : days + 'd'}
      </Text>
    </View>
  );
}
