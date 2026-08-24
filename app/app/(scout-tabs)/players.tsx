import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Modal, ScrollView, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontFamilyDisplay, fontSize, radii, useThemeColors, useIsDark, elevation } from '../../src/theme';
import { Kicker } from '../../src/components/Kicker';
import { PlayerCard } from '../../src/components/PlayerCard';
import { POSITIONS } from '../../src/constants/football';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as profileRepository from '../../src/repositories/profileRepository';
import type { PlayerFilters } from '../../src/repositories/profileRepository';
import * as scoutingRepository from '../../src/repositories/scoutingRepository';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonCards } from '../../src/components/Skeleton';

const MAX_COMPARE = 3;
const SEARCH_DEBOUNCE_MS = 350;
const SORT_OPTIONS: { key: NonNullable<PlayerFilters['sortBy']>; label: string }[] = [
  { key: 'rating', label: 'Rating' },
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
];

type Filters = {
  positions: string[];
  minAge: string;
  maxAge: string;
  minOverall: string;
  countries: string[]; // country codes
  foot: string[];
  club: string;
  minHeight: string;
  maxHeight: string;
  recentlyActiveOnly: boolean;
  hasVideosOnly: boolean;
};

const EMPTY_FILTERS: Filters = {
  positions: [],
  minAge: '',
  maxAge: '',
  minOverall: '',
  countries: [],
  foot: [],
  club: '',
  minHeight: '',
  maxHeight: '',
  recentlyActiveOnly: false,
  hasVideosOnly: false,
};

