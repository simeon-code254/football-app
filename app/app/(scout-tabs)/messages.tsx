import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { MOCK_PLAYERS } from '../../src/data/mockPlayers';
import { useSessionStore } from '../../src/store/useSessionStore';

const CONVERSATIONS = [
  { playerId: 'kevin-otieno', lastMessage: 'Thank you, I would love to attend the trial!', time: '2h', unread: 2 },
  { playerId: 'ibrahim-toure', lastMessage: 'What time should I arrive on the 24th?', time: '1d', unread: 0 },
];

// Messaging (spec §24): conversation list + a simple thread. Contacting a
// player always shows who you're talking to and their key stats up top, so
// context is never lost. Gated behind scoutVerified per spec §3.
export default function Messages() {
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const activePlayer = activeId ? MOCK_PLAYERS.find((p) => p.id === activeId) : null;

  if (!scoutVerified) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.empty}>
          <Feather name="lock" size={28} color={colors.textPlaceholder} />
          <Text style={styles.emptyTitle}>Verification required</Text>
          <Text style={styles.emptySub}>Complete scout verification before messaging players.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {CONVERSATIONS.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={28} color={colors.textPlaceholder} />
          <Text style={styles.emptyTitle}>No conversations yet.</Text>
          <Text style={styles.emptySub}>Discover players and start connecting.</Text>
        </View>
      ) : (
        <FlatList
          data={CONVERSATIONS}
          keyExtractor={(c) => c.playerId}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => {
            const player = MOCK_PLAYERS.find((p) => p.id === item.playerId)!;
            return (
              <Pressable style={styles.convoRow} onPress={() => setActiveId(item.playerId)}>
                <Image source={{ uri: player.avatar }} style={styles.convoAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.convoName}>{player.name}</Text>
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

      <Modal visible={!!activePlayer} animationType="slide" onRequestClose={() => setActiveId(null)}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.threadHeader}>
              <Pressable onPress={() => setActiveId(null)}>
                <Feather name="chevron-left" size={22} color={colors.textPrimary} />
              </Pressable>
              {activePlayer && (
                <>
                  <Image source={{ uri: activePlayer.avatar }} style={styles.threadAvatar} />
                  <View>
                    <Text style={styles.threadName}>{activePlayer.name}</Text>
                    <Text style={styles.threadMeta}>
                      {activePlayer.position} · {activePlayer.flag} {activePlayer.country} · {activePlayer.overall} OVR
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.threadBody}>
              <View style={styles.contextBubble}>
                <Text style={styles.contextText}>
                  You are contacting {activePlayer?.name} — {activePlayer?.position} · {activePlayer?.flag} {activePlayer?.country} · {activePlayer?.overall} OVR
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
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.display, color: colors.textPrimary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary, marginTop: 8, textAlign: 'center' },
  emptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center' },
  convoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radii.lg, padding: 12 },
  convoAvatar: { width: 46, height: 46, borderRadius: 23 },
  convoName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
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
