import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, StyleProp } from 'react-native';
import { colors, fontFamily, fontSize, radii } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  height?: number;
};

// Matches the mockup's #F4F6F9 flat secondary button (Login / back-adjacent actions).
export function SecondaryButton({ label, onPress, style, height = 52 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { height, backgroundColor: pressed ? '#EAECF0' : colors.surfaceMuted },
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
