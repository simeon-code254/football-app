import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { images } from '../src/constants/images';
import { useSessionStore } from '../src/store/useSessionStore';
import * as messagesRepository from '../src/repositories/messagesRepository';
import type { MessageRow } from '../src/repositories/messagesRepository';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// The player-side counterpart to (scout-tabs)/messages.tsx — previously
// there was no way for a player to see or reply to a scout's message
// anywhere in the app, even though a scout could message them. Players can
// never create a new conversation (RLS: only a verified scout can), only
// reply to threads a scout has already opened.
export default function Messages() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const { scoutId } = useLocalSearchParams<{ scoutId?: string }>();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const queryClient = useQueryClient();

  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ['playerConversations', userId],
    enabled: !!userId,
    queryFn: () => messagesRepository.listConversations(userId!),
  });

  const { data: previews } = useQuery({
    queryKey: ['playerConversationPreviews', conversations?.map((c) => c.id), userId],
    enabled: !!conversations?.length && !!userId,
    queryFn: () => messagesRepository.getConversationPreviews(conversations!.map((c) => c.id), userId!),
  });

  useEffect(() => {
    if (!scoutId || !conversations) return;
    const existing = conversations.find((c) => c.scout_id === scoutId);
    if (existing) setActiveConversationId(existing.id);
  }, [scoutId, conversations]);

  const activeConversation = conversations?.find((c) => c.id === activeConversationId);

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['playerThreadMessages', activeConversationId],
    enabled: !!activeConversationId,
    queryFn: () => messagesRepository.listMessages(activeConversationId!),
  });

  useEffect(() => {
    if (!activeConversationId || !userId) return;
    messagesRepository.markMessagesRead(activeConversationId, userId).then(() => refetchConversations());
    const unsubscribe = messagesRepository.subscribeToMessages(activeConversationId, (message) => {
      queryClient.setQueryData<MessageRow[]>(['playerThreadMessages', activeConversationId], (old) =>
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
    } catch {
      setDraft(body);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 36 }} />
      </View>

      {!conversations?.length ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={28} color={colors.textPlaceholder} />
          <Text style={styles.emptyTitle}>No conversations yet.</Text>
          <Text style={styles.emptySub}>Scouts who message you will show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => {
            const scout = item.scouts;
            const preview = previews?.[item.id];
            return (
              <Pressable style={styles.convoRow} onPress={() => setActiveConversationId(item.id)}>
                <Image source={{ uri: scout?.profiles?.avatar_url || images.avatarMale }} style={styles.convoAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.convoName}>{scout?.profiles?.full_name || 'Scout'}</Text>
                  {!!scout?.organization && <Text style={styles.convoOrg}>{scout.organization}</Text>}
                  <Text style={styles.convoLast} numberOfLines={1}>{preview?.lastMessage || 'New conversation'}</Text>
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

      <Modal visible={!!activeConversationId} animationType="slide" onRequestClose={() => setActiveConversationId(null)}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.threadHeader}>
              <Pressable onPress={() => setActiveConversationId(null)}>
                <Feather name="chevron-left" size={22} color={colors.textPrimary} />
              </Pressable>
              <Image source={{ uri: activeConversation?.scouts?.profiles?.avatar_url || images.avatarMale }} style={styles.threadAvatar} />
              <View>
                <Text style={styles.threadName}>{activeConversation?.scouts?.profiles?.full_name || 'Scout'}</Text>
                <Text style={styles.threadMeta}>{activeConversation?.scouts?.organization || ''}</Text>
              </View>
            </View>

            <FlatList
              data={messages ?? []}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.threadBody}
              renderItem={({ item }) => (
                <View style={[styles.bubble, item.sender_id === userId ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={item.sender_id === userId ? styles.bubbleTextMine : styles.bubbleText}>{item.body}</Text>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.contextBubble}>
                  <Text style={styles.contextText}>
                    {activeConversation?.scouts?.profiles?.full_name || 'This scout'}
                    {activeConversation?.scouts?.organization ? ` · ${activeConversation.scouts.organization}` : ''}
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
  threadBody: { flexGrow: 1, padding: 20, gap: 8 },
  contextBubble: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 12, alignSelf: 'flex-start', maxWidth: '90%' },
  contextText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, lineHeight: 18 },
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
