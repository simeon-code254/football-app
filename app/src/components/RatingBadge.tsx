import { StyleSheet, Text, View } from 'react-native';
import { fontFamily, fontSize, useThemeColors } from '../theme';

type Props = { rating: number; size?: 'sm' | 'md' | 'lg'; lowConfidence?: boolean };

// FIFA-card-style overall rating chip — used on PlayerCard, Profile header,
// and Reels overlays wherever the mockup shows a bare "82"/"CAM · 82 OVR" badge.
//
// lowConfidence marks a rating that at least one low-confidence attribute
// contributed to (players.rating_has_low_confidence). It is shown as a dot on
// the badge rather than a character beside the number: at the sm size the
// badge is 28px across, and appending "·" to a two-digit rating crowds it to
// the point of looking like a rendering fault. The dot also stays legible when
// the badge sits over a reel thumbnail.
export function RatingBadge({ rating, size = 'md', lowConfidence }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const dims = { sm: 28, md: 36, lg: 48 }[size];
  const fs = { sm: fontSize.sm, md: fontSize.body, lg: fontSize.headingLg }[size];
  return (
    <View
      style={[styles.badge, { width: dims, height: dims, borderRadius: dims / 2 }]}
      accessible
      accessibilityLabel={
        lowConfidence
          ? `Overall rating ${rating}, based partly on low-confidence analysis`
          : `Overall rating ${rating}`
      }
    >
      <Text style={[styles.text, { fontSize: fs }]} maxFontSizeMultiplier={1.2}>{rating}</Text>
      {lowConfidence && <View style={styles.lowDot} />}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    badge: {
      backgroundColor: colors.infoTint,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { fontFamily: fontFamily.bold, color: colors.primary },
    // Ringed in the surface colour so the dot still reads as a distinct mark
    // when the badge is over a photo rather than a flat card.
    lowDot: {
      position: 'absolute',
      top: -1,
      right: -1,
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: colors.textMuted,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
  });
}
