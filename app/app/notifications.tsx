import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import { PLAYER_NOTIFICATIONS, SCOUT_NOTIFICATIONS, type MockNotification, type NotificationType } from '../src/data/mockNotifications';

const TYPE_ICON: Record<NotificationType, React.ComponentProps<typeof Feather>['name']> = {
  ai_analysis_complete: 'trending-up',
  new_message: 'message-circle',
  trial_invitation: 'send',
  trial_status_change: 'clipboard',
  scout_verified: 'check-circle',
  new_scout_view: 'eye',
  system: 'bell',
};

// Bell icons existed on both dashboards with a static badge and nowhere to
// go — this is the screen behind them. notifications table + Realtime are
// already live on the backend; this reads from mock data until wiring.
export default function Notifications() {
  const role = useSessionStore((s) => s.role);
  const [items, setItems] = useState<MockNotification[]>(role === 'scout' ? SCOUT_NOTIFICATIONS : PLAYER_NOTIFICATIONS);

  const markRead = (id: string) => setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={28} color={colors.textPlaceholder} />
            <Text style={styles.emptyTitle}>No notifications yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => markRead(item.id)}>
            <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
              <Feather name={TYPE_ICON[item.type]} size={16} color={item.read ? colors.textMuted : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, !item.read && styles.titleUnread]}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </Pressable>
        )}
      />
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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconWrapUnread: { backgroundColor: '#EBF2FF' },
  title: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textBody },
  titleUnread: { color: colors.textPrimary },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  time: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
});
