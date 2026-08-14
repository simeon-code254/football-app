import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ViewToken,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Feather } from '@expo/vector-icons';
import { fontFamily, fontSize, radii, useThemeColors } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as videosRepository from '../../src/repositories/videosRepository';
import type { CommentWithAuthor } from '../../src/repositories/videosRepository';
import { QueryState } from '../../src/components/QueryState';
import { ReportModal } from '../../src/components/ReportModal';

type ReelState = {
  id: string;
  videoUrl: string;
  storagePath: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  badge: string;
  caption: string;
  hashtags: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  shareCount: number;
  liked: boolean;
  saved: boolean;
};

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const REELS_PAGE_SIZE = 10;

type ReelsPage = { items: ReelState[]; nextCursor?: string };

async function fetchReelsPage(userId: string, cursor?: string): Promise<ReelsPage> {
  const videos = await videosRepository.getFeed(cursor, REELS_PAGE_SIZE);
  const urlByPath = await videosRepository.getVideoUrls(videos.map((v) => v.storage_path));
  const engagement = await videosRepository.getMyEngagement(userId, videos.map((v) => v.id));
  const items = videos.map((v) => ({
    id: v.id,
    videoUrl: urlByPath[v.storage_path] ?? '',
    storagePath: v.storage_path,
    creatorId: v.player_id,
    creatorName: v.players?.profiles?.full_name || 'Player',
    creatorAvatar: v.players?.profiles?.avatar_url || images.avatarMale,
    badge: [v.players?.primary_position, v.players?.overall_rating != null ? `${v.players.overall_rating} OVR` : null]
      .filter(Boolean)
      .join(' · '),
    caption: v.title || v.description || '',
    hashtags: (v.tags ?? []).map((t) => `#${t}`).join(' '),
    likeCount: v.like_count,
    commentCount: v.comment_count,
    saveCount: v.save_count,
    shareCount: v.share_count,
    liked: engagement.liked.has(v.id),
    saved: engagement.saved.has(v.id),
  }));
  // Undefined once a page comes back short -- the natural "no more pages" signal
  // for a cursor paged on created_at, same convention as every other list here.
  const nextCursor = videos.length === REELS_PAGE_SIZE ? videos[videos.length - 1].created_at : undefined;
  return { items, nextCursor };
}

