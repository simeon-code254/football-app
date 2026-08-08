import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii } from '../theme';

type Props = {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

// Matches the mockup's recurring 36x36 #F4F6F9 rounded-square icon button
// (back chevron, header actions).
export function IconButton({ icon, onPress, size = 36, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, backgroundColor: pressed ? '#EAECF0' : colors.surfaceMuted },
        style,
      ]}
    >
      <Feather name={icon} size={18} color="#333333" />
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
