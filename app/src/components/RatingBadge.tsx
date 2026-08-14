import { StyleSheet, Text, View } from 'react-native';
import { fontFamily, fontSize, useThemeColors } from '../theme';

type Props = { rating: number; size?: 'sm' | 'md' | 'lg' };

// FIFA-card-style overall rating chip — used on PlayerCard, Profile header,
// and Reels overlays wherever the mockup shows a bare "82"/"CAM · 82 OVR" badge.
export function RatingBadge({ rating, size = 'md' }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const dims = { sm: 28, md: 36, lg: 48 }[size];
  const fs = { sm: fontSize.sm, md: fontSize.body, lg: fontSize.headingLg }[size];
  return (
    <View style={[styles.badge, { width: dims, height: dims, borderRadius: dims / 2 }]}>
      <Text style={[styles.text, { fontSize: fs }]}>{rating}</Text>
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
  });
}
