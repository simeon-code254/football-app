import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize } from '../theme';

type Props = {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

// Matches the mockup's 18x18 rounded checkbox with a filled blue check state.
export function Checkbox({ checked, onToggle, children }: Props) {
  return (
    <Pressable onPress={onToggle} style={styles.row}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Feather name="check" size={12} color={colors.white} />}
      </View>
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  box: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, lineHeight: 17 },
});
