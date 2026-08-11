import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import * as newsRepository from '../src/repositories/newsRepository';
import type { NewsPostRow } from '../src/repositories/newsRepository';
import { QueryState } from '../src/components/QueryState';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Matobev-authored announcements (admin/'s News CRUD). A single expandable
// list, not a list+detail pair -- these are short posts with no
// cross-linking or deep-link need, unlike trials.
export default function News() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: posts, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['newsPosts'],
    queryFn: newsRepository.listPublishedNews,
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>News</Text>
        <View style={{ width: 36 }} />
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
        <FlatList
          data={posts ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="file-text" size={28} color={colors.textPlaceholder} />
              <Text style={styles.emptyTitle}>No news yet.</Text>
            </View>
          }
          renderItem={({ item }: { item: NewsPostRow }) => {
            const expanded = expandedId === item.id;
            return (
              <Pressable style={styles.card} onPress={() => setExpandedId(expanded ? null : item.id)}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textPlaceholder} />
                </View>
                <Text style={styles.cardDate}>{formatDate(item.published_at)}</Text>
                <Text style={styles.cardBody} numberOfLines={expanded ? undefined : 3}>
                  {item.body}
                </Text>
              </Pressable>
            );
          }}
        />
      </QueryState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  list: { padding: 20, paddingTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  card: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
  cardDate: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 2 },
  cardBody: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, marginTop: 8, lineHeight: 20 },
});
