import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { PlayerCard } from '../../src/components/PlayerCard';
import { images } from '../../src/constants/images';
import * as profileRepository from '../../src/repositories/profileRepository';
import type { PlayerFilters } from '../../src/repositories/profileRepository';
import { QueryState } from '../../src/components/QueryState';

const FILTERS = ['All', 'Strikers', 'Midfield', 'Defense', 'GK'] as const;

const CATEGORY_POSITIONS: Record<(typeof FILTERS)[number], string[] | null> = {
  All: null,
  Strikers: ['ST', 'LW', 'RW'],
  Midfield: ['CM', 'CAM', 'CDM', 'LM', 'RM'],
  Defense: ['CB', 'LB', 'RB'],
  GK: ['GK'],
};

const SORT_OPTIONS: { key: NonNullable<PlayerFilters['sortBy']>; label: string }[] = [
  { key: 'rating', label: 'Rating' },
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
];

const SEARCH_DEBOUNCE_MS = 350;

// Matches the mockup's DISCOVER tab: position-chip filters, search bar,
// "Trending Players" list with rating badges.
export default function Discover() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<NonNullable<PlayerFilters['sortBy']>>('rating');

  // Firing a network request on every keystroke induces list flicker as
  // fast typers outrun each other's responses -- wait for a pause instead.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { data: players, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['discoverTrending', debouncedQuery, sortBy],
    queryFn: () => profileRepository.listPlayerPublicViews({ search: debouncedQuery || undefined, sortBy }),
  });

  const filtered = useMemo(() => {
    const allowed = CATEGORY_POSITIONS[filter];
    if (!allowed) return players ?? [];
    return (players ?? []).filter((p) => p.primary_position && allowed.includes(p.primary_position));
  }, [players, filter]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </View>

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

      <View style={styles.chipsRow}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          );
        })}
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id ?? ''}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Trending Players</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
            <Text style={styles.emptyText}>No players found.</Text>
          </QueryState>
        }
        renderItem={({ item }) => (
          <PlayerCard
            name={item.full_name || 'Unnamed player'}
            positionLine={[item.primary_position, item.nationality_name].filter(Boolean).join(' · ')}
            rating={item.overall_rating ?? 0}
            avatar={item.avatar_url ?? images.avatarMale}
            onPress={() => router.push({ pathname: '/player/[id]', params: { id: item.id ?? '' } })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.display, color: colors.textPrimary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  chipTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  sortLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted, marginRight: 2 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: colors.surface },
  sortChipActive: { backgroundColor: colors.primaryDark },
  sortChipText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textBody },
  sortChipTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, marginBottom: 10 },
  emptyText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
});
