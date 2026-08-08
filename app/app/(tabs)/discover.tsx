import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { PlayerCard } from '../../src/components/PlayerCard';

const FILTERS = ['All', 'Strikers', 'Midfield', 'Defense', 'GK'] as const;

const TRENDING = [
  { id: '1', name: 'Marcus Johnson', positionLine: 'CAM · Lagos, Nigeria', rating: 86, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' },
  { id: '2', name: 'David Okafor', positionLine: 'ST · Accra, Ghana', rating: 83, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80' },
  { id: '3', name: 'Samuel Adeyemi', positionLine: 'CB · Lagos, Nigeria', rating: 81, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80' },
  { id: '4', name: 'Kwame Boateng', positionLine: 'GK · Kumasi, Ghana', rating: 79, avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&q=80' },
];

// Matches the mockup's DISCOVER tab: position-chip filters, search bar,
// "Trending Players" list with rating badges.
export default function Discover() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [query, setQuery] = useState('');

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

      <FlatList
        data={TRENDING}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Trending Players</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <PlayerCard name={item.name} positionLine={item.positionLine} rating={item.rating} avatar={item.avatar} />
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
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, marginBottom: 10 },
});
