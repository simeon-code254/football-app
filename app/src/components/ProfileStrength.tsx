import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors } from '../theme';

type StrengthInput = {
  avatarUrl?: string | null;
  bio?: string | null;
  club?: string | null;
  heightCm?: number | null;
  secondaryPosition?: string | null;
  videoCount: number;
  socials?: { instagram?: string | null; youtube?: string | null; tiktok?: string | null; facebook?: string | null };
};

type Item = { key: string; label: string; done: boolean; route?: string };

// The profile wizard no longer forces all four steps -- only the four
// fields the database actually requires are mandatory, because everything
// between signing up and using the app was costing users who never came
// back. That removed the push, so this is the pull: a visible, honest
// measure of how complete a profile is, and exactly what is missing.
//
// Every item here is something a scout genuinely uses when deciding
// whether to look at a player, which is why the copy names the benefit
// rather than the field.
export function buildStrengthItems(p: StrengthInput): Item[] {
  const hasSocial = !!(p.socials?.instagram || p.socials?.youtube || p.socials?.tiktok || p.socials?.facebook);
  return [
    { key: 'video', label: 'Upload a highlight', done: p.videoCount > 0, route: '/(player-tabs)/upload' },
    { key: 'avatar', label: 'Add a profile photo', done: !!p.avatarUrl, route: '/profile-complete?mode=edit' },
    { key: 'club', label: 'Add your current club', done: !!p.club, route: '/profile-complete?mode=edit' },
    { key: 'bio', label: 'Write a short bio', done: !!p.bio?.trim(), route: '/profile-complete?mode=edit' },
    { key: 'height', label: 'Add your height', done: p.heightCm != null, route: '/profile-complete?mode=edit' },
    { key: 'second', label: 'Add a secondary position', done: !!p.secondaryPosition, route: '/profile-complete?mode=edit' },
    { key: 'social', label: 'Link a social profile', done: hasSocial, route: '/profile-complete?mode=edit' },
  ];
}

export function ProfileStrength(props: StrengthInput) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const items = buildStrengthItems(props);
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  // Only ever show the next single missing thing. A checklist of seven
  // outstanding tasks reads as a chore; one clear next step reads as
  // progress.
  const next = items.find((i) => !i.done);

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.title}>Profile strength</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={`Profile strength ${pct} percent`}
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>

      {next ? (
        <Pressable
          style={styles.nextRow}
          onPress={() => next.route && router.push(next.route as never)}
          accessibilityRole="button"
          accessibilityLabel={`Next step: ${next.label}`}
        >
          <Feather name="arrow-right-circle" size={16} color={colors.primary} />
          <Text style={styles.nextText}>{next.label}</Text>
        </Pressable>
      ) : (
        <View style={styles.nextRow}>
          <Feather name="check-circle" size={16} color={colors.success} />
          <Text style={styles.doneText}>Your profile is complete — scouts see everything.</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
    },
    headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    title: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    pct: { fontFamily: fontFamily.bold, fontSize: fontSize.body, color: colors.primary },
    track: {
      height: 6,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
      marginTop: spacing.md,
    },
    fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
    nextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    nextText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.primary, flex: 1 },
    doneText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, flex: 1 },
  });
}
