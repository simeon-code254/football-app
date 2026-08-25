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
import { Logo } from '../src/components/Logo';
import { VerificationBadge, VerificationRole } from '../src/components/VerificationBadge';

// Canvas screen 80 THE VERIFICATION BADGE.
//
//   "The Matobev mark"
//   "One shield, three colours. The mark inside is always ours — you cannot
//    fake it in a display name."
//   Player · green   — identity confirmed, guardian consent if under 18. Free.
//   Scout · steel    — government ID plus an agency letter. $49 a year.
//   Club · gold      — registration number checked against the league. $49/yr.
//   "Unverified accounts cannot see or message any player under 18. That is
//    enforced in the database, not the interface."
//
// -- THE LAST LINE IS THE WHOLE SCREEN --
//
// It is also literally true, which is why it is worth printing. The gate is
// is_verified_scout() in Postgres, referenced by the RLS policies on profiles,
// players, conversations and trials. A client that bypassed every screen in
// this app still could not read a minor's row. Saying "enforced in the
// database, not the interface" is a claim most products cannot make, and it is
// the reason the badge means anything.
const TIERS: {
  role: VerificationRole;
  name: string;
  colour: string;
  requirement: string;
}[] = [
  {
    role: 'player',
    name: 'Player · green',
    colour: 'green',
    requirement: 'Identity confirmed, guardian consent on file if under 18. Free.',
  },
  {
    role: 'scout',
    name: 'Scout · steel',
    colour: 'steel',
    requirement: 'Government ID plus an agency letter. $49 a year.',
  },
  {
    role: 'club',
    name: 'Club · gold',
    colour: 'gold',
    requirement: 'Registration number checked against the league. $49 a year.',
  },
];

export default function VerificationBadgeExplainer() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
            <Feather name="chevron-left" size={22} color={colors.white} />
          </Pressable>
          <Logo variant="gold" size={20} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            The Matobev mark
          </Text>
          <Text style={styles.lede}>
            One shield, three colours. The mark inside is always ours — you cannot fake it in a
            display name.
          </Text>

          <View style={styles.tiers}>
            {TIERS.map((t) => (
              <View key={t.role} style={styles.tierRow}>
                <VerificationBadge role={t.role} size={38} glyph="role" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tierName, { color: tierColour(t.role, colors) }]}>
                    {t.name}
                  </Text>
                  <Text style={styles.tierReq}>{t.requirement}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.enforcement}>
            <Text style={styles.enforcementText}>
              Unverified accounts cannot see or message any player under 18. That is enforced in
              the database, not the interface.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function tierColour(role: VerificationRole, colors: ReturnType<typeof useThemeColors>) {
  // Matches the rim of each hexagon, so the name and the badge read as one.
  return role === 'player' ? '#7FD8A4' : role === 'scout' ? colors.accentOnNavy : colors.gold;
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.primaryDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: cx(18),
    },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xxl },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.white,
      marginTop: spacing.lg,
    },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.5,
      color: 'rgba(255,255,255,0.6)',
      marginTop: spacing.sm,
    },
    tiers: { gap: spacing.lg, marginTop: spacing.xxl },
    tierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    tierName: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodyLg },
    tierReq: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 2,
    },
    enforcement: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: radii.md,
      padding: spacing.lg,
      marginTop: spacing.xxl,
    },
    enforcementText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.5,
      color: 'rgba(255,255,255,0.7)',
    },
  });
}
