import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors, useIsDark, elevation } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as messagesRepository from '../../src/repositories/messagesRepository';
import type { MessageRow, MessagePage } from '../../src/repositories/messagesRepository';
import * as profileRepository from '../../src/repositories/profileRepository';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonRow } from '../../src/components/Skeleton';
import { showAlert } from '../../src/lib/alert';
import { ReportModal } from '../../src/components/ReportModal';
import { timeAgo } from '../../src/lib/time';

function isImagePath(path: string) {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

// Messaging (spec §24): conversation list + a simple thread. Contacting a
// player always shows who you're talking to and their key stats up top, so
// context is never lost. Gated behind scoutVerified per spec §3.
export default function Messages() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const userId = useSessionStore((s) => s.session?.user.id);
  const { playerId } = useLocalSearchParams<{ playerId?: string }>();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pickedAttachment, setPickedAttachment] = useState<{ uri: string; name: string; mimeType?: string | null } | null>(null);
  const queryClient = useQueryClient();

  const pickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPickedAttachment({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  };

  const CONVO_PAGE_SIZE = 20;
  const {
    data: conversationPages,
    isLoading,
    isRefetching,
    error,
    refetch: refetchConversations,
    fetchNextPage: fetchNextConvoPage,
    hasNextPage: hasMoreConvos,
    isFetchingNextPage: isFetchingConvos,
  } = useInfiniteQuery({
    queryKey: ['scoutConversations', userId],
    enabled: !!userId && scoutVerified,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => messagesRepository.listConversations(userId!, { cursor: pageParam, pageSize: CONVO_PAGE_SIZE }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  // A working scout's inbox only grows over the life of the account --
  // paged load-more (same pattern as Discover/Notifications) instead of
  // fetching every conversation ever had, up front, every time.
  const conversations = useMemo(() => conversationPages?.pages.flatMap((p) => p.items) ?? [], [conversationPages]);

  const { data: previews } = useQuery({
    queryKey: ['scoutConversationPreviews', conversations.map((c) => c.id)],
    enabled: !!conversations.length,
    queryFn: () => messagesRepository.getConversationPreviews(conversations.map((c) => c.id)),
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

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const { data: activePlayerInfo } = useQuery({
    queryKey: ['messageThreadPlayer', activeConversation?.player_id],
    enabled: !!activeConversation?.player_id,
    queryFn: () => profileRepository.getPlayerPublicView(activeConversation!.player_id),
  });

  const MESSAGE_PAGE_SIZE = 30;
  const threadQueryKey = ['threadMessages', activeConversationId];
  const {
    data: messagePages,
    isLoading: isLoadingMessages,
    fetchNextPage: fetchOlderMessages,
    hasNextPage: hasOlderMessages,
    isFetchingNextPage: isFetchingOlderMessages,
  } = useInfiniteQuery({
    queryKey: threadQueryKey,
    enabled: !!activeConversationId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => messagesRepository.listMessages(activeConversationId!, { page: pageParam, pageSize: MESSAGE_PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });
  // Page 0 is the newest chunk, later pages reach further back -- reverse
  // the PAGE order (not each page's own already-ascending items) to get a
  // full oldest-to-newest list for display.
  const messages = useMemo(
    () => messagePages?.pages.slice().reverse().flatMap((p) => p.items) ?? [],
    [messagePages]
  );

  const threadListRef = useRef<FlashListRef<MessageRow>>(null);
  const scrolledForConversationRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoadingMessages && messages.length && scrolledForConversationRef.current !== activeConversationId) {
      scrolledForConversationRef.current = activeConversationId;
      requestAnimationFrame(() => threadListRef.current?.scrollToEnd({ animated: false }));
    }
  }, [isLoadingMessages, messages.length, activeConversationId]);

  // Shared by both the realtime handler and send()'s own direct append
  // below -- de-duped by message id, since both paths can legitimately try
  // to add the *same* row: Supabase Realtime echoes a sender's own insert
  // back to them (not just the other participant), so without this guard
  // the just-sent message got appended twice -- once by send() itself,
  // once again when its own insert event arrived over the realtime
  // channel. That was a real duplicate row in the rendered list (not in
  // the DB), and FlatList's keyExtractor="id" throws a duplicate-key error
  // the moment it happens.
  const appendMessage = (message: MessageRow) => {
    queryClient.setQueryData<InfiniteData<MessagePage>>(threadQueryKey, (old) => {
      if (!old) return old;
      const [first, ...rest] = old.pages;
      if (first.items.some((m) => m.id === message.id)) return old;
      return { ...old, pages: [{ ...first, items: [...first.items, message] }, ...rest] };
    });
  };

  useEffect(() => {
    if (!activeConversationId || !userId) return;
    messagesRepository.markMessagesRead(activeConversationId, userId).then(() => refetchConversations());
    const unsubscribe = messagesRepository.subscribeToMessages(activeConversationId, (message) => {
      appendMessage(message);
      requestAnimationFrame(() => threadListRef.current?.scrollToEnd({ animated: true }));
    });
    return unsubscribe;
  }, [activeConversationId, userId]);

  const send = async () => {
    // Without this, a fast double-tap (very easy to do while the network
    // round-trip is in flight) fired sendMessage() twice, inserting two
    // real, separate rows with identical bodies -- not a caching artifact,
    // an actual duplicate send.
    if ((!draft.trim() && !pickedAttachment) || !activeConversationId || !userId || sending) return;
    const body = draft.trim();
    const attachment = pickedAttachment;
    setDraft('');
    setPickedAttachment(null);
    setSending(true);
    try {
      const attachmentPath = attachment
        ? await messagesRepository.uploadMessageAttachment(activeConversationId, attachment.uri, attachment.name, attachment.mimeType)
        : undefined;
      const sent = await messagesRepository.sendMessage(activeConversationId, userId, body, attachmentPath);
      // Append the real row directly instead of refetch()ing the whole
      // page -- immediate feedback with no network round-trip gap, and
      // appendMessage()'s own id check means it's safe even if the
      // realtime echo for this exact message arrives a moment later.
      appendMessage(sent);
      refetchConversations();
    } catch (err) {
      setDraft(body);
      setPickedAttachment(attachment);
      showAlert('Message not sent', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderConversation = useCallback(
    ({ item }: { item: (typeof conversations)[number] }) => {
      const player = item.players;
      const preview = previews?.[item.id];
      return (
        <Pressable style={[styles.convoRow, elevation('raised', isDark)]} onPress={() => setActiveConversationId(item.id)}>
          <Image source={{ uri: player?.profiles?.avatar_url || images.avatarMale }} style={styles.convoAvatar}
          cachePolicy="memory-disk"
          transition={200}
        />
          <View style={{ flex: 1 }}>
            <Text style={styles.convoName}>{player?.profiles?.full_name || 'Player'}</Text>
            <Text style={styles.convoLast} numberOfLines={1}>{preview?.lastMessage || 'Say hello!'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {!!preview?.lastMessageAt && <Text style={styles.convoTime}>{timeAgo(preview.lastMessageAt, 'compact')}</Text>}
            {!!preview?.unreadCount && (
              <View style={styles.unreadDot}>
                <Text style={styles.unreadText}>{preview.unreadCount}</Text>
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [previews, styles]
  );

  const attachmentPaths = useMemo(
    () => messages.map((m) => m.attachment_path).filter((p): p is string => !!p),
    [messages]
  );
  const { data: attachmentUrls } = useQuery({
    queryKey: ['messageAttachmentUrls', attachmentPaths],
    enabled: !!attachmentPaths.length,
    queryFn: () => messagesRepository.getAttachmentUrls(attachmentPaths),
  });

  const renderMessage = useCallback(
    ({ item }: { item: MessageRow }) => {
      const mine = item.sender_id === userId;
      const attachmentUrl = item.attachment_path ? attachmentUrls?.[item.attachment_path] : undefined;
      const isImage = !!item.attachment_path && isImagePath(item.attachment_path);
      return (
        <View style={mine ? styles.bubbleRowMine : styles.bubbleRowTheirs}>
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
            {!!item.attachment_path && (
              isImage ? (
                attachmentUrl ? (
                  <Pressable onPress={() => Linking.openURL(attachmentUrl)}>
                    <Image source={{ uri: attachmentUrl }} style={styles.attachmentImage} contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
                  </Pressable>
                ) : (
                  <View style={[styles.attachmentImage, styles.attachmentImagePlaceholder]}>
                    <ActivityIndicator color={colors.textMuted} size="small" />
                  </View>
                )
              ) : (
                <Pressable
                  style={styles.attachmentFileChip}
                  onPress={() => attachmentUrl && Linking.openURL(attachmentUrl)}
                  disabled={!attachmentUrl}
                >
                  <Feather name="file" size={14} color={mine ? colors.white : colors.textPrimary} />
                  <Text style={[styles.attachmentFileText, mine && { color: colors.white }]} numberOfLines={1}>
                    {item.attachment_path.split('/').pop()}
                  </Text>
                </Pressable>
              )
            )}
            {!!item.body && <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{item.body}</Text>}
          </View>
          <Text style={styles.bubbleMeta}>
            {timeAgo(item.created_at, 'compact')}
            {mine ? (item.read_at ? ' · Read' : ' · Sent') : ''}
          </Text>
        </View>
      );
    },
    [userId, styles, colors, attachmentUrls]
  );

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

      <QueryState isLoading={isLoading} error={error} onRetry={refetchConversations} skeleton={<SkeletonRow />}>
      {!conversations.length ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={28} color={colors.textPlaceholder} />
          <Text style={styles.emptyTitle}>No conversations yet.</Text>
          <Text style={styles.emptySub}>Discover players and start connecting.</Text>
        </View>
      ) : (
        <FlashList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchConversations} colors={[colors.primary]} tintColor={colors.primary} />}
          onEndReached={() => hasMoreConvos && !isFetchingConvos && fetchNextConvoPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingConvos ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} /> : null}
          renderItem={renderConversation}
        />
      )}
      </QueryState>

      <Modal visible={!!activeConversationId} animationType="slide" onRequestClose={() => setActiveConversationId(null)}>
        <SafeAreaView accessibilityViewIsModal style={styles.root} edges={['top', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.threadHeader}>
              <Pressable onPress={() => setActiveConversationId(null)} accessibilityRole="button" accessibilityLabel="Back to conversations">
                <Feather name="chevron-left" size={22} color={colors.textPrimary} />
              </Pressable>
              <Image source={{ uri: activeConversation?.players?.profiles?.avatar_url || images.avatarMale }} style={styles.threadAvatar}
          cachePolicy="memory-disk"
          transition={200}
        />
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

            <FlashList
              ref={threadListRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.threadBody}
              ListHeaderComponent={
                hasOlderMessages ? (
                  <Pressable style={styles.loadEarlierBtn} onPress={() => fetchOlderMessages()} disabled={isFetchingOlderMessages}>
                    {isFetchingOlderMessages ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <Text style={styles.loadEarlierText}>Load earlier messages</Text>
                    )}
                  </Pressable>
                ) : null
              }
              renderItem={renderMessage}
              ListEmptyComponent={
                <View style={styles.contextBubble}>
                  <Text style={styles.contextText}>
                    You are contacting {activeConversation?.players?.profiles?.full_name || 'this player'}
                    {activePlayerInfo ? ` — ${activePlayerInfo.primary_position ?? '—'} · ${activePlayerInfo.nationality_name ?? '—'} · ${activePlayerInfo.overall_rating ?? '—'} OVR` : ''}
                  </Text>
                </View>
              }
            />

            {!!pickedAttachment && (
              <View style={styles.pendingAttachmentRow}>
                <Feather name="paperclip" size={13} color={colors.primary} />
                <Text style={styles.pendingAttachmentText} numberOfLines={1}>{pickedAttachment.name}</Text>
                <Pressable onPress={() => setPickedAttachment(null)} hitSlop={8} accessibilityLabel="Remove attachment">
                  <Feather name="x" size={14} color={colors.textMuted} />
                </Pressable>
              </View>
            )}
            <View style={styles.composeRow}>
              <Pressable style={styles.attachBtn} onPress={pickAttachment} accessibilityRole="button" accessibilityLabel="Attach a file">
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
              <Pressable style={[styles.sendBtn, sending && { opacity: 0.5 }]} onPress={send} disabled={sending} accessibilityRole="button" accessibilityLabel="Send message">
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
        blockableProfileId={activeConversation?.player_id ?? undefined}
        reporterId={userId ?? ''}
        onClose={() => setReportOpen(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
  unreadText: { fontFamily: fontFamily.bold, fontSize: fontSize.caption, color: colors.white },
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  threadAvatar: { width: 38, height: 38, borderRadius: 19 },
  threadName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  threadMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  threadBody: { flexGrow: 1, padding: 20, gap: 8 },
  loadEarlierBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  loadEarlierText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
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
  pendingAttachmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10, backgroundColor: colors.infoTint },
  pendingAttachmentText: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.primary },
  attachmentImage: { width: 180, height: 130, borderRadius: radii.sm, marginBottom: 6 },
  attachmentImagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  attachmentFileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, maxWidth: 200 },
  attachmentFileText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textPrimary, flexShrink: 1 },
  });
}