function ReelItem({
  item,
  height,
  isActive,
  onLike,
  onSave,
  onShare,
  onOpenComments,
  onReport,
}: {
  item: ReelState;
  height: number;
  isActive: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onOpenComments: () => void;
  onReport?: () => void;
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const player = useVideoPlayer(item.videoUrl, (p) => {
    p.loop = true;
  });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Reset any manual pause once this item becomes active again (e.g. it
    // scrolled away and back) -- re-entering a reel should always autoplay.
    if (isActive) setPaused(false);
  }, [isActive]);

  useEffect(() => {
    if (isActive && !paused) player.play();
    else player.pause();
  }, [isActive, paused, player]);

  return (
    <View style={{ height, width: '100%' }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setPaused((p) => !p)}>
        {/* "cover" cropped any clip that wasn't exactly screen-aspect-ratio
            (the common case for real match footage filmed landscape or on a
            tripod) -- exactly the same bug already fixed on the upload
            preview. "contain" letterboxes instead, so the full frame a
            player uploaded is always what a viewer actually sees here too. */}
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      </Pressable>
      {paused && (
        <View style={[StyleSheet.absoluteFill, styles.pauseOverlay]} pointerEvents="none">
          <Feather name="play" size={40} color="rgba(255,255,255,0.9)" />
        </View>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.65)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {!!item.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}

      <View style={styles.actionRail}>
        <Pressable
          style={styles.actionItem}
          onPress={onLike}
          accessibilityRole="button"
          accessibilityLabel={item.liked ? 'Unlike' : 'Like'}
          accessibilityState={{ selected: item.liked }}
        >
          <Feather name="heart" size={26} color={item.liked ? colors.error : colors.white} />
          <Text style={styles.actionCount}>{formatCount(item.likeCount)}</Text>
        </Pressable>
        <Pressable
          style={styles.actionItem}
          onPress={onOpenComments}
          accessibilityRole="button"
          accessibilityLabel="View comments"
        >
          <Feather name="message-circle" size={26} color={colors.white} />
          <Text style={styles.actionCount}>{formatCount(item.commentCount)}</Text>
        </Pressable>
        <Pressable
          style={styles.actionItem}
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Share this video"
        >
          <Feather name="send" size={26} color={colors.white} />
          <Text style={styles.actionCount}>{formatCount(item.shareCount)}</Text>
        </Pressable>
        <Pressable
          style={styles.actionItem}
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={item.saved ? 'Unsave' : 'Save'}
          accessibilityState={{ selected: item.saved }}
        >
          <Feather name="bookmark" size={26} color={item.saved ? colors.gold : colors.white} />
          <Text style={styles.actionCount}>{formatCount(item.saveCount)}</Text>
        </Pressable>
        {onReport && (
          <Pressable style={styles.actionItem} onPress={onReport} accessibilityLabel="Report this video">
            <Feather name="flag" size={24} color={colors.white} />
          </Pressable>
        )}
      </View>

      <View style={styles.bottomInfo}>
        <View style={styles.creatorRow}>
          <Image source={{ uri: item.creatorAvatar }} style={styles.creatorAvatar} />
          <Text style={styles.creatorName}>{item.creatorName}</Text>
        </View>
        {!!item.caption && <Text style={styles.caption}>{item.caption}</Text>}
        {!!item.hashtags && <Text style={styles.hashtags}>{item.hashtags}</Text>}
      </View>
    </View>
  );
}

// A real vertical feed (paging FlatList, one clip per screen) backed by
// `videos`/`video_likes`/`video_saves`/`video_comments`, with only the
// centered clip actually playing (expo-video), matching how a real feed
// should behave rather than auto-playing every mounted row at once.
export default function Reels() {
  // Tabs stay mounted when you switch away from them -- without this, a
  // playing reel's audio/video kept running in the background on every
  // other tab, since nothing ever told its player to stop.
  const isFocused = useIsFocused();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);
  const {
    data: reelPages,
    isLoading,
    isRefetching,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['reelsFeed', userId],
    enabled: !!userId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchReelsPage(userId!, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  const initialReels = useMemo(() => reelPages?.pages.flatMap((p) => p.items), [reelPages]);

  const [reels, setReels] = useState<ReelState[]>([]);
  useEffect(() => {
    if (initialReels) setReels(initialReels);
  }, [initialReels]);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  const COMMENTS_PAGE_SIZE = 30;
  const {
    data: commentPages,
    refetch: refetchComments,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments,
    isFetchingNextPage: isFetchingComments,
  } = useInfiniteQuery({
    queryKey: ['videoComments', commentsFor],
    enabled: !!commentsFor,
    initialPageParam: 0,
    // A popular clip can draw far more comments than fit in this sheet --
    // paged load-more, newest first, instead of downloading the entire
    // comment history every time it opens.
    queryFn: ({ pageParam }) => videosRepository.listComments(commentsFor!, { page: pageParam, pageSize: COMMENTS_PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });
  const comments = commentPages?.pages.flatMap((p) => p.items) ?? [];

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const top = viewableItems.find((v) => v.isViewable);
    if (top?.item) {
      const id = (top.item as ReelState).id;
      setActiveId(id);
      if (!viewedRef.current.has(id)) {
        viewedRef.current.add(id);
        videosRepository.incrementView(id).catch(() => {});
      }
    }
  }).current;

  const toggleLike = (id: string) => {
    if (!userId) return;
    const target = reels.find((r) => r.id === id);
    if (!target) return;
    const nextLiked = !target.liked;
    setReels((list) =>
      list.map((r) => (r.id === id ? { ...r, liked: nextLiked, likeCount: r.likeCount + (nextLiked ? 1 : -1) } : r))
    );
    videosRepository.toggleLike(id, userId, target.liked).catch(() => {
      setReels((list) =>
        list.map((r) => (r.id === id ? { ...r, liked: target.liked, likeCount: target.likeCount } : r))
      );
    });
  };

  const toggleSave = (id: string) => {
    if (!userId) return;
    const target = reels.find((r) => r.id === id);
    if (!target) return;
    const nextSaved = !target.saved;
    setReels((list) =>
      list.map((r) => (r.id === id ? { ...r, saved: nextSaved, saveCount: r.saveCount + (nextSaved ? 1 : -1) } : r))
    );
    videosRepository.toggleSave(id, userId, target.saved).catch(() => {
      setReels((list) =>
        list.map((r) => (r.id === id ? { ...r, saved: target.saved, saveCount: target.saveCount } : r))
      );
    });
  };

  const share = (id: string) => {
    setReels((list) => list.map((r) => (r.id === id ? { ...r, shareCount: r.shareCount + 1 } : r)));
    videosRepository.incrementShare(id).catch(() => {});
  };

  const addComment = async () => {
    if (!draft.trim() || !commentsFor || !userId) return;
    const body = draft.trim();
    setDraft('');
    try {
      await videosRepository.addComment(commentsFor, userId, body);
      setReels((list) =>
        list.map((r) => (r.id === commentsFor ? { ...r, commentCount: r.commentCount + 1 } : r))
      );
      refetchComments();
    } catch {
      // best-effort — the comment sheet re-opening will re-fetch the true state
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: ReelState }) => (
      <ReelItem
        item={item}
        height={viewportHeight}
        isActive={item.id === activeId && isFocused}
        onLike={() => toggleLike(item.id)}
        onSave={() => toggleSave(item.id)}
        onShare={() => share(item.id)}
        onOpenComments={() => setCommentsFor(item.id)}
        onReport={item.creatorId !== userId ? () => setReportTarget(item.id) : undefined}
      />
    ),
    [viewportHeight, activeId, reels, isFocused, userId]
  );

  return (
    <View style={styles.root} onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}>
      {viewportHeight > 0 && (isLoading || error) && (
        <View style={{ height: viewportHeight }}>
          <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
            <View />
          </QueryState>
        </View>
      )}
      {viewportHeight > 0 && !isLoading && !error && (
        <FlatList
          data={reels}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={viewportHeight}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: viewportHeight, offset: viewportHeight * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.white]} tintColor={colors.white} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ height: 60, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ height: viewportHeight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.white, fontFamily: fontFamily.medium }}>No highlights yet.</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!commentsFor} transparent animationType="slide" onRequestClose={() => setCommentsFor(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.commentsBackdrop}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setCommentsFor(null)} />
          <View style={styles.commentsSheet}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 320 }}
              onEndReached={() => hasMoreComments && !isFetchingComments && fetchMoreComments()}
              onEndReachedThreshold={0.4}
              ListFooterComponent={isFetchingComments ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 12 }} /> : null}
              ListEmptyComponent={<Text style={styles.noComments}>No comments yet — be the first.</Text>}
              renderItem={({ item }: { item: CommentWithAuthor }) => (
                <View style={styles.commentRow}>
                  <Image source={{ uri: item.profiles?.avatar_url ?? images.avatarMale }} style={styles.commentAvatarFallback} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentAuthor}>{item.profiles?.full_name || 'Player'}</Text>
                    <Text style={styles.commentText}>{item.body}</Text>
                  </View>
                </View>
              )}
            />
            <View style={styles.commentComposeRow}>
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor={colors.textPlaceholder}
                style={styles.commentInput}
                value={draft}
                onChangeText={setDraft}
              />
              <Pressable style={styles.commentSendBtn} onPress={addComment}>
                <Feather name="send" size={16} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ReportModal
        visible={!!reportTarget}
        title="Report Video"
        targetType="video"
        targetId={reportTarget ?? ''}
        reporterId={userId ?? ''}
        onClose={() => setReportTarget(null)}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  pauseOverlay: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.white },
  actionRail: { position: 'absolute', right: 12, bottom: 120, alignItems: 'center', gap: 20 },
  actionItem: { alignItems: 'center', gap: 4 },
  actionCount: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.white },
  bottomInfo: { position: 'absolute', left: 16, right: 80, bottom: 40 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  creatorAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.white },
  creatorName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.white },
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.white, marginBottom: 4 },
  hashtags: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  commentsBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  commentsSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: 20, paddingBottom: 24 },
  commentsTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, marginBottom: 14 },
  noComments: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  commentRow: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  commentAvatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceMuted },
  commentAuthor: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  commentTime: { fontFamily: fontFamily.regular, color: colors.textPlaceholder },
  commentText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, marginTop: 2 },
  commentComposeRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  commentInput: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  commentSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  });
}
