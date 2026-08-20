import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors, useIsDark, elevation } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { SUPPORTED_LOCALES, useLocaleStore, useTranslation } from '../src/i18n';

export default function LanguageSettings() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const { locale } = useTranslation();
  const override = useLocaleStore((s) => s.override);
  const setOverride = useLocaleStore((s) => s.setOverride);

  const rows = [
    // "Match my device" is the default and stays first: most people never
    // want to think about this, and their phone already knows the answer.
    { code: null as null, label: 'Match my device', english: 'Automatic' },
    ...SUPPORTED_LOCALES,
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.list, elevation('raised', isDark)]}>
          {rows.map((r, i) => {
            const active = override === r.code;
            return (
              <Pressable
                key={r.english}
                onPress={() => setOverride(r.code)}
                style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
                accessibilityRole="radio"
                accessibilityLabel={r.label}
                accessibilityState={{ selected: active }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, active && { color: colors.primary }]}>{r.label}</Text>
                  {r.code !== null && r.label !== r.english && (
                    <Text style={styles.rowSub}>{r.english}</Text>
                  )}
                  {r.code === null && (
                    <Text style={styles.rowSub}>Currently {locale.toUpperCase()}</Text>
                  )}
                </View>
                {active && <Feather name="check" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>

        {/* Said plainly rather than pretending the app is fully translated.
            Translation is rolling out screen by screen, and anything not yet
            covered falls back to English rather than showing a raw key. */}
        <Text style={styles.note}>
          Translation is still rolling out. Anything not yet translated shows in English.
        </Text>
        <Text style={styles.note}>
          Arabic is coming once right-to-left layouts are supported properly.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.title, color: colors.textPrimary },
    content: { padding: spacing.lg },
    list: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    rowTitle: { fontFamily: fontFamily.medium, fontSize: fontSize.body, color: colors.textPrimary },
    rowSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    note: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: colors.textPlaceholder,
      lineHeight: 17,
      marginTop: spacing.lg,
    },
  });
}
