import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii } from '../theme';

type Props = {
  icon: React.ComponentProps<typeof Feather>['name'];
  /** Required, not optional — this is the shared back/header-action button
   * used app-wide, so leaving it optional meant most of the app had no
   * accessible label on these buttons at all. */
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** White glass variant for use on photo/gradient headers. */
  light?: boolean;
};

// Matches the mockup's recurring 36x36 rounded-square icon button (back
// chevron, header actions). `light` gives a translucent-white variant for
// use over photos/gradients instead of the default #F4F6F9-on-white one.
export function IconButton({ icon, accessibilityLabel, onPress, size = 36, style, light }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        light
          ? { backgroundColor: pressed ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)' }
          : { backgroundColor: pressed ? '#EAECF0' : colors.surfaceMuted },
        { width: size, height: size },
        style,
      ]}
    >
      <Feather name={icon} size={18} color={light ? colors.white : '#333333'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