// Discover Players — spec §16/17: the scouting database with a filter
// bottom sheet instead of 20 filters crammed on-screen, and applied filters
// surfaced as removable chips.
export default function DiscoverPlayers() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [savedOnly, setSavedOnly] = useState(saved === '1');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<NonNullable<PlayerFilters['sortBy']>>('rating');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Firing a network request on every keystroke induces list flicker as
  // fast typers outrun each other's responses -- wait for a pause instead.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { data: countries } = useQuery({ queryKey: ['countries'], queryFn: profileRepository.getCountries });

  // "Saved Players" on Home used to route here with no way to actually
  // filter to just the scout's saved list -- that view genuinely didn't
  // exist anywhere in the app (listSavedPlayers was only ever used to
  // compute a count on the profile screen). Reuses this same
  // filter/sort/compare-ready list instead of building a whole new screen.
  // Only IDs are needed here, not the full player+profile join.
  const { data: savedIdRows } = useQuery({
    queryKey: ['savedPlayerIds', userId],
    enabled: !!userId && savedOnly,
    queryFn: () => scoutingRepository.listSavedPlayerIds(userId!),
  });
  const savedIds = savedIdRows ?? [];

  const PAGE_SIZE = 20;
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['discoverPlayers', debouncedQuery, filters, sortBy, savedOnly, savedIds],
    enabled: !savedOnly || savedIdRows != null,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      profileRepository.listPlayerPublicViews(
        {
          ids: savedOnly ? savedIds : undefined,
          search: debouncedQuery || undefined,
          positions: filters.positions.length ? filters.positions : undefined,
          countryCodes: filters.countries.length ? filters.countries : undefined,
          preferredFoot: filters.foot.length ? filters.foot : undefined,
          ageMin: filters.minAge ? Number(filters.minAge) : undefined,
          ageMax: filters.maxAge ? Number(filters.maxAge) : undefined,
          minOverall: filters.minOverall ? Number(filters.minOverall) : undefined,
          club: filters.club || undefined,
          heightMin: filters.minHeight ? Number(filters.minHeight) : undefined,
          heightMax: filters.maxHeight ? Number(filters.maxHeight) : undefined,
          recentlyActiveOnly: filters.recentlyActiveOnly || undefined,
          hasVideosOnly: filters.hasVideosOnly || undefined,
          sortBy,
        },
        { page: pageParam, pageSize: PAGE_SIZE }
      ),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });
  const results = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const toggleCompareMode = () => {
    setCompareMode((v) => !v);
    setSelectedIds([]);
  };

  const toggleSelected = (id: string) =>
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX_COMPARE ? [...ids, id] : ids
    );

  const countryName = (code: string) => countries?.find((c) => c.code === code)?.name ?? code;

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(savedOnly ? [{ key: 'saved', label: 'Saved only', clear: () => setSavedOnly(false) }] : []),
    ...filters.positions.map((p) => ({ key: `pos-${p}`, label: p, clear: () => setFilters((f) => ({ ...f, positions: f.positions.filter((x) => x !== p) })) })),
    ...filters.countries.map((c) => ({ key: `country-${c}`, label: countryName(c), clear: () => setFilters((f) => ({ ...f, countries: f.countries.filter((x) => x !== c) })) })),
    ...(filters.minOverall ? [{ key: 'minovr', label: `OVR ${filters.minOverall}+`, clear: () => setFilters((f) => ({ ...f, minOverall: '' })) }] : []),
    ...(filters.minAge || filters.maxAge
      ? [{ key: 'age', label: `Age ${filters.minAge || '0'}-${filters.maxAge || '99'}`, clear: () => setFilters((f) => ({ ...f, minAge: '', maxAge: '' })) }]
      : []),
    ...(filters.minHeight || filters.maxHeight
      ? [{ key: 'height', label: `${filters.minHeight || '0'}-${filters.maxHeight || '220'}cm`, clear: () => setFilters((f) => ({ ...f, minHeight: '', maxHeight: '' })) }]
      : []),
    ...filters.foot.map((f) => ({ key: `foot-${f}`, label: f, clear: () => setFilters((flt) => ({ ...flt, foot: flt.foot.filter((x) => x !== f) })) })),
    ...(filters.club ? [{ key: 'club', label: filters.club, clear: () => setFilters((f) => ({ ...f, club: '' })) }] : []),
    ...(filters.recentlyActiveOnly
      ? [{ key: 'active', label: 'Recently active', clear: () => setFilters((f) => ({ ...f, recentlyActiveOnly: false })) }]
      : []),
    ...(filters.hasVideosOnly
      ? [{ key: 'videos', label: 'Has highlights', clear: () => setFilters((f) => ({ ...f, hasVideosOnly: false })) }]
      : []),
  ];

  const openSheet = () => {
    setDraftFilters(filters);
    setSheetOpen(true);
  };

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof results)[number] }) => {
      const id = item.id ?? '';
      const selected = selectedIds.includes(id);
      return (
        <Pressable
          onPress={() =>
            compareMode ? toggleSelected(id) : router.push({ pathname: '/player/[id]', params: { id } })
          }
          accessibilityRole={compareMode ? 'checkbox' : 'button'}
          accessibilityLabel={compareMode ? `Compare ${item.full_name || 'player'}` : `View ${item.full_name || 'player'}`}
          accessibilityState={compareMode ? { checked: selected } : undefined}
        >
          <View style={compareMode && selected ? styles.cardSelected : undefined}>
            <PlayerCard
              name={item.full_name || 'Unnamed player'}
              positionLine={`${item.primary_position ?? '—'} · ${item.nationality_name ?? '—'}`}
              rating={item.overall_rating ?? 0}
              lowConfidence={item.rating_has_low_confidence ?? false}
              avatar={item.avatar_url ?? images.avatarMale}
            />
          </View>
          {compareMode && (
            <View style={[styles.checkCircle, selected && styles.checkCircleActive]}>
              {selected && <Feather name="check" size={12} color={colors.white} />}
            </View>
          )}
        </Pressable>
      );
    },
    [compareMode, selectedIds, styles, colors]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{savedOnly ? 'Saved Players' : 'Discover Players'}</Text>
        <Pressable style={[styles.compareToggle, compareMode && styles.compareToggleActive]} onPress={toggleCompareMode}>
          <Feather name="bar-chart-2" size={14} color={compareMode ? colors.white : colors.primary} />
          <Text style={[styles.compareToggleText, compareMode && styles.compareToggleTextActive]}>
            {compareMode ? 'Cancel' : 'Compare'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.textPlaceholder} />
          <TextInput
            placeholder="Name, position, country..."
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

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by</Text>
        {SORT_OPTIONS.map((opt) => {
          const active = sortBy === opt.key;
          return (
            <Pressable key={opt.key} onPress={() => setSortBy(opt.key)} style={[styles.sortChip, active && styles.sortChipActive]}>
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {chips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {chips.map((c) => (
            <Pressable key={c.key} style={styles.filterChip} onPress={c.clear}>
              <Text style={styles.filterChipText}>{c.label}</Text>
              <Feather name="x" size={12} color={colors.primary} />
            </Pressable>
          ))}
          <Pressable onPress={() => { setFilters(EMPTY_FILTERS); setSavedOnly(false); }}>
            <Text style={styles.clearAll}>Clear all</Text>
          </Pressable>
        </ScrollView>
      )}

      <FlashList
        data={results}
        keyExtractor={(p) => p.id ?? ''}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : results.length ? (
            // Canvas 22's footer. `hasNextPage` matters: without it this would
            // read "24 players match" when 24 is merely the current page.
            <Kicker style={styles.matchCount}>
              {results.length}
              {hasNextPage ? '+' : ''} player{results.length === 1 ? '' : 's'} match
            </Kicker>
          ) : null
        }
        ListEmptyComponent={
          <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonCards />}>
            <View style={styles.empty}>
              <Feather name={savedOnly ? 'heart' : 'users'} size={28} color={colors.textPlaceholder} />
              <Text style={styles.emptyTitle}>
                {savedOnly ? "You haven't saved any players yet" : 'No movement this week'}
              </Text>
              <Text style={styles.emptySub}>
                {savedOnly
                  ? 'Save a player from their profile to find them here.'
                  : 'Not "no players" — just none matching right now. Widen the filters.'}
              </Text>
            </View>
          </QueryState>
        }
        renderItem={renderItem}
      />

      {compareMode && selectedIds.length >= 2 && (
        <Pressable
          style={styles.compareBar}
          onPress={() => router.push({ pathname: '/compare', params: { ids: selectedIds.join(',') } })}
        >
          <Text style={styles.compareBarText}>Compare ({selectedIds.length})</Text>
          <Feather name="arrow-right" size={16} color={colors.white} />
        </Pressable>
      )}

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView accessibilityViewIsModal style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
          <Pressable style={[styles.sheet, elevation('overlay', isDark)]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterLabel}>Position</Text>
              <View style={styles.wrapRow}>
                {POSITIONS.map((pos) => {
                  const active = draftFilters.positions.includes(pos);
                  return (
                    <Pressable
                      key={pos}
                      style={[styles.optionPill, active && styles.optionPillActive]}
                      onPress={() => setDraftFilters((f) => ({ ...f, positions: toggle(f.positions, pos) }))}
                    >
                      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{pos}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filterLabel}>Age</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  placeholder="Min"
                  keyboardType="numeric"
                  style={styles.rangeInput}
                  value={draftFilters.minAge}
                  onChangeText={(v) => setDraftFilters((f) => ({ ...f, minAge: v }))}
                />
                <Text style={styles.rangeDash}>—</Text>
                <TextInput
                  placeholder="Max"
                  keyboardType="numeric"
                  style={styles.rangeInput}
                  value={draftFilters.maxAge}
                  onChangeText={(v) => setDraftFilters((f) => ({ ...f, maxAge: v }))}
                />
              </View>

              <Text style={styles.filterLabel}>Minimum Overall Rating</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  placeholder="e.g. 75"
                  keyboardType="numeric"
                  style={[styles.rangeInput, { flex: 1 }]}
                  value={draftFilters.minOverall}
                  onChangeText={(v) => setDraftFilters((f) => ({ ...f, minOverall: v }))}
                />
              </View>

              <Text style={styles.filterLabel}>Country</Text>
              <View style={styles.wrapRow}>
                {(countries ?? []).map((c) => {
                  const active = draftFilters.countries.includes(c.code);
                  return (
                    <Pressable
                      key={c.code}
                      style={[styles.optionPill, active && styles.optionPillActive]}
                      onPress={() => setDraftFilters((f) => ({ ...f, countries: toggle(f.countries, c.code) }))}
                    >
                      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filterLabel}>Preferred Foot</Text>
              <View style={styles.wrapRow}>
                {['Left', 'Right', 'Both'].map((f) => {
                  const active = draftFilters.foot.includes(f);
                  return (
                    <Pressable
                      key={f}
                      style={[styles.optionPill, active && styles.optionPillActive]}
                      onPress={() => setDraftFilters((d) => ({ ...d, foot: toggle(d.foot, f) }))}
                    >
                      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{f}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filterLabel}>Height (cm)</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  placeholder="Min"
                  keyboardType="numeric"
                  style={styles.rangeInput}
                  value={draftFilters.minHeight}
                  onChangeText={(v) => setDraftFilters((f) => ({ ...f, minHeight: v }))}
                />
                <Text style={styles.rangeDash}>—</Text>
                <TextInput
                  placeholder="Max"
                  keyboardType="numeric"
                  style={styles.rangeInput}
                  value={draftFilters.maxHeight}
                  onChangeText={(v) => setDraftFilters((f) => ({ ...f, maxHeight: v }))}
                />
              </View>

              <Text style={styles.filterLabel}>Club / Team</Text>
              <TextInput
                placeholder="e.g. Gor Mahia"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.clubInput}
                value={draftFilters.club}
                onChangeText={(v) => setDraftFilters((f) => ({ ...f, club: v }))}
              />

              <Pressable
                style={styles.toggleRow}
                onPress={() => setDraftFilters((f) => ({ ...f, recentlyActiveOnly: !f.recentlyActiveOnly }))}
              >
                <View style={[styles.checkbox, draftFilters.recentlyActiveOnly && styles.checkboxActive]}>
                  {draftFilters.recentlyActiveOnly && <Feather name="check" size={12} color={colors.white} />}
                </View>
                <Text style={styles.toggleLabel}>Recently active (posted in last 14 days)</Text>
              </Pressable>

              <Pressable
                style={styles.toggleRow}
                onPress={() => setDraftFilters((f) => ({ ...f, hasVideosOnly: !f.hasVideosOnly }))}
              >
                <View style={[styles.checkbox, draftFilters.hasVideosOnly && styles.checkboxActive]}>
                  {draftFilters.hasVideosOnly && <Feather name="check" size={12} color={colors.white} />}
                </View>
                <Text style={styles.toggleLabel}>Has highlight videos</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable style={styles.resetBtn} onPress={() => setDraftFilters(EMPTY_FILTERS)}>
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
              <Pressable
                style={styles.applyBtn}
                onPress={() => {
                  setFilters(draftFilters);
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
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.display, color: colors.textPrimary },
  compareToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 7 },
  compareToggleActive: { backgroundColor: colors.primary },
  compareToggleText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
  compareToggleTextActive: { color: colors.white },
  cardSelected: { borderRadius: radii.xl, borderWidth: 2, borderColor: colors.primary },
  checkCircle: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  compareBar: { position: 'absolute', left: 20, right: 20, bottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  compareBarText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.white },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  filterBtn: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  sortLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted, marginRight: 2 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: colors.surface },
  sortChipActive: { backgroundColor: colors.primaryDark },
  sortChipText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textBody },
  sortChipTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  chipsRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center', marginBottom: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.infoTint, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.primary },
  clearAll: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginLeft: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary, marginTop: 8 },
  emptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: 20, maxHeight: '80%' },
  sheetTitle: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.display, color: colors.textPrimary, marginBottom: 16 },
  matchCount: { textAlign: 'center', paddingVertical: 20 },
  filterLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginTop: 16, marginBottom: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  optionPillActive: { backgroundColor: colors.primary },
  optionPillText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  optionPillTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeInput: { flex: 1, height: 44, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, paddingHorizontal: 14, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  rangeDash: { color: colors.textMuted },
  clubInput: { height: 44, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, paddingHorizontal: 14, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody, flex: 1 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.divider },
  resetBtn: { flex: 1, height: 50, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  applyBtn: { flex: 2, height: 50, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.white },
  });
}
