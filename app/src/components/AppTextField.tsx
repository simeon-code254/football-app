import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../theme';

type Props = TextInputProps & {
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
};

// Matches the mockup's repeated input pattern: label above, 46px pill field,
// 1.5px #E2E6EC border, #FAFBFC fill, leading icon.
export function AppTextField({ label, icon, style, ...inputProps }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        {icon && <Feather name={icon} size={16} color={colors.textPlaceholder} style={styles.icon} />}
        <TextInput
          placeholderTextColor={colors.textPlaceholder}
          style={[styles.input, style]}
          {...inputProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textLabel,
    marginBottom: 5,
  },
  field: {
    height: 46,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  icon: { marginRight: spacing.md },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodySm,
    color: colors.textPrimary,
  },
});
