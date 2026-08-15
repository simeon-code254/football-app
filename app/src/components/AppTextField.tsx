import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../theme';

type Props = TextInputProps & {
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  /** Renders a show/hide eye toggle and manages secureTextEntry internally. */
  isPassword?: boolean;
  /** When set, renders in an error state with this message below the field. */
  error?: string;
  accessibilityLabel?: string;
};

// Matches the mockup's repeated input pattern: label above, 46px pill field,
// 1.5px #E2E6EC border, #FAFBFC fill, leading icon. Password fields get a
// trailing show/hide toggle since the mockup (a static prototype) had no way
// to express that interaction.
export function AppTextField({ label, icon, style, isPassword, secureTextEntry, error, accessibilityLabel, ...inputProps }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [visible, setVisible] = useState(false);
  const hidden = isPassword ? !visible : secureTextEntry;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error && styles.fieldError]}>
        {icon && <Feather name={icon} size={16} color={colors.textPlaceholder} style={styles.icon} />}
        <TextInput
          placeholderTextColor={colors.textPlaceholder}
          style={[styles.input, style]}
          secureTextEntry={hidden}
          accessibilityLabel={accessibilityLabel ?? label}
          {...inputProps}
        />
        {isPassword && (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8} style={styles.eyeBtn} accessibilityLabel={visible ? 'Hide password' : 'Show password'} accessibilityRole="button">
            <Feather name={visible ? 'eye-off' : 'eye'} size={17} color={colors.textPlaceholder} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
    eyeBtn: { paddingLeft: spacing.sm },
    fieldError: { borderColor: colors.error },
    errorText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: colors.error,
      marginTop: 4,
    },
  });
}
