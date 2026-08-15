import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, elevation, useIsDark } from '../theme';

// The player's rating, as a card in the visual language these users already
// speak fluently.
//
// The previous version was a blue panel with the number in the corner --
// competent, but it could have belonged to any app. This borrows the
// grammar of a football card instead: rating top-left at display size,
// position beneath it, country to the right, the name set in caps across a
// rule, and the attribute pairs along the bottom.
//
// Deliberately dark in BOTH themes. A football card is a dark object with
// metallic edges; making it follow the app's light theme would turn it back
// into a panel. It is the one surface in the app that owns its own palette.
//
// Deliberately NOT tiered gold/silver/bronze. That is the obvious next step
// from FIFA, and it would be wrong here: the engine currently produces low
// provisional numbers for everyone, so tiering would hand most young
// players a "bronze" verdict on work the analysis cannot yet judge
// properly. One treatment for everyone until the ratings are worth ranking.

// Emoji flags were the first instinct here and were wrong: regional
// indicator pairs do not render at all on Windows Chrome and are patchy on
// older Android, so a Kenyan player saw the letters "KE" where a flag
// should be. A typeset country code is legible on every platform and reads
// as a deliberate card element rather than a failed glyph.

export type RatingAttribute = { key: string; displayName: string; value: number | null };

export function PlayerRatingCard({
  name,
  rating,
  position,
  countryCode,
  attributes,
  assessedCount,
  totalCount,
  onPressReport,
}: {
  name: string;
  rating: number | null;
  position?: string | null;
  countryCode?: string | null;
  attributes: RatingAttribute[];
  assessedCount: number;
  totalCount: number;
  onPressReport: () => void;
}) {
  const isDark = useIsDark();
  const rated = attributes.filter((a) => a.value != null).slice(0, 4);
  const provisional = assessedCount > 0 && assessedCount < totalCount;

  return (
    <LinearGradient
      colors={['#16233B', '#0B1220']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.card, elevation('floating', isDark)]}
    >
      {/* The metallic edge is what separates a card from a rectangle. */}
      <LinearGradient
        colors={['#FFD54F', 'rgba(255,213,79,0.15)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.edge}
      />

      <View style={styles.topRow}>
        <View>
          <Text style={styles.rating}>{rating != null ? Math.round(rating) : '–'}</Text>
          {!!position && <Text style={styles.position}>{position}</Text>}
        </View>

        <View style={styles.topRight}>
          {!!countryCode && (
            <View style={styles.countryChip}>
              <Text style={styles.countryText}>{countryCode.toUpperCase()}</Text>
            </View>
          )}
          <Pressable
            onPress={onPressReport}
            style={styles.reportBtn}
            accessibilityRole="button"
            accessibilityLabel="View full rating report"
          >
            <Text style={styles.reportText}>Report</Text>
            <Feather name="arrow-up-right" size={13} color="#FFD54F" />
          </Pressable>
        </View>
      </View>

      <View style={styles.rule} />
      <Text style={styles.name} numberOfLines={1}>
        {name.toUpperCase()}
      </Text>
      <View style={styles.rule} />

      {rated.length > 0 ? (
        <View style={styles.attrRow}>
          {rated.map((a) => (
            <View key={a.key} style={styles.attr}>
              <Text style={styles.attrValue}>{a.value}</Text>
              <Text style={styles.attrKey}>{a.displayName.slice(0, 3).toUpperCase()}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.pending}>Upload a highlight to get your first rating</Text>
      )}

      {provisional && (
        // Kept even in a card that is meant to feel aspirational. A number
        // a scout later finds hollow costs more than the swagger gains.
        <Text style={styles.provisional}>
          Provisional · {assessedCount} of {totalCount} attributes rated
        </Text>
      )}
    </LinearGradient>
  );
}

const GOLD = '#FFD54F';
const MUTED = 'rgba(255,255,255,0.55)';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    overflow: 'hidden',
  },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rating: {
    fontFamily: fontFamily.extraBold,
    fontSize: 52,
    lineHeight: 54,
    color: GOLD,
    letterSpacing: -2.5,
  },
  position: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 2,
  },
  topRight: { alignItems: 'flex-end', gap: spacing.md },
  countryChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,213,79,0.4)',
    borderRadius: radii.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countryText: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: GOLD, letterSpacing: 1.5 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,213,79,0.35)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  reportText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: GOLD },
  rule: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: spacing.sm },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.bodyLg,
    color: '#FFFFFF',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  // Left-aligned with a fixed gap: space-between pushed two values to
  // opposite edges of the card, which looked like a layout error rather
  // than a design.
  attrRow: { flexDirection: 'row', gap: spacing.huge, marginTop: spacing.md, paddingLeft: spacing.xs },
  attr: { alignItems: 'flex-start' },
  attrValue: { fontFamily: fontFamily.extraBold, fontSize: fontSize.headingLg, color: '#FFFFFF' },
  attrKey: { fontFamily: fontFamily.semiBold, fontSize: 10, color: MUTED, letterSpacing: 1.2, marginTop: 2 },
  pending: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodySm,
    color: MUTED,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  provisional: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: 0.4,
  },
});
