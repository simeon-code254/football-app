import { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as notificationsRepository from '../src/repositories/notificationsRepository';
import type { NotificationRow, NotificationPage } from '../src/repositories/notificationsRepository';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';
import { showAlert } from '../src/lib/alert';
import { timeAgo } from '../src/lib/time';
import Animated from 'react-native-reanimated';
import { usePulse } from '../src/lib/motion';

const TYPE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  trial_status_change: 'clipboard',
  trial_invitation: 'clipboard',
  new_message: 'message-circle',
  scout_verification: 'check-circle',
  analysis_complete: 'bar-chart-2',
  analysis_skipped: 'bar-chart-2',
  analysis_failed: 'alert-circle',
  profile_view: 'eye',
  rating_improved: 'trending-up',
  weekly_digest: 'calendar',
};

// Every notification carries enough in `data` to know where it's actually
// about — previously tapping one only marked it read and went nowhere,
// even though the destination was always derivable.
function routeForNotification(item: NotificationRow, role: 'player' | 'scout' | null): string | null {
  const data = (item.data as Record<string, unknown> | null) ?? {};
  switch (item.type) {
    case 'trial_status_change':
    case 'trial_invitation':
      return data.trial_id ? `/trial/${data.trial_id}` : null;
    case 'new_message':
      return role === 'scout' ? '/(scout-tabs)/messages' : '/messages';
    case 'analysis_complete':
    case 'analysis_skipped':
    case 'analysis_failed':
    case 'rating_improved':
      return '/ai-ratings';
    case 'scout_verification':
      return '/(scout-tabs)/home';
    case 'weekly_digest':
      // The digest is about movement and attention, both of which live on the
      // player's own profile.
      return '/(player-tabs)/profile';
    case 'profile_view':
      // Their own profile: the notification says to keep highlights current,
      // so it should land where they can see what the scout just saw and act
      // on it, rather than dead-ending on the notification list.
      return '/(player-tabs)/profile';
    default:
      return null;
  }
}

// Bell icons existed on both dashboards with a static badge and nowhere to
// go — this is the screen behind them, backed by the real notifications
// table + a live Realtime subscription for new arrivals.
export default function Notifications() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  // Canvas pulse. One shared driver for the whole list: separate hooks per
  // row would need a hook inside renderItem, and synced unread dots read as
  // one signal rather than as several competing ones.
  const pulse = usePulse();
  const userId = useSessionStore((s) => s.session?.user.id);
  const role = useSessionStore((s) => s.role);
  const queryClient = useQueryClient();

  const PAGE_SIZE = 20;
  const queryKey = ['notifications', userId];
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
    queryKey,
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => notificationsRepository.listNotifications(userId!, { page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });
  // A years-old account could have thousands of notifications -- loading
  // them all upfront (as this screen used to) only gets slower over time and
  // turns into an endless, undifferentiated scroll of stale history. Paged
  // load-more (same pattern as Discover/Players) keeps the initial load fast
  // and bounded regardless of how much history exists.
  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = notificationsRepository.subscribeToNotifications(userId, (n) => {
      queryClient.setQueryData<InfiniteData<NotificationPage>>(queryKey, (old) => {
        if (!old) return old;
        const [first, ...rest] = old.pages;
        return { ...old, pages: [{ ...first, items: [n, ...first.items] }, ...rest] };
      });
    });
    return unsubscribe;
  }, [userId]);

  const markRead = async (id: string) => {
    queryClient.setQueryData<InfiniteData<NotificationPage>>(queryKey, (old) =>
      old && {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
        })),
      }
    );
    await notificationsRepository.markAsRead(id);
  };

  const markAllRead = async () => {
    if (!userId) return;
    queryClient.setQueryData<InfiniteData<NotificationPage>>(queryKey, (old) =>
      old && {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
        })),
      }
    );
    await notificationsRepository.markAllAsRead(userId);
    refetch();
  };

  const removeFromCache = (predicate: (n: NotificationRow) => boolean) => {
    queryClient.setQueryData<InfiniteData<NotificationPage>>(queryKey, (old) =>
      old && { ...old, pages: old.pages.map((page) => ({ ...page, items: page.items.filter((n) => !predicate(n)) })) }
    );
  };

  const clearOne = async (id: string) => {
    removeFromCache((n) => n.id === id);
    try {
      await notificationsRepository.deleteNotification(id);
    } catch (err) {
      refetch();
      showAlert('Could not clear notification', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const clearRead = () => {
    if (!userId) return;
    showAlert(
      'Clear read notifications?',
      'This removes every notification you\'ve already opened. Unread ones are left alone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            removeFromCache((n) => !!n.read_at);
            try {
              await notificationsRepository.clearReadNotifications(userId);
            } catch (err) {
              refetch();
              showAlert('Could not clear notifications', err instanceof Error ? err.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: NotificationRow }) => {
      const read = !!item.read_at;
      return (
        <Pressable
          style={styles.row}
          onPress={() => {
            if (!read) markRead(item.id);
            const dest = routeForNotification(item, role);
            if (dest) router.push(dest);
          }}
        >
          <View style={[styles.iconWrap, !read && styles.iconWrapUnread]}>
            <Feather name={TYPE_ICON[item.type] ?? 'bell'} size={16} color={read ? colors.textMuted : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, !read && styles.titleUnread]}>{item.title}</Text>
            {!!item.body && <Text style={styles.body}>{item.body}</Text>}
            <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
          </View>
          {!read && <Animated.View style={[styles.dot, pulse]} />}
          {read && (
            <Pressable
              onPress={() => clearOne(item.id)}
              hitSlop={8}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear this notification"
            >
              <Feather name="x" size={14} color={colors.textPlaceholder} />
            </Pressable>
          )}
        </Pressable>
      );
    },
    [role, styles, colors]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
          <Pressable onPress={clearRead} hitSlop={8}>
            <Text style={styles.clearReadText}>Clear read</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.expiryHint}>Notifications you don't clear disappear automatically after 72 hours.</Text>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonRow />}>
      <FlashList
        data={items ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={28} color={colors.textPlaceholder} />
            <Text style={styles.emptyTitle}>No notifications yet.</Text>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markAllText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.primary },
  clearReadText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted },
  expiryHint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, paddingHorizontal: 20, paddingBottom: 10 },
  clearBtn: { padding: 4, marginLeft: 4 },
  list: { padding: 20, paddingTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconWrapUnread: { backgroundColor: colors.infoTint },
  title: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textBody },
  titleUnread: { color: colors.textPrimary },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  time: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
  });
}
