import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, RefreshControl, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../../src/theme';
import { PlayerCard } from '../../src/components/PlayerCard';
import { POSITIONS } from '../../src/constants/football';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as profileRepository from '../../src/repositories/profileRepository';
import type { PlayerFilters } from '../../src/repositories/profileRepository';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonRow } from '../../src/components/Skeleton';

const CATEGORIES = ['All', 'Strikers', 'Midfield', 'Defense', 'GK'] as const;

const CATEGORY_POSITIONS: Record<(typeof CATEGORIES)[number], string[]> = {
  All: [],
  Strikers: ['ST', 'LW', 'RW'],
  Midfield: ['CM', 'CAM', 'CDM', 'LM', 'RM'],
  Defense: ['CB', 'LB', 'RB'],
  GK: ['GK'],
};

const SORT_OPTIONS: { key: NonNullable<PlayerFilters['sortBy']> | 'recommended'; label: string }[] = [
  { key: 'recommended', label: 'For You' },
  { key: 'rating', label: 'Rating' },
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
];

const SEARCH_DEBOUNCE_MS = 350;

type SheetFilters = { positions: string[]; countries: string[] };
const EMPTY_SHEET_FILTERS: SheetFilters = { positions: [], countries: [] };

// Matches the mockup's DISCOVER tab: position-chip filters, search bar,
// "Trending Players" list with rating badges -- extended with a full
// filter sheet (individual position / country / region) and a real
// "For You" recommended mode, same discipline as the scout-side filters.
export default function Discover() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const player = useSessionStore((s) => s.player);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // Defaults to 'rating', not 'recommended' -- the recommended feed is a
  // distinct curated view keyed off the viewer's own profile and doesn't
  // apply position/country filters at all, so starting there would make
  // "filtering does nothing" the very first thing a user experiences.
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['key']>('rating');
  const [filters, setFilters] = useState<SheetFilters>(EMPTY_SHEET_FILTERS);
  const [draftFilters, setDraftFilters] = useState<SheetFilters>(EMPTY_SHEET_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { data: countries } = useQuery({ queryKey: ['countries'], queryFn: profileRepository.getCountries });

  const regions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of countries ?? []) {
      if (!seen.has(c.region)) {
        seen.add(c.region);
        list.push(c.region);
      }
    }
    return list.sort();
  }, [countries]);

  const countryCodesForRegion = useCallback(
    (region: string) => (countries ?? []).filter((c) => c.region === region).map((c) => c.code),
    [countries]
  );

  // Category chips are a fast-path onto the same positions array the sheet
  // edits -- picking a category overwrites any individually-picked
  // positions, and the sheet's own picks fall back to "All" visually since
  // they no longer match a single category.
  const effectivePositions = category === 'All' ? filters.positions : CATEGORY_POSITIONS[category];
  const isRecommended = sortBy === 'recommended';

  const PAGE_SIZE = 20;
  const listQuery = useInfiniteQuery({
    queryKey: ['discoverTrending', debouncedQuery, sortBy, effectivePositions, filters.countries],
    enabled: !isRecommended,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      profileRepository.listPlayerPublicViews(
        {
          search: debouncedQuery || undefined,
          sortBy: sortBy === 'recommended' ? undefined : sortBy,
          positions: effectivePositions.length ? effectivePositions : undefined,
          countryCodes: filters.countries.length ? filters.countries : undefined,
        },
        { page: pageParam, pageSize: PAGE_SIZE }
      ),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });

  const recommendedQuery = useInfiniteQuery({
    queryKey: ['discoverRecommended', player?.id, player?.primary_position, player?.nationality_code],
    enabled: isRecommended && !!player?.id,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      profileRepository.listRecommendedPlayers(
        { id: player!.id, primaryPosition: player?.primary_position, nationalityCode: player?.nationality_code },
        { page: pageParam, pageSize: PAGE_SIZE }
      ),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });

  const active = isRecommended ? recommendedQuery : listQuery;
  const { data, isLoading, isRefetching, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = active;
  const filtered = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const countryName = (code: string) => countries?.find((c) => c.code === code)?.name ?? code;
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...filters.positions
      .filter(() => category === 'All')
      .map((p) => ({ key: `pos-${p}`, label: p, clear: () => setFilters((f) => ({ ...f, positions: f.positions.filter((x) => x !== p) })) })),
    ...filters.countries.map((c) => ({ key: `c-${c}`, label: countryName(c), clear: () => setFilters((f) => ({ ...f, countries: f.countries.filter((x) => x !== c) })) })),
  ];

  const openSheet = () => {
    setDraftFilters(filters);
    setSheetOpen(true);
  };

  const renderItem = useCallback(
    ({ item }: { item: (typeof filtered)[number] }) => (
      <PlayerCard
        name={item.full_name || 'Unnamed player'}
        positionLine={[item.primary_position, item.nationality_name].filter(Boolean).join(' · ')}
        rating={item.overall_rating ?? 0}
        avatar={item.avatar_url ?? images.avatarMale}
        onPress={() => router.push({ pathname: '/player/[id]', params: { id: item.id ?? '' } })}
      />
    ),
    []
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.textPlaceholder} />
          <TextInput
            placeholder="Search players, teams..."
            placeholderTextColor={colors.textPlaceholder}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <Pressable style={styles.filterBtn} onPress={openSheet} accessibilityRole="button" accessibilityLabel="Filters">
          <Feather name="sliders" size={16} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.chipsRow}>
        {CATEGORIES.map((c) => {
          const isActive = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => {
                setCategory(c);
                // Recommended mode ignores position filters entirely --
                // picking a category should visibly filter the list, not
                // silently do nothing because "For You" is still active.
                if (c !== 'All') setSortBy((s) => (s === 'recommended' ? 'rating' : s));
              }}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by</Text>
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortBy === opt.key;
          return (
            <Pressable key={opt.key} onPress={() => setSortBy(opt.key)} style={[styles.sortChip, isActive && styles.sortChipActive]}>
              <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {chips.length > 0 && !isRecommended && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {chips.map((c) => (
            <Pressable key={c.key} style={styles.filterChip} onPress={c.clear}>
              <Text style={styles.filterChipText}>{c.label}</Text>
              <Feather name="x" size={12} color={colors.primary} />
            </Pressable>
          ))}
          <Pressable onPress={() => setFilters(EMPTY_SHEET_FILTERS)}>
            <Text style={styles.clearAll}>Clear all</Text>
          </Pressable>
        </ScrollView>
      )}

      <FlashList
        data={filtered}
        keyExtractor={(item) => item.id ?? ''}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isRecommended ? 'Recommended For You' : 'Trending Players'}</Text>
            {isRecommended && (
              <Text style={styles.sectionSub}>
                {player?.primary_position
                  ? `Players who also play ${player.primary_position}, ranked by rating`
                  : 'Complete your profile position to personalize this list'}
              </Text>
            )}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} /> : null}
        ListEmptyComponent={
          <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonRow />}>
            <Text style={styles.emptyText}>No players found.</Text>
          </QueryState>
        }
        renderItem={renderItem}
      />

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView accessibilityViewIsModal style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.filterLabel}>Position</Text>
                <View style={styles.wrapRow}>
                  {POSITIONS.map((pos) => {
                    const isActive = draftFilters.positions.includes(pos);
                    return (
                      <Pressable
                        key={pos}
                        style={[styles.optionPill, isActive && styles.optionPillActive]}
                        onPress={() => setDraftFilters((f) => ({ ...f, positions: toggle(f.positions, pos) }))}
                      >
                        <Text style={[styles.optionPillText, isActive && styles.optionPillTextActive]}>{pos}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.filterLabel}>Region</Text>
                <View style={styles.wrapRow}>
                  {regions.map((region) => {
                    const codes = countryCodesForRegion(region);
                    const isActive = codes.length > 0 && codes.every((c) => draftFilters.countries.includes(c));
                    return (
                      <Pressable
                        key={region}
                        style={[styles.optionPill, isActive && styles.optionPillActive]}
                        onPress={() =>
                          setDraftFilters((f) => ({
                            ...f,
                            countries: isActive
                              ? f.countries.filter((c) => !codes.includes(c))
                              : [...new Set([...f.countries, ...codes])],
                          }))
                        }
                      >
                        <Text style={[styles.optionPillText, isActive && styles.optionPillTextActive]}>{region}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.filterLabel}>Country</Text>
                <View style={styles.wrapRow}>
                  {(countries ?? []).map((c) => {
                    const isActive = draftFilters.countries.includes(c.code);
                    return (
                      <Pressable
                        key={c.code}
                        style={[styles.optionPill, isActive && styles.optionPillActive]}
                        onPress={() => setDraftFilters((f) => ({ ...f, countries: toggle(f.countries, c.code) }))}
                      >
                        <Text style={[styles.optionPillText, isActive && styles.optionPillTextActive]}>{c.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.sheetActions}>
                <Pressable style={styles.resetBtn} onPress={() => setDraftFilters(EMPTY_SHEET_FILTERS)}>
                  <Text style={styles.resetText}>Reset</Text>
                </Pressable>
                <Pressable
                  style={styles.applyBtn}
                  onPress={() => {
                    setCategory('All');
                    setFilters(draftFilters);
                    if (draftFilters.positions.length || draftFilters.countries.length) {
                      setSortBy((s) => (s === 'recommended' ? 'rating' : s));
                    }
                    setSheetOpen(false);
                  }}
                >
                  <Text style={styles.applyText}>Apply Filters</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.display, color: colors.textPrimary },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  filterBtn: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  chipTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 10, flexWrap: 'wrap' },
  sortLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted, marginRight: 2 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: colors.surface },
  sortChipActive: { backgroundColor: colors.primaryDark },
  sortChipText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textBody },
  sortChipTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  filterChipsRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center', marginBottom: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.infoTint, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.primary },
  clearAll: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginLeft: 4 },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  sectionSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  emptyText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: 20, maxHeight: '80%' },
  sheetTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginBottom: 16 },
  filterLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginTop: 16, marginBottom: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  optionPillActive: { backgroundColor: colors.primary },
  optionPillText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  optionPillTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.divider },
  resetBtn: { flex: 1, height: 50, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  applyBtn: { flex: 2, height: 50, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.white },
  });
}
