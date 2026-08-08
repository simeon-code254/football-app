import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, StyleProp, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontFamily, fontSize, radii } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
};

// Matches the mockup's repeated CTA pattern: linear-gradient(135deg,#1A6DFF,#0050D0),
// 14px radius, box-shadow, scale(1.02) on hover -> we use Pressable's pressed state instead.
export function PrimaryButton({ label, onPress, disabled, loading, style, height = 52 }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={style}>
      {({ pressed }) => (
        <LinearGradient
          colors={disabled ? [colors.textPlaceholder, colors.textPlaceholder] : [colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            { height, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: {
    color: colors.white,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.bodyLg,
  },
});
