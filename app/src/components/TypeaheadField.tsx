import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontFamily, fontSize, radii, spacing } from '../theme';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
};

// "Type and it shows" country picker — a plain text field that filters
// `options` live and drops a tappable suggestion list underneath, instead of
// a full-list modal (SelectField). Used for Nationality now that the app is
// Africa-only and a 54-country list is easier to type than scroll.
export function TypeaheadField({ label, value, onChange, options, placeholder = 'Start typing…' }: Props) {
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 8);
  }, [value, options]);

  const showDropdown = focused && matches.length > 0;
  const exactMatch = options.some((o) => o.toLowerCase() === value.trim().toLowerCase());

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          style={styles.input}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          onBlur={() => {
            // Delay so a tap on a suggestion below registers before the list unmounts.
            blurTimer.current = setTimeout(() => setFocused(false), 150);
          }}
          autoCapitalize="words"
        />
        {!exactMatch && value.length > 0 && <View style={styles.pendingDot} />}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 190 }} nestedScrollEnabled>
            {matches.map((item) => (
              <Pressable
                key={item}
                style={styles.option}
                onPress={() => {
                  onChange(item);
                  setFocused(false);
                }}
              >
                <Text style={styles.optionText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 20 },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginBottom: 5 },
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
  input: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textPlaceholder },
  dropdown: {
    position: 'absolute',
    top: 74,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 30,
  },
  option: { paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  optionText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
});
