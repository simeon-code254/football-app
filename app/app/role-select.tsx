import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  kicker,
  radii,
  spacing,
  useThemeColors,
  useIsDark,
  elevation,
} from '../src/theme';
import { Logo } from '../src/components/Logo';
import { Button } from '../src/components/Button';
import { VerificationBadge, VerificationRole } from '../src/components/VerificationBadge';

// Canvas screen 03 ROLE SELECTION.
//
// Three roles, not two. The canvas offers Player / Scout / Club from the very
// first decision the user makes, and the selected one is drawn as a navy card
// with a gold check while the others stay as bordered paper cards.
//
// Each carries the hexagonal verification badge for its tier -- green player,
// steel scout, gold club -- which is the first place a user meets the mark
// that later gates who can see under-18 players.
type Role = VerificationRole;

const ROLES: {
  key: Role;
  label: string;
  pill: string;
  description: string;
}[] = [
  {
    key: 'player',
    label: 'Player',
    pill: 'FREE FOREVER',
    description: 'Upload clips, get FIFA-style ratings, get found.',
  },
  {
    key: 'scout',
    label: 'Scout',
    pill: 'ID CHECK REQUIRED',
    description: 'Search, shortlist and message players directly.',
  },
  {
    key: 'club',
    label: 'Club',
    pill: 'ID CHECK REQUIRED',
    description: 'Post trials, run a scouting team, manage applicants.',
  },
];

export default function RoleSelect() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const [selected, setSelected] = useState<Role>('player');
  const styles = makeStyles(colors);

  const chosen = ROLES.find((r) => r.key === selected)!;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        {/* The canvas's gold radial glow at 88% 6%. */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="roleGlow" cx="88%" cy="6%" r="58%">
              <Stop offset="0" stopColor="#FFC53D" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#FFC53D" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#roleGlow)" />
        </Svg>

        <View style={styles.headerInner}>
          <Logo variant="gold" size={cx(24)} />
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Who are you?
          </Text>
          <Text style={styles.subtitle}>Your role decides what you see.</Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.body} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {ROLES.map((role) => {
            const active = role.key === selected;
            return (
              <Pressable
                key={role.key}
                onPress={() => setSelected(role.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${role.label}. ${role.pill}. ${role.description}`}
                style={[
                  styles.card,
                  active
                    ? [styles.cardActive, elevation('raised', isDark)]
                    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                ]}
              >
                <VerificationBadge role={role.key} size={38} glyph="role" />

                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text
                      style={[styles.roleName, active && { color: colors.white }]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {role.label}
                    </Text>
                    <RolePill role={role.key} label={role.pill} />
                  </View>
                  <Text style={[styles.roleDesc, active && { color: 'rgba(255,255,255,0.6)' }]}>
                    {role.description}
                  </Text>
                </View>

                {/* The canvas marks the choice with a filled gold check. */}
                <View style={[styles.radio, active && styles.radioOn]}>
                  {active && <Feather name="check" size={12} color={colors.primaryDark} />}
                </View>
              </Pressable>
            );
          })}

          <Text style={styles.note}>
            Scouts and clubs are ID-checked before they can see under-18 players.
          </Text>
        </ScrollView>

        <Button
          label={`Continue as ${chosen.label}`}
          variant="navy"
          onPress={() => router.push({ pathname: '/signup', params: { role: selected } })}
          style={styles.cta}
        />
      </SafeAreaView>
    </View>
  );
}

// The small caps tag beside each role name. The canvas tints it per role --
// gold for the free player tier, cool steel for scout, warm gold for club --
// each on its own low-saturation ground so the tag never competes with the
// role name beside it.
function RolePill({ role, label }: { role: Role; label: string }) {
  const colors = useThemeColors();

  const tone =
    role === 'player'
      ? { backgroundColor: colors.gold, color: colors.primaryDark }
      : role === 'scout'
        ? { backgroundColor: colors.infoTint, color: colors.primary }
        : { backgroundColor: colors.warningTint, color: colors.goldDark };

  return (
    <View
      style={{
        backgroundColor: tone.backgroundColor,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Text
        style={{ ...kicker, fontSize: fontSize.caption, color: tone.color }}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.primaryDark, overflow: 'hidden' },
    headerInner: { paddingHorizontal: cx(20), paddingTop: cx(14), paddingBottom: cx(20) },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.white,
      marginTop: spacing.sm,
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 4,
    },
    body: { flex: 1, paddingHorizontal: cx(15) },
    list: { paddingTop: spacing.md, gap: spacing.md, paddingBottom: spacing.md },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radii.xl,
      padding: spacing.lg,
    },
    cardActive: { backgroundColor: colors.primaryDark },
    cardBody: { flex: 1 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
    roleName: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.title,
      color: colors.textPrimary,
    },
    roleDesc: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
      color: colors.textMuted,
      marginTop: 3,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.borderDashed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { backgroundColor: colors.gold, borderColor: colors.gold },
    note: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.sm,
      padding: spacing.md,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
      color: colors.textMuted,
    },
    cta: { marginBottom: spacing.lg },
  });
}
