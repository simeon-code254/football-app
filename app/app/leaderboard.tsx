import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';
import { RatingBadge } from '../src/components/RatingBadge';
import { useSessionStore } from '../src/store/useSessionStore';
import * as communityRepository from '../src/repositories/communityRepository';
import * as profileRepository from '../src/repositories/profileRepository';
import { images } from '../src/constants/images';
import type { LeaderboardScope } from '../src/repositories/communityRepository';

const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: 'region', label: 'My region' },
  { key: 'position', label: 'My position' },
  { key: 'age', label: 'My age group' },
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
  const [scope, setScope] = useState<LeaderboardScope>('region');

  // The viewer's own segment values. Region comes from their country, which
  // the leaderboard view already resolves.
  const { data: viewer } = useQuery({
    queryKey: ['leaderboardViewer', userId],
    enabled: !!userId,
    queryFn: async () => {
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

  const scopeLabel =
    scope === 'region' ? viewer?.region ?? 'your region'
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
              <Feather name="users" size={26} color={colors.textPlaceholder} />
              <Text style={styles.emptyTitle}>Not enough players here yet</Text>
              <Text style={styles.emptyText}>
                As more players in {scopeLabel} get rated, this fills up. Upload a highlight to make sure you're on
                it.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.row}
              onPress={() => item.id && router.push({ pathname: '/player/[id]', params: { id: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${index + 1}. ${item.full_name ?? 'Player'}, rating ${Math.round(item.overall_rating ?? 0)}`}
            >
              <Text style={[styles.rank, index < 3 && styles.rankTop]}>{index + 1}</Text>
              <Image
                source={{ uri: item.avatar_url ?? images.avatarMale }}
                style={styles.avatar}
                cachePolicy="memory-disk"
                recyclingKey={item.id ?? undefined}
                transition={200}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.full_name ?? 'Player'}
                </Text>
                <Text style={styles.meta}>
                  {[item.primary_position, item.region].filter(Boolean).join(' · ')}
                  {item.endorsement_count ? ` · ${item.endorsement_count} endorsements` : ''}
                </Text>
              </View>
              <RatingBadge rating={Math.round(item.overall_rating ?? 0)} size="sm" />
            </Pressable>
          )}
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
