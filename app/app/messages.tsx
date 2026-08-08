import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { MOCK_SCOUTS } from '../src/data/mockScouts';

const CONVERSATIONS = [
  { scoutId: 'scout-simeon', lastMessage: 'Great highlight! When can you attend a trial?', time: '1h', unread: 1 },
  { scoutId: 'scout-grace', lastMessage: "Thanks for applying, we'll be in touch.", time: '2d', unread: 0 },
];

// The player-side counterpart to (scout-tabs)/messages.tsx — previously
// there was no way for a player to see or reply to a scout's message
// anywhere in the app, even though a scout could message them.
export default function Messages() {
  const { scoutId } = useLocalSearchParams<{ scoutId?: string }>();
  const [activeId, setActiveId] = useState<string | null>(scoutId ?? null);
  const [draft, setDraft] = useState('');
  const activeScout = activeId ? MOCK_SCOUTS.find((s) => s.id === activeId) : null;

  useEffect(() => {
    if (scoutId) setActiveId(scoutId);
  }, [scoutId]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 36 }} />
      </View>

      {CONVERSATIONS.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={28} color={colors.textPlaceholder} />
          <Text style={styles.emptyTitle}>No conversations yet.</Text>
          <Text style={styles.emptySub}>Scouts who message you will show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={CONVERSATIONS}
          keyExtractor={(c) => c.scoutId}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => {
            const scout = MOCK_SCOUTS.find((s) => s.id === item.scoutId)!;
            return (
              <Pressable style={styles.convoRow} onPress={() => setActiveId(item.scoutId)}>
                <Image source={{ uri: scout.avatar }} style={styles.convoAvatar} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.convoName}>{scout.name}</Text>
                    {scout.verified && <Feather name="check-circle" size={12} color={colors.success} />}
                  </View>
                  <Text style={styles.convoOrg}>{scout.organization}</Text>
                  <Text style={styles.convoLast} numberOfLines={1}>{item.lastMessage}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.convoTime}>{item.time}</Text>
                  {item.unread > 0 && (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={!!activeScout} animationType="slide" onRequestClose={() => setActiveId(null)}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.threadHeader}>
              <Pressable onPress={() => setActiveId(null)}>
                <Feather name="chevron-left" size={22} color={colors.textPrimary} />
              </Pressable>
              {activeScout && (
                <>
                  <Image source={{ uri: activeScout.avatar }} style={styles.threadAvatar} />
                  <View>
                    <Text style={styles.threadName}>{activeScout.name}</Text>
                    <Text style={styles.threadMeta}>{activeScout.organization}</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.threadBody}>
              <View style={styles.contextBubble}>
                <Text style={styles.contextText}>
                  {activeScout?.name} · {activeScout?.organization}
                  {activeScout?.verified ? ' · Verified Scout' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.composeRow}>
              <Pressable style={styles.attachBtn}>
                <Feather name="paperclip" size={18} color={colors.textMuted} />
              </Pressable>
              <TextInput
                placeholder="Write message..."
                placeholderTextColor={colors.textPlaceholder}
                style={styles.composeInput}
                value={draft}
                onChangeText={setDraft}
                multiline
              />
              <Pressable style={styles.sendBtn} onPress={() => setDraft('')}>
                <Feather name="send" size={16} color={colors.white} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, backgroundColor: colors.surface },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary, marginTop: 8, textAlign: 'center' },
  emptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center' },
  convoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radii.lg, padding: 12 },
  convoAvatar: { width: 46, height: 46, borderRadius: 23 },
  convoName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  convoOrg: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  convoLast: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  convoTime: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.white },
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  threadAvatar: { width: 38, height: 38, borderRadius: 19 },
  threadName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  threadMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  threadBody: { flex: 1, padding: 20 },
  contextBubble: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 12, alignSelf: 'flex-start', maxWidth: '90%' },
  contextText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, lineHeight: 18 },
  composeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: colors.divider },
  attachBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  composeInput: { flex: 1, maxHeight: 100, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
