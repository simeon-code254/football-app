import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';
import { RatingChip } from '../src/components/RatingChip';
import { InitialsAvatar } from '../src/components/InitialsAvatar';
import { useSessionStore } from '../src/store/useSessionStore';
import * as communityRepository from '../src/repositories/communityRepository';
import * as scoutingRepository from '../src/repositories/scoutingRepository';
import * as profileRepository from '../src/repositories/profileRepository';
import type { LeaderboardScope } from '../src/repositories/communityRepository';

// 'Most improved' first for players, deliberately. The rating-sorted boards
// all put the same handful of people on top, so everyone else opens the screen
// to be told they are nowhere. Improvement is the board where a week of work
// outranks a head start.
const PLAYER_SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: 'improved', label: 'Most improved' },
  { key: 'region', label: 'My region' },
  { key: 'position', label: 'My position' },
  { key: 'age', label: 'My age group' },
];

// Scouts get different scopes, because the player ones are meaningless for
// them and were quietly broken: a scout has no row in `players`, so "My
// position" and "My age group" filtered on null and rendered the same
// unfiltered list three times under three labels that each implied a filter.
//
// A scout's segment is their scouting preferences, not their own position, so
// that is what "Matches my filters" uses.
const SCOUT_SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: 'improved', label: 'Most improved' },
  { key: 'age', label: 'Top rated' },
  { key: 'position', label: 'Matches my filters' },
];

function ageBandOf(age: number | null | undefined): string {
  if (age == null) return 'unknown';
  if (age < 16) return 'u16';
  if (age < 18) return 'u18';
  if (age < 21) return 'u21';
  return 'senior';
}

