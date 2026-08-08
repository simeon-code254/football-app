import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as notificationsRepository from '../src/repositories/notificationsRepository';
import type { NotificationRow } from '../src/repositories/notificationsRepository';

const TYPE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  trial_status_change: 'clipboard',
  new_message: 'message-circle',
  scout_verification: 'check-circle',
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Bell icons existed on both dashboards with a static badge and nowhere to
// go — this is the screen behind them, backed by the real notifications
// table + a live Realtime subscription for new arrivals.
export default function Notifications() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  const { data: items, refetch } = useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    queryFn: () => notificationsRepository.listNotifications(userId!),
  });

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = notificationsRepository.subscribeToNotifications(userId, (n) => {
      queryClient.setQueryData<NotificationRow[]>(['notifications', userId], (old) => (old ? [n, ...old] : [n]));
    });
    return unsubscribe;
  }, [userId]);

  const markRead = async (id: string) => {
    queryClient.setQueryData<NotificationRow[]>(['notifications', userId], (old) =>
      old?.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    await notificationsRepository.markAsRead(id);
  };

  const markAllRead = async () => {
    if (!userId) return;
    queryClient.setQueryData<NotificationRow[]>(['notifications', userId], (old) =>
      old?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    await notificationsRepository.markAllAsRead(userId);
    refetch();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable onPress={markAllRead} hitSlop={8}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>

      <FlatList
        data={items ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={28} color={colors.textPlaceholder} />
            <Text style={styles.emptyTitle}>No notifications yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const read = !!item.read_at;
          return (
            <Pressable style={styles.row} onPress={() => !read && markRead(item.id)}>
              <View style={[styles.iconWrap, !read && styles.iconWrapUnread]}>
                <Feather name={TYPE_ICON[item.type] ?? 'bell'} size={16} color={read ? colors.textMuted : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, !read && styles.titleUnread]}>{item.title}</Text>
                {!!item.body && <Text style={styles.body}>{item.body}</Text>}
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
              {!read && <View style={styles.dot} />}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  markAllText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.primary },
  list: { padding: 20, paddingTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconWrapUnread: { backgroundColor: '#EBF2FF' },
  title: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textBody },
  titleUnread: { color: colors.textPrimary },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  time: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
});
