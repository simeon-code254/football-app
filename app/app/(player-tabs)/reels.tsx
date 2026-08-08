import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { MOCK_REELS, type MockComment, type MockReel } from '../../src/data/mockReels';

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// A real vertical feed (paging FlatList, one clip per screen) with working
// like/save/share/comment interactions — the previous version was a single
// static video with decorative, non-functional counts.
export default function Reels() {
  const [reels, setReels] = useState<MockReel[]>(MOCK_REELS);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const toggleLike = (id: string) =>
    setReels((list) =>
      list.map((r) => (r.id === id ? { ...r, liked: !r.liked, likeCount: r.likeCount + (r.liked ? -1 : 1) } : r))
    );
  const toggleSave = (id: string) =>
    setReels((list) =>
      list.map((r) => (r.id === id ? { ...r, saved: !r.saved, saveCount: r.saveCount + (r.saved ? -1 : 1) } : r))
    );
  const share = (id: string) =>
    setReels((list) => list.map((r) => (r.id === id ? { ...r, shareCount: r.shareCount + 1 } : r)));

  const addComment = () => {
    if (!draft.trim() || !commentsFor) return;
    const newComment: MockComment = {
      id: `local-${Date.now()}`,
      author: 'You',
      avatar: reels.find((r) => r.id === commentsFor)?.creatorAvatar ?? '',
      text: draft.trim(),
      time: 'now',
    };
    setReels((list) =>
      list.map((r) =>
        r.id === commentsFor ? { ...r, comments: [...r.comments, newComment], commentCount: r.commentCount + 1 } : r
      )
    );
    setDraft('');
  };

  const activeReel = reels.find((r) => r.id === commentsFor);

  const renderItem = useCallback(
    ({ item }: { item: MockReel }) => (
      <View style={{ height: viewportHeight, width: '100%' }}>
        <Image source={{ uri: item.video }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.65)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>

        <View style={styles.actionRail}>
          <Pressable style={styles.actionItem} onPress={() => toggleLike(item.id)}>
            <Feather name="heart" size={26} color={item.liked ? '#EF4444' : colors.white} />
            <Text style={styles.actionCount}>{formatCount(item.likeCount)}</Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={() => setCommentsFor(item.id)}>
            <Feather name="message-circle" size={26} color={colors.white} />
            <Text style={styles.actionCount}>{formatCount(item.commentCount)}</Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={() => share(item.id)}>
            <Feather name="send" size={26} color={colors.white} />
            <Text style={styles.actionCount}>{formatCount(item.shareCount)}</Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={() => toggleSave(item.id)}>
            <Feather name="bookmark" size={26} color={item.saved ? colors.gold : colors.white} />
            <Text style={styles.actionCount}>{formatCount(item.saveCount)}</Text>
          </Pressable>
        </View>

        <View style={styles.bottomInfo}>
          <View style={styles.creatorRow}>
            <Image source={{ uri: item.creatorAvatar }} style={styles.creatorAvatar} />
            <Text style={styles.creatorName}>{item.creatorName}</Text>
          </View>
          <Text style={styles.caption}>{item.caption}</Text>
          <Text style={styles.hashtags}>{item.hashtags}</Text>
        </View>
      </View>
    ),
    [viewportHeight]
  );

  return (
    <View style={styles.root} onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}>
      {viewportHeight > 0 && (
        <FlatList
          data={reels}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={viewportHeight}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: viewportHeight, offset: viewportHeight * index, index })}
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
              data={activeReel?.comments ?? []}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={<Text style={styles.noComments}>No comments yet — be the first.</Text>}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <Image source={{ uri: item.avatar }} style={styles.commentAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentAuthor}>
                      {item.author} <Text style={styles.commentTime}>· {item.time}</Text>
                    </Text>
                    <Text style={styles.commentText}>{item.text}</Text>
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
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentAuthor: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  commentTime: { fontFamily: fontFamily.regular, color: colors.textPlaceholder },
  commentText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, marginTop: 2 },
  commentComposeRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  commentInput: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  commentSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