// Segmented deliberately. A single global board produces a small group who
// compete and a large majority who disengage because they cannot place --
// so every view here is scoped to a peer group the viewer can realistically
// rank within: their region, their position, or their age band.
export default function Leaderboard() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);
  const player = useSessionStore((s) => s.player);
  const role = useSessionStore((s) => s.role);
  const isScout = role === 'scout';
  const SCOPES = isScout ? SCOUT_SCOPES : PLAYER_SCOPES;
  const [scope, setScope] = useState<LeaderboardScope>('improved');

  // The viewer's segment. For a player that is their own region, position and
  // age band. For a scout it comes from their saved scouting preferences --
  // they have no position or age of their own to rank within.
  const { data: viewer } = useQuery({
    queryKey: ['leaderboardViewer', userId, role],
    enabled: !!userId,
    queryFn: async () => {
      if (isScout) {
        const prefs = await scoutingRepository.getPreferences(userId!);
        const countries = await profileRepository.getCountries();
        const region = countries.find((c) => c.code === prefs?.countries?.[0])?.region ?? null;
        return {
          region,
          position: prefs?.positions?.[0] ?? null,
          // 'Top rated' is deliberately unsegmented for scouts, so this stays
          // null rather than inventing an age band they do not have.
          ageBand: null,
        };
      }
      const me = await profileRepository.getPlayerPublicView(userId!);
      const countries = await profileRepository.getCountries();
      const region = countries.find((c) => c.code === me?.nationality_code)?.region ?? null;
      return { region, position: me?.primary_position ?? null, ageBand: ageBandOf(me?.age) };
    },
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard', scope, viewer],
    enabled: !!viewer,
    queryFn: () => communityRepository.getLeaderboard(scope, viewer!),
  });

  const scopeLabel = isScout
    ? scope === 'position'
      ? viewer?.position ?? 'your filters'
      : 'this board'
    : scope === 'region' ? viewer?.region ?? 'your region'
    : scope === 'position' ? viewer?.position ?? 'your position'
    : viewer?.ageBand?.toUpperCase() ?? 'your age group';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.scopeRow}>
        {SCOPES.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setScope(s.key)}
            style={[styles.scopeChip, scope === s.key && styles.scopeChipActive]}
            accessibilityRole="tab"
            accessibilityLabel={s.label}
            accessibilityState={{ selected: scope === s.key }}
          >
            <Text style={[styles.scopeText, scope === s.key && styles.scopeTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonRow count={6} />}>
        <FlashList
          data={data ?? []}
          keyExtractor={(r, i) => r.id ?? String(i)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.lede}>Ranked by rating in {scopeLabel}.</Text>}
          ListEmptyComponent={
            // Honest rather than cheerful. On a young platform a thin
            // segment is the truth, and pretending otherwise would be
            // obvious to the one person standing in it.
            <View style={styles.empty}>
              <Feather name={scope === 'improved' ? 'trending-up' : 'users'} size={26} color={colors.textPlaceholder} />
              {/* The improvement board being empty means something different
                  from a thin segment: nobody's rating moved this week. Reusing
                  "not enough players here yet" would be inaccurate and would
                  read as a bug on a board that clearly has players. */}
              <Text style={styles.emptyTitle}>
                {scope === 'improved' ? 'No movement yet this week' : 'Not enough players here yet'}
              </Text>
              <Text style={styles.emptyText}>
                {scope === 'improved'
                  ? 'Ratings are compared against last week. Upload a new highlight and any gain shows up here.'
                  : `As more players in ${scopeLabel} get rated, this fills up. Upload a highlight to make sure you're on it.`}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            // Canvas screen 16 lifts the viewer's own row out of the list: a
            // navy card with gold rank, avatar and rating, and a slow glow.
            // Finding yourself on a leaderboard is the reason to open one, and
            // scanning a column of near-identical rows for your own name is
            // the failure this avoids.
            const isMe = !!item.id && item.id === userId;
            return (
              <Pressable
                style={[styles.row, isMe && styles.rowMe]}
                onPress={() => item.id && router.push({ pathname: '/player/[id]', params: { id: item.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}. ${item.full_name ?? 'Player'}${isMe ? ', you' : ''}, rating ${Math.round(item.overall_rating ?? 0)}`}
              >
                <Text style={[styles.rank, index < 3 && styles.rankTop, isMe && styles.rankMe]}>
                  {index + 1}
                </Text>
                <InitialsAvatar
                  name={item.full_name}
                  uri={item.avatar_url}
                  size={32}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
                    {item.full_name ?? 'Player'}
                    {isMe && <Text style={styles.youTag}> — you</Text>}
                  </Text>
                  <Text style={[styles.meta, isMe && styles.metaMe]}>
                    {[item.primary_position, item.region].filter(Boolean).join(' · ')}
                    {item.endorsement_count ? ` · ${item.endorsement_count} endorsements` : ''}
                  </Text>
                </View>
                {/* On the improvement board the ranking is by movement, so the
                    gain has to be visible -- otherwise the order looks arbitrary
                    next to a column of ratings. */}
                {scope === 'improved' && item.rating_delta != null && (
                  <Text style={[styles.delta, isMe && styles.deltaMe]}>
                    +{Math.round(item.rating_delta)}
                  </Text>
                )}
                <RatingChip
                  value={item.overall_rating == null ? null : Math.round(item.overall_rating)}
                  variant={isMe ? 'gold' : 'navy'}
                  size="sm"
                />
              </Pressable>
            );
          }}
        />
      </QueryState>
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
    scopeRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    scopeChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
    },
    scopeChipActive: { backgroundColor: colors.primary },
    scopeText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted },
    scopeTextActive: { color: colors.white },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    list: { paddingBottom: spacing.xxl },
    rowMe: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  rankMe: { color: colors.gold },
  nameMe: { color: colors.white },
  youTag: { color: colors.accentOnNavy, fontSize: fontSize.caption },
  metaMe: { color: colors.accentOnNavy },
  deltaMe: { color: colors.gold },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    rank: {
      width: 22,
      textAlign: 'center',
      fontFamily: fontFamily.bold,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
    },
    rankTop: { color: colors.gold },
    avatar: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
    name: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    meta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    delta: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.bodySm,
      color: colors.success,
      marginRight: spacing.sm,
    },
    empty: { alignItems: 'center', paddingVertical: spacing.huge, paddingHorizontal: spacing.xxl, gap: spacing.sm },
    emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    emptyText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },
  });
}
