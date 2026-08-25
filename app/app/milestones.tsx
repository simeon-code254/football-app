import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';
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
import { QueryState } from '../src/components/QueryState';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';
import * as videosRepository from '../src/repositories/videosRepository';
import * as communityRepository from '../src/repositories/communityRepository';

// Canvas screen 78 MILESTONES.
//
//   "Milestones"                                              4 / 9
//   🔥 4-week streak      "Upload this week to keep it alive"
//   First rating          EARNED JUN
//   +10 in a month        EARNED AUG
//   Seen by a scout       EARNED AUG
//   Rating 80+            2 POINTS AWAY
//   "Milestones are private until you choose to show them on your profile."
//
// -- WHAT IS EARNABLE HERE, AND WHAT IS NOT --
//
// Four of the canvas's milestones are derivable from tables that exist: a first
// rating (overall_rating is set), a monthly gain (rating snapshots), being seen
// by a scout (profile_views), and reaching 80. Those are computed below.
//
// The streak is not. Nothing counts consecutive weeks of activity -- the same
// gap that keeps the flame off the home header and off the upload success
// screen. It is listed as locked with an honest reason rather than shown lit,
// because a milestone the player did not earn is worse than one they cannot yet
// see. The count in the header reflects only what can actually be evaluated.
export default function Milestones() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['milestones', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [player, videos, history, views] = await Promise.all([
        profileRepository.getMyPlayer(userId!),
        videosRepository.getMyVideos(userId!, 60),
        communityRepository.getRatingHistory(userId!, 12),
        profileRepository.getProfileViewCount(userId!),
      ]);
      return { player, videos, history, views };
    },
  });

  const rating = data?.player.overall_rating ?? null;
  const history = data?.history ?? [];
  const best = history.reduce<number | null>(
    (acc, s) => (s.overall_rating == null ? acc : acc == null ? s.overall_rating : Math.max(acc, s.overall_rating)),
    null
  );
  const worst = history.reduce<number | null>(
    (acc, s) => (s.overall_rating == null ? acc : acc == null ? s.overall_rating : Math.min(acc, s.overall_rating)),
    null
  );
  const monthGain = best != null && worst != null ? best - worst : null;

  const milestones: {
    label: string;
    detail: string;
    state: 'earned' | 'locked' | 'unknown';
  }[] = [
    {
      label: 'First clip uploaded',
      detail: data?.videos.length ? 'Earned' : 'Upload a highlight to start',
      state: data?.videos.length ? 'earned' : 'locked',
    },
    {
      label: 'First rating',
      detail: rating != null ? 'Earned' : 'Upload a clip with AI analysis on',
      state: rating != null ? 'earned' : 'locked',
    },
    {
      label: '+10 in a month',
      detail:
        monthGain == null
          ? 'Needs a few weeks of history'
          : monthGain >= 10
            ? 'Earned'
            : `${10 - monthGain} to go`,
      state: monthGain == null ? 'unknown' : monthGain >= 10 ? 'earned' : 'locked',
    },
    {
      label: 'Seen by a scout',
      detail: data?.views ? 'Earned' : 'No profile views yet',
      state: data?.views ? 'earned' : 'locked',
    },
    {
      label: 'Rating 80+',
      detail:
        rating == null
          ? 'Needs a rating first'
          : rating >= 80
            ? 'Earned'
            : `${80 - rating} points away`,
      state: rating == null ? 'unknown' : rating >= 80 ? 'earned' : 'locked',
    },
    {
      // Deliberately last and deliberately unknowable -- see the note above.
      label: 'Weekly streak',
      detail: 'Not tracked yet',
      state: 'unknown',
    },
  ];

  const earned = milestones.filter((m) => m.state === 'earned').length;
  const evaluable = milestones.filter((m) => m.state !== 'unknown').length;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Milestones</Text>
        <Kicker>
          {earned} / {evaluable}
        </Kicker>
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.list}>
            {milestones.map((m) => (
              <View key={m.label} style={styles.row}>
                <View
                  style={[
                    styles.badge,
                    m.state === 'earned' && styles.badgeEarned,
                    m.state === 'unknown' && styles.badgeUnknown,
                  ]}
                >
                  <Feather
                    name={m.state === 'earned' ? 'check' : m.state === 'unknown' ? 'minus' : 'lock'}
                    size={13}
                    color={
                      m.state === 'earned'
                        ? colors.primaryDark
                        : m.state === 'unknown'
                          ? colors.textMuted
                          : colors.textPlaceholder
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, m.state !== 'earned' && styles.labelLocked]}>
                    {m.label}
                  </Text>
                  <Kicker size={fontSize.caption} style={{ marginTop: 2 }}>
                    {m.detail}
                  </Kicker>
                </View>
              </View>
            ))}
          </View>

          <NoticeBox tone="info" style={styles.notice}>
            Milestones are private until you choose to show them on your profile.
          </NoticeBox>
        </ScrollView>
      </QueryState>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: cx(18),
    },
    title: {
      flex: 1,
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
    },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xl },
    list: { gap: spacing.sm, marginTop: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    badge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeEarned: { backgroundColor: colors.gold },
    badgeUnknown: { backgroundColor: colors.surfaceMuted },
    label: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    labelLocked: { color: colors.textMuted },
    notice: { marginTop: spacing.lg },
  });
}
