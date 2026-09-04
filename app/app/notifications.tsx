import { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontFamilyDisplay, fontSize, radii, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore, type Role } from '../src/store/useSessionStore';
import * as notificationsRepository from '../src/repositories/notificationsRepository';
import type { NotificationRow, NotificationPage } from '../src/repositories/notificationsRepository';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';
import { showAlert } from '../src/lib/alert';
import { timeAgo } from '../src/lib/time';
import Animated from 'react-native-reanimated';
import { usePulse } from '../src/lib/motion';
import { Logo } from '../src/components/Logo';
import { Kicker } from '../src/components/Kicker';

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
//
// Typed against the store's Role rather than a local union, so that widening
// the role set fails the type-check here instead of silently routing a new
// role to a player screen -- which is exactly what adding 'club' would
// otherwise have done to every branch below.
function routeForNotification(item: NotificationRow, role: Role | null): string | null {
  const data = (item.data as Record<string, unknown> | null) ?? {};
  switch (item.type) {
    case 'trial_status_change':
    case 'trial_invitation':
      return data.trial_id ? `/trial/${data.trial_id}` : null;
    case 'new_message':
      return role === 'scout'
        ? '/(scout-tabs)/messages'
        : role === 'club'
          ? '/(club-tabs)/messages'
          : '/messages';
    case 'analysis_complete':
    case 'analysis_skipped':
    case 'analysis_failed':
    case 'rating_improved':
      // Ratings belong to a player. A scout or club receiving one of these
      // would be a bug upstream, so send them nowhere rather than to a screen
      // that would fail to load their own player row.
      return role === 'player' ? '/ai-ratings' : null;
    case 'scout_verification':
      // Both ID-checked roles get this, and each has its own home.
      return role === 'club' ? '/(club-tabs)/home' : '/(scout-tabs)/home';
    case 'weekly_digest':
      // The digest is about movement and attention, both of which live on the
      // player's own profile.
      return role === 'player' ? '/(player-tabs)/profile' : null;
    case 'profile_view':
      // Their own profile: the notification says to keep highlights current,
      // so it should land where they can see what the scout just saw and act
      // on it, rather than dead-ending on the notification list.
      return role === 'player' ? '/(player-tabs)/profile' : null;
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

  // Canvas 20 groups the list under TODAY and EARLIER kickers rather than
  // running it as one undifferentiated feed.
  //
  // The split is by calendar day, not by elapsed hours: something that arrived
  // at 11pm last night is "earlier" at 8am even though it is nine hours old,
  // because that is how a person reads their own morning. The rows already
  // carry a relative timestamp, so the headers only have to answer "is this
  // still today".
  const rows = useMemo(() => {
    const list = items ?? [];
    if (!list.length) return [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const out: ({ kind: 'header'; label: string } | { kind: 'item'; n: NotificationRow })[] = [];
    let section: 'today' | 'earlier' | null = null;
    for (const n of list) {
      const bucket = new Date(n.created_at).getTime() >= startOfToday.getTime() ? 'today' : 'earlier';
      if (bucket !== section) {
        section = bucket;
        out.push({ kind: 'header', label: bucket === 'today' ? 'Today' : 'Earlier' });
      }
      out.push({ kind: 'item', n });
    }
    return out;
  }, [items]);

  // Canvas screen 20. Every row is a white card with a coloured stripe down its
  // left edge, a navy chip carrying the Matobev mark, a condensed title
  // and an uppercase meta line.
  //
  // The mark rather than a per-type glyph is the canvas's call, and the brand
  // deck's usage map states the same thing outright: "Notification / alert
  // chip -- 18x18px mark in 32x32px chip, gold on navy chip". It costs some
  // at-a-glance type distinction, which the stripe colour carries instead.
  const renderItem = useCallback(
    ({ item: row }: { item: (typeof rows)[number] }) => {
      if (row.kind === 'header') {
        return (
          <Kicker size={fontSize.caption} style={styles.groupHeader}>
            {row.label}
          </Kicker>
        );
      }
      const item = row.n;
      const read = !!item.read_at;
      // Gold marks "unread"; green marks a rating that moved, which is the one
      // notification type that is good news on its own. Everything else has no
      // stripe rather than a decorative one.
      const stripe = !read
        ? colors.gold
        : item.type === 'rating_improved'
          ? colors.success
          : 'transparent';
      return (
        <Pressable
          style={styles.row}
          onPress={() => {
            if (!read) markRead(item.id);
            const dest = routeForNotification(item, role);
            if (dest) router.push(dest);
          }}
          accessibilityRole="button"
          accessibilityLabel={(read ? '' : 'Unread. ') + item.title}
        >
          <View style={[styles.stripe, { backgroundColor: stripe }]} />
          <View style={styles.markChip}>
            <Logo variant="gold" size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            {!!item.body && <Text style={styles.body}>{item.body}</Text>}
            <Kicker size={fontSize.caption} style={{ marginTop: 2 }}>
              {timeAgo(item.created_at)}
            </Kicker>
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
    [role, styles, colors, pulse]
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
        data={rows}
        keyExtractor={(row, i) => (row.kind === 'header' ? `h:${row.label}` : row.n.id)}
        // Headers and rows have very different heights; telling FlashList which
        // is which keeps it from recycling one as the other.
        getItemType={(row) => row.kind}
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
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markAllText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.primary },
  clearReadText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted },
  expiryHint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, paddingHorizontal: 20, paddingBottom: 10 },
  clearBtn: { padding: 4, marginLeft: 4 },
  list: { padding: 20, paddingTop: 8 },
  groupHeader: { marginTop: 4, marginBottom: 2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 14,
    overflow: 'hidden',
  },
  // The canvas insets the stripe 12px top and bottom and rounds its right edge.
  stripe: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  markChip: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
  titleUnread: { color: colors.textPrimary },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  time: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
  });
}
