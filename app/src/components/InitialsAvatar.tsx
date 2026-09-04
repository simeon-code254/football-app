import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { fontFamilyDisplay, useThemeColors } from '../theme';

// The round avatar the canvas uses in every list row. With no photo it falls
// back to initials on a navy2->navy gradient with gold letters:
//
//   background:linear-gradient(135deg,var(--navy2),var(--navy));
//   color:var(--gold); font-weight:700
//
// Initials rather than a generic silhouette, because a list of identical
// silhouettes is unreadable at a glance and this app's lists are long.
function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  // First and last, so "Simeon Odhiambo" reads SO and a single name reads S.
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function InitialsAvatar({
  name,
  uri,
  size = 36,
  circular = false,
  style,
}: {
  name: string | null | undefined;
  uri?: string | null;
  size?: number;
  circular?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const radius = circular ? size / 2 : 4;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: radius }, style as object]}
        contentFit="cover"
        // The name is already rendered beside every avatar in these lists, so
        // announcing it again here would just double up for screen readers.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  }

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' },
        style as object,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamilyDisplay.bold,
          fontSize: Math.round(size * 0.32),
          color: colors.gold,
        }}
        maxFontSizeMultiplier={1.2}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {initialsOf(name)}
      </Text>
    </LinearGradient>
  );
}
