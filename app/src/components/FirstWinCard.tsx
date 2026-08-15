import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors } from '../theme';
import * as trialsRepository from '../repositories/trialsRepository';

// Shown to a player who has just finished the wizard but has not uploaded
// yet -- the gap where the app previously gave nothing back.
//
// The first genuinely rewarding moment used to be an AI rating, which sits
// behind an upload, a transfer over expensive data, and a processing wait.
// That is far too late: research puts churn above 98% for users who never
// reach a value milestone, and the target is the first session. Everything
// here is computed from data the app already holds, so it needs no AI and
// no upload.
//
// Design rule that matters more than the layout: never lead with a zero. On
// a young platform the true numbers are small, and "0 scouts near you" is
// worse than saying nothing. Each row below is omitted rather than shown
// empty, and the card hides itself entirely if nothing encouraging is true.
export function FirstWinCard({ primaryPosition }: { primaryPosition?: string | null }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const { data } = useQuery({
    queryKey: ['firstWinFacts', primaryPosition],
    queryFn: async () => {
      const { items } = await trialsRepository.listOpenTrials({ pageSize: 50 });
      const matching = primaryPosition
        ? items.filter((t) => (t.positions ?? []).includes(primaryPosition as never))
        : [];
      return { openCount: items.length, matchingCount: matching.length };
    },
  });

  if (!data) return null;

  const rows: { icon: React.ComponentProps<typeof Feather>['name']; text: string; onPress?: () => void }[] = [];

  if (data.matchingCount > 0) {
    rows.push({
      icon: 'clipboard',
      text:
        data.matchingCount === 1
          ? `1 open trial is looking for a ${primaryPosition}`
          : `${data.matchingCount} open trials are looking for a ${primaryPosition}`,
      onPress: () => router.push('/trials'),
    });
  } else if (data.openCount > 0) {
    // No position match, but trials exist -- still worth surfacing, just
    // without implying it is about them specifically.
    rows.push({
      icon: 'clipboard',
      text: data.openCount === 1 ? '1 trial is open right now' : `${data.openCount} trials are open right now`,
      onPress: () => router.push('/trials'),
    });
  }

  // Always true and always useful: seeing yourself the way a scout does is
  // itself the reward, and it needs no data at all.
  rows.push({
    icon: 'eye',
    text: 'See your profile the way a scout sees it',
    onPress: () => router.push('/(player-tabs)/profile'),
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>You're on the map</Text>
      <Text style={styles.sub}>Here's what's waiting for you right now.</Text>

      <View style={styles.rows}>
        {rows.map((r) => (
          <Pressable
            key={r.text}
            style={styles.row}
            onPress={r.onPress}
            accessibilityRole="button"
            accessibilityLabel={r.text}
          >
            <View style={styles.iconWrap}>
              <Feather name={r.icon} size={15} color={colors.primary} />
            </View>
            <Text style={styles.rowText}>{r.text}</Text>
            <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
          </Pressable>
        ))}
      </View>
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
    title: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
    sub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginTop: 2 },
    rows: { marginTop: spacing.md, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: radii.pill,
      backgroundColor: colors.infoTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textBody },
  });
}
