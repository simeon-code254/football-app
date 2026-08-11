import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as messagesRepository from '../../src/repositories/messagesRepository';
import type { MessageRow } from '../../src/repositories/messagesRepository';
import * as profileRepository from '../../src/repositories/profileRepository';
import { QueryState } from '../../src/components/QueryState';
import { showAlert } from '../../src/lib/alert';
import { ReportModal } from '../../src/components/ReportModal';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Messaging (spec §24): conversation list + a simple thread. Contacting a
// player always shows who you're talking to and their key stats up top, so
// context is never lost. Gated behind scoutVerified per spec §3.
export default function Messages() {
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const userId = useSessionStore((s) => s.session?.user.id);
  const { playerId } = useLocalSearchParams<{ playerId?: string }>();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, isRefetching, error, refetch: refetchConversations } = useQuery({
    queryKey: ['scoutConversations', userId],
    enabled: !!userId && scoutVerified,
    queryFn: () => messagesRepository.listConversations(userId!),
  });

  const { data: previews } = useQuery({
    queryKey: ['scoutConversationPreviews', conversations?.map((c) => c.id), userId],
    enabled: !!conversations?.length && !!userId,
    queryFn: () => messagesRepository.getConversationPreviews(conversations!.map((c) => c.id), userId!),
  });

  // Deep-linked from Player Details' Message button — open (or create) that
  // specific thread directly instead of landing on the generic list.
  useEffect(() => {
    if (!playerId || !userId || !scoutVerified) return;
    messagesRepository.getOrCreateConversation(userId, playerId).then((conv) => {
      setActiveConversationId(conv.id);
      refetchConversations();
    });
  }, [playerId, userId, scoutVerified]);

  const activeConversation = conversations?.find((c) => c.id === activeConversationId);

  const { data: activePlayerInfo } = useQuery({
    queryKey: ['messageThreadPlayer', activeConversation?.player_id],
    enabled: !!activeConversation?.player_id,
    queryFn: () => profileRepository.getPlayerPublicView(activeConversation!.player_id),
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['threadMessages', activeConversationId],
    enabled: !!activeConversationId,
    queryFn: () => messagesRepository.listMessages(activeConversationId!),
  });

  const threadListRef = useRef<FlatList<MessageRow>>(null);
  useEffect(() => {
    if (messages?.length) requestAnimationFrame(() => threadListRef.current?.scrollToEnd({ animated: true }));
  }, [messages?.length]);

  useEffect(() => {
    if (!activeConversationId || !userId) return;
    messagesRepository.markMessagesRead(activeConversationId, userId).then(() => refetchConversations());
    const unsubscribe = messagesRepository.subscribeToMessages(activeConversationId, (message) => {
      queryClient.setQueryData<MessageRow[]>(['threadMessages', activeConversationId], (old) =>
        old ? [...old, message] : [message]
      );
    });
    return unsubscribe;
  }, [activeConversationId, userId]);

  const send = async () => {
    if (!draft.trim() || !activeConversationId || !userId) return;
    const body = draft.trim();
    setDraft('');
    try {
      await messagesRepository.sendMessage(activeConversationId, userId, body);
      refetchMessages();
      refetchConversations();
    } catch (err) {
      setDraft(body);
      showAlert('Message not sent', err instanceof Error ? err.message : 'Please try again.');
    }
  };

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

      <QueryState isLoading={isLoading} error={error} onRetry={refetchConversations}>
      {!conversations?.length ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={28} color={colors.textPlaceholder} />
          <Text style={styles.emptyTitle}>No conversations yet.</Text>
          <Text style={styles.emptySub}>Discover players and start connecting.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchConversations} colors={[colors.primary]} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const player = item.players;
            const preview = previews?.[item.id];
            return (
              <Pressable style={styles.convoRow} onPress={() => setActiveConversationId(item.id)}>
                <Image source={{ uri: player?.profiles?.avatar_url || images.avatarMale }} style={styles.convoAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.convoName}>{player?.profiles?.full_name || 'Player'}</Text>
                  <Text style={styles.convoLast} numberOfLines={1}>{preview?.lastMessage || 'Say hello!'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {!!preview?.lastMessageAt && <Text style={styles.convoTime}>{timeAgo(preview.lastMessageAt)}</Text>}
                  {!!preview?.unreadCount && (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadText}>{preview.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
      </QueryState>

      <Modal visible={!!activeConversationId} animationType="slide" onRequestClose={() => setActiveConversationId(null)}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.threadHeader}>
              <Pressable onPress={() => setActiveConversationId(null)}>
                <Feather name="chevron-left" size={22} color={colors.textPrimary} />
              </Pressable>
              <Image source={{ uri: activeConversation?.players?.profiles?.avatar_url || images.avatarMale }} style={styles.threadAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.threadName}>{activeConversation?.players?.profiles?.full_name || 'Player'}</Text>
                <Text style={styles.threadMeta}>
                  {activePlayerInfo ? `${activePlayerInfo.primary_position ?? '—'} · ${activePlayerInfo.nationality_name ?? '—'} · ${activePlayerInfo.overall_rating ?? '—'} OVR` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setReportOpen(true)} hitSlop={8} accessibilityLabel="Report this player">
                <Feather name="flag" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <FlatList
              ref={threadListRef}
              data={messages ?? []}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.threadBody}
              renderItem={({ item }) => {
                const mine = item.sender_id === userId;
                return (
                  <View style={mine ? styles.bubbleRowMine : styles.bubbleRowTheirs}>
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{item.body}</Text>
                    </View>
                    <Text style={styles.bubbleMeta}>
                      {timeAgo(item.created_at)}
                      {mine ? (item.read_at ? ' · Read' : ' · Sent') : ''}
                    </Text>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.contextBubble}>
                  <Text style={styles.contextText}>
                    You are contacting {activeConversation?.players?.profiles?.full_name || 'this player'}
                    {activePlayerInfo ? ` — ${activePlayerInfo.primary_position ?? '—'} · ${activePlayerInfo.nationality_name ?? '—'} · ${activePlayerInfo.overall_rating ?? '—'} OVR` : ''}
                  </Text>
                </View>
              }
            />

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
              <Pressable style={styles.sendBtn} onPress={send}>
                <Feather name="send" size={16} color={colors.white} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <ReportModal
        visible={reportOpen}
        title="Report User"
        targetType="profile"
        targetId={activeConversation?.player_id ?? ''}
        reporterId={userId ?? ''}
        onClose={() => setReportOpen(false)}
      />
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
  threadBody: { flexGrow: 1, padding: 20, gap: 8 },
  contextBubble: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 12, alignSelf: 'flex-start', maxWidth: '90%' },
  contextText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, lineHeight: 18 },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubbleRowTheirs: { alignItems: 'flex-start' },
  bubbleMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 2, marginHorizontal: 2 },
  bubble: { borderRadius: radii.md, padding: 10, maxWidth: '80%' },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: colors.surface, alignSelf: 'flex-start' },
  bubbleText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  bubbleTextMine: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.white },
  composeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: colors.divider },
  attachBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  composeInput: { flex: 1, maxHeight: 100, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
