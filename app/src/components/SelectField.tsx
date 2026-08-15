import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../theme';

type Props = {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
};

// Matches the mockup's "Select" field (label + value/placeholder + chevron),
// backed by a simple modal option list since RN has no native <select>.
export function SelectField({ label, value, options, onChange, placeholder = 'Select' }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.field}
        onPress={() => setOpen(true)}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={value ? styles.value : styles.placeholder}>{value ?? placeholder}</Text>
        <Feather name="chevron-down" size={14} color={colors.textPlaceholder} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityViewIsModal style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                  accessibilityState={{ selected: item === value }}
                >
                  <Text style={[styles.optionText, item === value && styles.optionTextSelected]}>{item}</Text>
                  {item === value && <Feather name="check" size={16} color={colors.primary} />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    wrap: { flex: 1 },
    label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginBottom: 5 },
    field: {
      height: 44,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
    },
    value: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
    placeholder: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPlaceholder },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: 32 },
    sheetTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.title, color: colors.textPrimary, marginBottom: spacing.md },
    option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
    optionText: { fontFamily: fontFamily.regular, fontSize: fontSize.body, color: colors.textPrimary },
    optionTextSelected: { fontFamily: fontFamily.semiBold, color: colors.primary },
  });
}
