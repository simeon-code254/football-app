import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  kicker,
  radii,
  spacing,
  useThemeColors,
} from '../src/theme';
import { Logo } from '../src/components/Logo';
import { Kicker } from '../src/components/Kicker';
import { RatingChip } from '../src/components/RatingChip';
import { InitialsAvatar } from '../src/components/InitialsAvatar';
import { QueryState } from '../src/components/QueryState';
import { SkeletonCards } from '../src/components/Skeleton';
import * as profileRepository from '../src/repositories/profileRepository';
import { images } from '../src/constants/images';

// Canvas screen 04 BROWSE (SIGNED OUT).
//
// The shop window: what someone sees before they have an account. A featured
// "RISING THIS WEEK" card over a photo, a short top-of-the-week list, and a
// join prompt pinned to the bottom.
//
// -- WHAT AN ANONYMOUS VIEWER ACTUALLY GETS --
//
// This screen does not decide what is visible; the database does. RLS
// (players_restrict_public_select, protect_minors_from_anon) already hides
// under-18 players from anyone who is not an ID-checked scout or club, so a
// signed-out browser sees a legitimately smaller list. That is the intended
// behaviour, not an empty state to work around -- which is why the count in
// the header reports what came back rather than a global total.
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'defenders', label: 'Defenders' },
  { key: 'u19', label: 'U19' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const DEFENDER_POSITIONS = ['CB', 'LB', 'RB'];

export default function Browse() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['browsePlayers', filter],
    queryFn: () =>
      profileRepository.listPlayerPublicViews(
        {
          sortBy: 'rating',
          ...(filter === 'defenders' ? { positions: DEFENDER_POSITIONS } : {}),
          ...(filter === 'u19' ? { ageMax: 18 } : {}),
        },
        { pageSize: 12 }
      ),
  });

  const players = data?.items ?? [];
  const [featured, ...rest] = players;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Logo variant="navy" size={cx(19)} />
          <Text style={styles.heading} maxFontSizeMultiplier={1.3}>
            Discover
          </Text>
          <Kicker>{players.length} players</Kicker>
        </View>

        <Pressable style={styles.search} onPress={() => router.push('/welcome')}>
          <Feather name="search" size={14} color={colors.textMuted} />
          <Text style={styles.searchText}>Position, country, age…</Text>
        </Pressable>

        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.filter, active ? styles.filterOn : styles.filterOff]}
              >
                <Text style={[styles.filterText, active && styles.filterTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <QueryState
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          skeleton={<SkeletonCards />}
        >
          {featured && (
            <Pressable
              style={styles.featured}
              onPress={() => router.push('/welcome')}
              accessibilityRole="button"
              accessibilityLabel={`${featured.full_name ?? 'Player'}, rated ${featured.overall_rating ?? 'not yet'}`}
            >
              <ImageBackground
                source={{ uri: featured.avatar_url ?? images.reelsClip }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(29,45,61,0.25)', 'transparent', 'rgba(29,45,61,0.94)']}
                locations={[0, 0.3, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.risingPill}>
                <Text style={styles.risingText}>Rising this week</Text>
              </View>
              <View style={styles.featuredFoot}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featuredName} numberOfLines={1}>
                    {featured.full_name ?? 'Player'}
                  </Text>
                  <Text style={styles.featuredMeta} numberOfLines={1}>
                    {[
                      featured.primary_position,
                      featured.nationality_name,
                      featured.age,
                      featured.video_count ? `${featured.video_count} clips` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <RatingChip value={featured.overall_rating} variant="gold" size="lg" />
              </View>
            </Pressable>
          )}

          <Kicker style={styles.sectionLabel}>Top this week</Kicker>

          <View style={styles.list}>
            {rest.slice(0, 6).map((p) => (
              <Pressable key={p.id} style={styles.row} onPress={() => router.push('/welcome')}>
                <InitialsAvatar name={p.full_name} uri={p.avatar_url} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {p.full_name ?? 'Player'}
                  </Text>
                  <Kicker size={fontSize.caption} style={{ marginTop: 1 }}>
                    {[p.primary_position, p.nationality_name, p.age].filter(Boolean).join(' · ')}
                  </Kicker>
                </View>
                <RatingChip value={p.overall_rating} />
              </Pressable>
            ))}
          </View>
        </QueryState>
      </ScrollView>

      <View style={styles.joinBar}>
        <Logo variant="gold" size={cx(26)} />
        <View style={{ flex: 1 }}>
          <Text style={styles.joinTitle}>Want on this list?</Text>
          <Text style={styles.joinSub}>Free, always, for players.</Text>
        </View>
        <Pressable
          style={styles.joinButton}
          onPress={() => router.push('/role-select')}
          accessibilityRole="button"
        >
          <Text style={styles.joinButtonText}>Join</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: cx(15), paddingBottom: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    heading: {
      flex: 1,
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
    },
    search: {
      height: 48,
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
    },
    searchText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
    filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    filter: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radii.lg },
    filterOn: { backgroundColor: colors.primaryDark },
    filterOff: { borderWidth: 1, borderColor: colors.border },
    filterText: {
      ...kicker,
      fontSize: fontSize.caption,
      color: colors.textMuted,
    },
    filterTextOn: { color: colors.gold },
    featured: {
      height: 126,
      marginTop: spacing.md,
      borderRadius: radii.lg,
      overflow: 'hidden',
      backgroundColor: colors.primaryDark,
    },
    risingPill: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      backgroundColor: colors.gold,
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    risingText: { ...kicker, fontSize: fontSize.caption, color: colors.primaryDark },
    featuredFoot: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    featuredName: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.title,
      color: colors.white,
    },
    featuredMeta: { ...kicker, fontSize: fontSize.caption, color: colors.accentOnNavy, marginTop: 2 },
    sectionLabel: { marginTop: spacing.lg },
    list: { gap: spacing.sm, marginTop: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
    },
    rowName: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    joinBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      margin: cx(15),
      marginTop: 0,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.primaryDark,
    },
    joinTitle: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.white,
    },
    joinSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: 'rgba(255,255,255,0.6)',
    },
    joinButton: {
      backgroundColor: colors.gold,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.lg,
      // Tall enough to be a real target; the canvas draws it smaller.
      minHeight: 40,
      justifyContent: 'center',
    },
    joinButtonText: {
      ...kicker,
      fontSize: fontSize.xs,
      color: colors.primaryDark,
    },
  });
}
