import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../theme';
import { RatingBadge } from './RatingBadge';

type Props = {
  name: string;
  positionLine: string; // e.g. "CAM · Lagos, Nigeria"
  avatar: string;
  rating: number;
  onPress?: () => void;
};

// Matches the Discover tab's "Trending Players" row: avatar, name, position/
// city, rating badge.
export function PlayerCard({ name, positionLine, avatar, rating, onPress }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${name}, ${positionLine}, rating ${rating}`}
    >
      <Image source={{ uri: avatar }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{positionLine}</Text>
      </View>
      <RatingBadge rating={rating} size="sm" />
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    cardPressed: { backgroundColor: colors.surfaceMuted },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    info: { flex: 1 },
    name: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
    meta: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  });
}
