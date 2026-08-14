import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import * as newsRepository from '../src/repositories/newsRepository';
import type { NewsPostRow } from '../src/repositories/newsRepository';
import { QueryState } from '../src/components/QueryState';
import { getPublicStorageUrl } from '../src/lib/publicUrl';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Matobev-authored announcements (admin/'s News CRUD). A single expandable
// list, not a list+detail pair -- these are short posts with no
// cross-linking or deep-link need, unlike trials.
export default function News() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    queryKey: ['newsPosts'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => newsRepository.listPublishedNews({ page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });
  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: NewsPostRow }) => {
      const expanded = expandedId === item.id;
      const coverUrl = getPublicStorageUrl('post-images', item.cover_image_path);
      return (
        <Pressable style={styles.card} onPress={() => setExpandedId(expanded ? null : item.id)}>
          {!!coverUrl && <Image source={{ uri: coverUrl }} style={styles.cardCover} contentFit="contain" />}
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
    },
    [expandedId, styles, colors]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>News</Text>
        <View style={{ width: 36 }} />
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          initialNumToRender={10}
          windowSize={7}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="file-text" size={28} color={colors.textPlaceholder} />
              <Text style={styles.emptyTitle}>No news yet.</Text>
            </View>
          }
          renderItem={renderItem}
        />
      </QueryState>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  list: { padding: 20, paddingTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  card: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 16 },
  cardCover: { width: '100%', height: 140, borderRadius: radii.md, marginBottom: 12, backgroundColor: colors.surface },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
  cardDate: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 2 },
  cardBody: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, marginTop: 8, lineHeight: 20 },
  });
}
