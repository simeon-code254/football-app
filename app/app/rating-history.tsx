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
import { RatingRing } from '../src/components/RatingRing';
import { RatingHistory } from '../src/components/RatingHistory';
import { NoticeBox } from '../src/components/NoticeBox';
import { QueryState } from '../src/components/QueryState';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';
import * as communityRepository from '../src/repositories/communityRepository';
import * as videosRepository from '../src/repositories/videosRepository';

// Canvas screen 71 RATING HISTORY.
//
//   "Your progress"          78        SINCE JUNE  +13
//   JUN — JUL — AUG chart
//   BY ATTRIBUTE
//     Pace       68→81   +13
//     Defending  66→74    +8
//     Physical   64→68    +4
//     Shooting   59→58    −1
//   "Six clips uploaded. Players who post monthly gain twice as fast."
//
// -- THE PER-ATTRIBUTE DELTAS ARE NOT AVAILABLE --
//
// `player_rating_snapshots` stores the weekly OVERALL only; per-attribute
// history lives in `player_attribute_score_history`, which has no repository
// reader. So the by-attribute table shows each attribute's current value and
// says plainly that the change is not tracked yet, rather than showing a
// fabricated 68→81.
//
// The closing line is also not reproduced. "Players who post monthly gain
// twice as fast" is a causal claim about this product's own data, and nobody
// has measured it. It reads as encouragement and would function as evidence.
export default function RatingHistoryScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ratingHistoryScreen', userId],
    enabled: !!userId,
    queryFn: async () => {
      const player = await profileRepository.getMyPlayer(userId!);
      const [attributes, history, videos] = await Promise.all([
        profileRepository.getPlayerAttributes(userId!, !!player.is_goalkeeper),
        communityRepository.getRatingHistory(userId!, 12),
        videosRepository.getMyVideos(userId!, 60),
      ]);
      return { player, attributes, history, videos };
    },
  });

  const rating = data?.player.overall_rating ?? null;
  const snapshots = (data?.history ?? []).filter((s) => s.overall_rating != null);
  const first = snapshots.length ? snapshots[0].overall_rating : null;
  const gain = rating != null && first != null ? rating - first : null;
  const firstMonth = snapshots.length
    ? new Date(snapshots[0].week_start).toLocaleDateString(undefined, { month: 'long' })
    : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Your progress</Text>
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <RatingRing value={rating} size={cx(84)} />
            <View style={{ flex: 1 }}>
              <Kicker>{firstMonth ? `Since ${firstMonth}` : 'No history yet'}</Kicker>
              <Text
                style={[
                  styles.gain,
                  gain != null && gain > 0 && { color: colors.success },
                  gain != null && gain < 0 && { color: colors.error },
                ]}
              >
                {gain == null ? '—' : `${gain > 0 ? '+' : ''}${gain}`}
              </Text>
              {gain == null && (
                <Text style={styles.gainHint}>
                  Needs a few weeks of ratings before a change can be shown.
                </Text>
              )}
            </View>
          </View>

          <RatingHistory snapshots={data?.history ?? []} />

          <Kicker style={styles.sectionLabel}>By attribute</Kicker>
          <View style={styles.list}>
            {(data?.attributes ?? []).map((a) => (
              <View key={a.key} style={styles.row}>
                <Text style={styles.attrName}>{a.displayName}</Text>
                <Text style={styles.attrValue}>{a.value ?? '—'}</Text>
                {/* Per-attribute change is not read anywhere yet -- see note. */}
                <Kicker size={fontSize.caption} style={styles.attrDelta}>
                  {a.confidence ? `${a.confidence} confidence` : 'Not measured'}
                </Kicker>
              </View>
            ))}
          </View>

          <NoticeBox tone="info" style={styles.notice}>
            {data?.videos.length
              ? `${data.videos.length} clip${data.videos.length === 1 ? '' : 's'} uploaded. Each new clip refines these numbers.`
              : 'Upload a clip with AI analysis on to start building this history.'}
          </NoticeBox>
        </ScrollView>
      </QueryState>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: cx(18) },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
    },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xl },
    hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.lg },
    gain: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.hero,
      color: colors.textPrimary,
    },
    gainHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
      color: colors.textMuted,
    },
    sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
    list: { gap: spacing.sm },
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
    attrName: {
      flex: 1,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.body,
      color: colors.textPrimary,
    },
    attrValue: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    attrDelta: { width: 110, textAlign: 'right' },
    notice: { marginTop: spacing.lg },
  });
}
