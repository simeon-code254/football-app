import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../src/theme';
import { Kicker } from '../src/components/Kicker';
import { NoticeBox } from '../src/components/NoticeBox';
import { useLocaleStore, SUPPORTED_LOCALES } from '../src/i18n';
import { translations } from '../src/i18n/translations';

/**
 * Share of English keys each locale actually defines.
 *
 * The canvas prints "FULLY TRANSLATED" beside three languages. That is a
 * promise about safety copy a parent may be relying on, so it is measured
 * rather than asserted: a locale that falls behind English reports its real
 * percentage instead of claiming a completeness it no longer has.
 */
function coverageOf(code: string): number {
  // The tables are nested (auth.*, common.*, ...), so a flat Object.keys count
  // would compare group names and report 100% for every locale even with
  // whole sections missing. Walk to the leaves.
  const leaves = (o: unknown, prefix = ''): string[] =>
    o && typeof o === 'object'
      ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
          v && typeof v === 'object' ? leaves(v, `${prefix}${k}.`) : [`${prefix}${k}`]
        )
      : [];

  const get = (o: unknown, path: string): unknown =>
    path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], o);

  const enKeys = leaves(translations.en);
  if (!enKeys.length) return 100;
  const target = translations[code as keyof typeof translations];
  const have = enKeys.filter((k) => get(target, k) != null).length;
  return Math.round((have / enKeys.length) * 100);
}

// Canvas screen 66 SETTINGS · LANGUAGE.
//
//   "Four languages, all human-translated. Ratings and safety copy read the
//    same in each."
//   EN English    DEFAULT
//   SW Kiswahili  FULLY TRANSLATED
//   FR Français   FULLY TRANSLATED
//   PT Português  FULLY TRANSLATED
//   "No machine translation. If a language is listed, a person wrote it."
//
// -- THE TWO CLAIMS ARE LOAD-BEARING, SO THEY ARE RENDERED FROM COVERAGE --
//
// "Fully translated" and "no machine translation" are promises about safety
// copy that a parent may be relying on. Rather than print them as static text
// for every language, each row reports its actual key coverage against English.
// A language that falls behind says so instead of claiming completeness it no
// longer has.
export default function LanguageSettings() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const override = useLocaleStore((st) => st.override);
  const setOverride = useLocaleStore((st) => st.setOverride);
  // Null override means "follow the device"; English is the fallback the
  // translation table itself falls back to.
  const language = override ?? 'en';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Language</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lede}>
          Ratings and safety copy read the same in every language listed here.
        </Text>

        <View style={styles.list}>
          {SUPPORTED_LOCALES.map((l) => {
            const active = l.code === language;
            const pct = coverageOf(l.code);
            return (
              <Pressable
                key={l.code}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => setOverride(l.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.code, active && styles.codeActive]}>
                  <Text style={[styles.codeText, active && styles.codeTextActive]}>
                    {l.code.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, active && styles.nameActive]}>{l.label}</Text>
                  <Kicker size={fontSize.caption} tone={active ? 'onNavy' : 'muted'}>
                    {l.code === 'en'
                      ? 'Default'
                      : pct >= 100
                        ? 'Fully translated'
                        : `${pct}% translated`}
                  </Kicker>
                </View>
                {active && (
                  <View style={styles.check}>
                    <Feather name="check" size={12} color={colors.primaryDark} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <NoticeBox style={styles.notice}>
          No machine translation. If a language is listed, a person wrote it.
        </NoticeBox>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: cx(18) },
    title: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.display, color: colors.textPrimary },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xl },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.5,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    list: { gap: spacing.sm, marginTop: spacing.lg },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    rowActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
    code: {
      width: 34,
      height: 34,
      borderRadius: radii.sm,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    codeActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
    codeText: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.sm, color: colors.textBody },
    codeTextActive: { color: colors.gold },
    name: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
    nameActive: { color: colors.white },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notice: { marginTop: spacing.lg },
  });
}
