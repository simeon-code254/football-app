import { View, Text, TextInput, Pressable, StyleProp, ViewStyle, TextInputProps } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../theme';
import { Kicker } from './Kicker';

// The canvas's form field: an uppercase kicker label with a bordered card
// beneath it.
//
//   <div class="mono" style="font-size:9px;color:var(--muted)">FULL NAME</div>
//   <div class="card" style="height:38px;padding:0 12px;font-size:12px">…</div>
//
// This is a different shape from the app's existing `AppTextField`, which draws
// a 46px pill with a leading icon and a floating label. Both are kept: the pill
// belongs to the older auth screens, this one is what every canvas form uses.
//
// The height is 48 rather than the canvas's 38 -- a text input is a touch
// target (see rule 5 in theme/canvas.ts), and 38dp is below the platform
// minimum.
export function Field({
  label,
  error,
  hint,
  style,
  ...input
}: TextInputProps & {
  label: string;
  /** Shown in danger colour under the field, and announced with it. */
  error?: string;
  /** Neutral helper text, shown only when there is no error. */
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();

  return (
    <View style={style}>
      <Kicker style={{ marginBottom: 4 }}>{label}</Kicker>
      <TextInput
        {...input}
        style={{
          // A multiline field grows; a single-line one is a fixed touch target.
          minHeight: 48,
          ...(input.multiline
            ? { paddingTop: spacing.md, paddingBottom: spacing.md, textAlignVertical: 'top' as const }
            : { height: 48 }),
          paddingHorizontal: spacing.lg,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: error ? colors.error : colors.border,
          backgroundColor: colors.inputBackground,
          fontFamily: fontFamily.regular,
          fontSize: fontSize.body,
          color: colors.textPrimary,
        }}
        placeholderTextColor={colors.textPlaceholder}
        accessibilityLabel={label}
        // The error is the field's own state, not a separate announcement, so
        // it rides along rather than being read as a loose string elsewhere.
        accessibilityHint={error ?? hint}
      />
      {(error || hint) && (
        <Text
          style={{
            fontFamily: fontFamily.regular,
            fontSize: fontSize.sm,
            color: error ? colors.error : colors.textMuted,
            marginTop: 4,
          }}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}

/**
 * The same shell as `Field`, but for a value that opens a picker rather than
 * accepting typing -- date of birth, country, position. Renders as a button so
 * it is announced as one.
 */
export function SelectRow({
  label,
  value,
  placeholder,
  onPress,
  style,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const filled = !!value;

  return (
    <View style={style}>
      <Kicker style={{ marginBottom: 4 }}>{label}</Kicker>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? placeholder ?? 'Not set' }}
        style={{
          height: 48,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.inputBackground,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: fontFamily.regular,
            fontSize: fontSize.body,
            color: filled ? colors.textPrimary : colors.textPlaceholder,
          }}
          numberOfLines={1}
        >
          {value ?? placeholder ?? ''}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
