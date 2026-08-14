import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, StyleProp } from 'react-native';
import { fontFamily, fontSize, radii, useThemeColors } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  height?: number;
};

// Matches the mockup's flat secondary button (Login / back-adjacent actions).
export function SecondaryButton({ label, onPress, style, height = 52 }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { height, backgroundColor: pressed ? colors.border : colors.surfaceMuted },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    button: {
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: colors.textPrimary,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.bodyLg,
    },
  });
}
