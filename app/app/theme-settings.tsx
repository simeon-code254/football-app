import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useThemeStore, type ThemeMode } from '../src/store/useThemeStore';

const OPTIONS: { mode: ThemeMode; label: string; sub: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { mode: 'system', label: 'System', sub: 'Match your device setting', icon: 'smartphone' },
  { mode: 'light', label: 'Light', sub: 'Always use light theme', icon: 'sun' },
  { mode: 'dark', label: 'Dark', sub: 'Always use dark theme', icon: 'moon' },
];

export default function ThemeSettings() {
  const colors = useThemeColors();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Theme</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.list}>
          {OPTIONS.map((opt, i) => {
            const active = mode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                style={[styles.row, i < OPTIONS.length - 1 && styles.rowBorder]}
                onPress={() => setMode(opt.mode)}
              >
                <View style={styles.rowIcon}>
                  <Feather name={opt.icon} size={17} color={active ? colors.primary : colors.textBody} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, active && { color: colors.primary }]}>{opt.label}</Text>
                  <Text style={styles.rowSub}>{opt.sub}</Text>
                </View>
                {active && <Feather name="check" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
    headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    content: { padding: 20 },
    list: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    rowIcon: { width: 28, alignItems: 'center' },
    rowTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
    rowSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  });
}
