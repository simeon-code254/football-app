import { useState, useCallback, useEffect, useRef } from 'react';
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
  Image,
  ViewToken,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as videosRepository from '../../src/repositories/videosRepository';
import type { CommentWithAuthor } from '../../src/repositories/videosRepository';
import { QueryState } from '../../src/components/QueryState';

type ReelState = {
  id: string;
  videoUrl: string;
  storagePath: string;
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

async function buildFeed(userId: string): Promise<ReelState[]> {
  const videos = await videosRepository.getFeed();
  const urls = await Promise.all(videos.map((v) => videosRepository.getVideoUrl(v.storage_path)));
  const engagement = await videosRepository.getMyEngagement(userId, videos.map((v) => v.id));
  return videos.map((v, i) => ({
    id: v.id,
    videoUrl: urls[i],
    storagePath: v.storage_path,
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
}

function ReelItem({
  item,
  height,
  isActive,
  onLike,
  onSave,
  onShare,
  onOpenComments,
}: {
  item: ReelState;
  height: number;
  isActive: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onOpenComments: () => void;
}) {
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
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
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
        <Pressable style={styles.actionItem} onPress={onLike}>
          <Feather name="heart" size={26} color={item.liked ? '#EF4444' : colors.white} />
          <Text style={styles.actionCount}>{formatCount(item.likeCount)}</Text>
        </Pressable>
        <Pressable style={styles.actionItem} onPress={onOpenComments}>
          <Feather name="message-circle" size={26} color={colors.white} />
          <Text style={styles.actionCount}>{formatCount(item.commentCount)}</Text>
        </Pressable>
        <Pressable style={styles.actionItem} onPress={onShare}>
          <Feather name="send" size={26} color={colors.white} />
          <Text style={styles.actionCount}>{formatCount(item.shareCount)}</Text>
        </Pressable>
        <Pressable style={styles.actionItem} onPress={onSave}>
          <Feather name="bookmark" size={26} color={item.saved ? colors.gold : colors.white} />
          <Text style={styles.actionCount}>{formatCount(item.saveCount)}</Text>
        </Pressable>
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
  const userId = useSessionStore((s) => s.session?.user.id);
  const { data: initialReels, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['reelsFeed', userId],
    enabled: !!userId,
    queryFn: () => buildFeed(userId!),
  });

  const [reels, setReels] = useState<ReelState[]>([]);
  useEffect(() => {
    if (initialReels) setReels(initialReels);
  }, [initialReels]);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const viewedRef = useRef<Set<string>>(new Set());

  const { data: comments } = useQuery({
    queryKey: ['videoComments', commentsFor],
    enabled: !!commentsFor,
    queryFn: () => videosRepository.listComments(commentsFor!),
  });

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
      />
    ),
    [viewportHeight, activeId, reels, isFocused]
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
              data={comments ?? []}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 320 }}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
