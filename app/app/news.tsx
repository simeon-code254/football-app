import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';

/** Same 200wpm estimate the article screen uses, so the two agree. */
function readingMinutes(body: string | null | undefined): number {
  if (!body) return 1;
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
}
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import * as newsRepository from '../src/repositories/newsRepository';
import type { NewsPostRow } from '../src/repositories/newsRepository';
import { QueryState } from '../src/components/QueryState';
import { SkeletonCards } from '../src/components/Skeleton';
import { getPublicStorageUrl } from '../src/lib/publicUrl';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Matobev-authored announcements (admin/'s News CRUD) plus scout-created
// trials, auto-synced into this same feed by a DB trigger (see
// 20260815020000_trials_as_news.sql) so a new trial shows up here and in
// the NewsPopup exactly like an admin post. Plain announcements expand
// inline; trial-originated posts route straight to the real trial detail.
export default function News() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

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
      const coverUrl = getPublicStorageUrl('post-images', item.cover_image_path);
      const isTrial = !!item.trial_id;
      // Trial-originated posts (see 20260815020000_trials_as_news.sql's
      // sync trigger) go straight to the real trial detail page -- there's
      // a whole apply/manage-applicants screen behind it, unlike a plain
      // announcement which only ever had inline expand/collapse text.
      // Canvas 59 opens the article rather than expanding it in place -- screen
      // 60 exists precisely so a long post gets a readable page instead of a
      // three-line clamp that grows the row.
      const onPress = () =>
        isTrial
          ? router.push({ pathname: '/trial/[id]', params: { id: item.trial_id! } })
          : router.push({ pathname: '/news/[id]', params: { id: item.id } });
      return (
        <Pressable style={styles.card} onPress={onPress}>
          {!!coverUrl && <Image source={{ uri: coverUrl }} style={styles.cardCover} contentFit="contain" />}
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
          </View>
          <Text style={styles.cardDate}>
            {formatDate(item.published_at)} · {readingMinutes(item.body)} min read
          </Text>
          <Text style={styles.cardBody} numberOfLines={3}>
            {item.body}
          </Text>
          {isTrial && <Text style={styles.viewTrialLink}>View trial details →</Text>}
        </Pressable>
      );
    },
    [styles, colors]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>News</Text>
        <View style={{ width: 36 }} />
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonCards />}>
        <FlashList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
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
  root: { flex: 1, backgroundColor: colors.background },
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
  viewTrialLink: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.primary, marginTop: 8 },
  });
}
