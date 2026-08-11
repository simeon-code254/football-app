import { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { AppTextField } from '../../src/components/AppTextField';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as videosRepository from '../../src/repositories/videosRepository';
import { showAlert } from '../../src/lib/alert';

type UploadMode = 'reel' | 'ai';
type PickedVideo = { uri: string; thumbnailUri?: string; durationMs?: number | null };
type TagFrame = { uri: string; width: number; height: number };
type SubjectHint = { x: number; y: number }; // normalized 0-1, relative to TagFrame

// The frame the "tag yourself" step shows is taken at this fixed offset —
// the AI service needs to know it too (subjectHintTimeMs), since the same
// tapped (x,y) means a different thing once the subject has moved.
const TAG_FRAME_TIME_MS = 500;

// expo-video-thumbnails has no web implementation at all — its .web.ts
// throws `ExpoVideoThumbnails not supported on Expo Web` unconditionally
// (confirmed by reading node_modules directly). This draws the frame onto a
// <canvas> instead, which works in every browser Expo Web targets.
async function getWebFrame(videoUri: string, timeMs: number): Promise<TagFrame> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = videoUri;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeMs / 1000, Math.max(0, (video.duration || 0) - 0.05));
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve({ uri: canvas.toDataURL('image/jpeg', 0.9), width: canvas.width, height: canvas.height });
    };
    video.onerror = () => reject(new Error('Failed to load the video for frame extraction'));
  });
}

async function getVideoFrame(videoUri: string, timeMs: number): Promise<TagFrame> {
  if (Platform.OS === 'web') return getWebFrame(videoUri, timeMs);
  const thumb = await VideoThumbnails.getThumbnailAsync(videoUri, { time: timeMs });
  return { uri: thumb.uri, width: thumb.width, height: thumb.height };
}

// Matches the mockup's UPLOAD tab: Highlight Reel / AI Analysis mode toggle,
// dashed drop zone, Title/Description/Match/Opponent/Tags, Upload & Publish.
// `uploadMode` maps directly to the `videos.upload_intent` field in the
// platform's data model — 'reel' -> 'highlight_only', 'ai' -> 'ai_analysis'.
export default function Upload() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const [mode, setMode] = useState<UploadMode>('reel');
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matchName, setMatchName] = useState('');
  const [opponent, setOpponent] = useState('');
  const [tags, setTags] = useState('');
  const [publishing, setPublishing] = useState(false);

  // "Tag yourself" step (see src/pipeline/subject.py on the AI service side)
  // — without this the AI can only guess which detected person is the
  // uploader, using screen-time/size/centering. A confirmed tap removes
  // that ambiguity entirely. Optional, skippable — the service falls back
  // to its heuristic when no hint is present.
  const [tagFrame, setTagFrame] = useState<TagFrame | null>(null);
  const [subjectHint, setSubjectHint] = useState<SubjectHint | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [extractingFrame, setExtractingFrame] = useState(false);
  const frameRef = useRef<View>(null);

  const resetVideo = () => {
    setVideo(null);
    setTagFrame(null);
    setSubjectHint(null);
  };

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      // A plain "denied" message was a dead end -- canAskAgain=false means
      // re-prompting won't work, the OS Settings app is the only way back.
      showAlert(
        'Permission needed',
        'Allow photo library access to upload a highlight video.',
        perm.canAskAgain || Platform.OS === 'web'
          ? undefined
          : [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setTagFrame(null);
    setSubjectHint(null);
    setVideo({ uri: asset.uri, durationMs: asset.duration });
  };

  const openTagModal = async () => {
    if (!video) return;
    setExtractingFrame(true);
    try {
      if (!tagFrame) {
        setTagFrame(await getVideoFrame(video.uri, TAG_FRAME_TIME_MS));
      }
      setTagModalOpen(true);
    } catch {
      showAlert(
        'Could not load a frame',
        "You can still upload — the AI will use its own best guess for who to track."
      );
    } finally {
      setExtractingFrame(false);
    }
  };

  const publish = async () => {
    if (!video || !userId) return;
    setPublishing(true);
    try {
      const videoId = Crypto.randomUUID();

      let thumbnailPath: string | undefined;
      try {
        const thumbUri = tagFrame?.uri ?? (await getVideoFrame(video.uri, TAG_FRAME_TIME_MS)).uri;
        thumbnailPath = await videosRepository.uploadVideoThumbnail(userId, videoId, thumbUri);
      } catch {
        // Thumbnail generation can fail on some formats/platforms — the
        // upload itself should still succeed, just without a thumbnail.
      }

      const storagePath = await videosRepository.uploadVideoSource(userId, videoId, video.uri);

      await videosRepository.createVideo({
        id: videoId,
        playerId: userId,
        storagePath,
        thumbnailPath,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        matchName: matchName.trim() || undefined,
        opponent: opponent.trim() || undefined,
        tags: tags
          .split(/[\s,]+/)
          .map((t) => t.replace(/^#/, '').trim())
          .filter(Boolean),
        uploadIntent: mode === 'ai' ? 'ai_analysis' : 'highlight_only',
        durationSeconds: video.durationMs ? Math.round(video.durationMs / 1000) : undefined,
        subjectHintX: mode === 'ai' ? subjectHint?.x : undefined,
        subjectHintY: mode === 'ai' ? subjectHint?.y : undefined,
        subjectHintTimeMs: mode === 'ai' && subjectHint ? TAG_FRAME_TIME_MS : undefined,
      });

      showAlert(
        mode === 'ai' ? 'Uploaded — Queued for Analysis' : 'Uploaded',
        mode === 'ai'
          ? "Your video was submitted successfully and is queued for AI analysis. You'll see your ratings on your profile once processing completes."
          : 'Your video has been published to your highlights.',
        [{ text: 'OK', onPress: () => router.push('/(player-tabs)/profile') }]
      );
    } catch (err) {
      showAlert('Upload Failed', err instanceof Error ? err.message : 'Something went wrong submitting your video. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Upload</Text>
        <Text style={styles.sub}>Share your highlights or get AI analysis</Text>

        <View style={styles.toggleRow}>
          <Pressable style={[styles.toggleBtn, mode === 'reel' && styles.toggleBtnActive]} onPress={() => setMode('reel')}>
            <Text style={[styles.toggleText, mode === 'reel' && styles.toggleTextActive]}>Highlight Reel</Text>
          </Pressable>
          <Pressable style={[styles.toggleBtn, mode === 'ai' && styles.toggleBtnActive]} onPress={() => setMode('ai')}>
            <Text style={[styles.toggleText, mode === 'ai' && styles.toggleTextActive]}>AI Analysis</Text>
          </Pressable>
        </View>

        {video ? (
          <View style={styles.videoPreview}>
            <Image source={{ uri: video.uri }} style={styles.videoPreviewImage} />
            <View style={styles.videoPreviewOverlay}>
              <Feather name="film" size={22} color={colors.white} />
              <Text style={styles.videoPreviewText}>Video selected</Text>
            </View>
            <Pressable style={styles.videoRemoveBtn} onPress={resetVideo}>
              <Feather name="x" size={14} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.dropZone} onPress={pickVideo}>
            <Feather name="upload-cloud" size={28} color="#9CA3AF" />
            <Text style={styles.dropTitle}>Upload Video</Text>
            <Text style={styles.dropSub}>MP4, MOV up to 100MB</Text>
          </Pressable>
        )}

        {mode === 'ai' && video && (
          <Pressable style={styles.tagRow} onPress={openTagModal} disabled={extractingFrame}>
            <View style={styles.tagIconWrap}>
              {extractingFrame ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name={subjectHint ? 'check-circle' : 'crosshair'} size={16} color={subjectHint ? colors.success : colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tagRowTitle}>
                {extractingFrame ? 'Loading frame…' : subjectHint ? 'Tagged — you\'re marked in the video' : 'Tag Yourself (recommended)'}
              </Text>
              <Text style={styles.tagRowSub}>
                {subjectHint ? 'Tap to change' : 'Tap yourself on a frame so the AI tracks the right person'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
          </Pressable>
        )}

        <View style={styles.fields}>
          <AppTextField label="Title" placeholder="e.g. Hat-trick vs Academy FC" value={title} onChangeText={setTitle} />
          <AppTextField
            label="Description"
            placeholder="Tell scouts what to look for"
            multiline
            style={{ minHeight: 60 }}
            value={description}
            onChangeText={setDescription}
          />
          <View style={styles.row}>
            <AppTextField label="Match" placeholder="League match" value={matchName} onChangeText={setMatchName} />
            <AppTextField label="Opponent" placeholder="Academy FC" value={opponent} onChangeText={setOpponent} />
          </View>
          <AppTextField label="Tags" placeholder="#freekick #goals" autoCapitalize="none" value={tags} onChangeText={setTags} />
        </View>

        {mode === 'ai' && (
          <View style={styles.aiHint}>
            <Feather name="cpu" size={16} color={colors.primary} />
            <Text style={styles.aiHintText}>
              This video will be analyzed by our AI pipeline. Ratings for your position appear once processing completes.
              For best accuracy, film yourself only, in one continuous shot with no cuts, camera held roughly level.
            </Text>
          </View>
        )}

        <PrimaryButton
          label={publishing ? 'Uploading…' : 'Upload & Publish'}
          onPress={publish}
          disabled={!video || publishing}
          loading={publishing}
          style={styles.submitBtn}
        />
      </ScrollView>

      <Modal visible={tagModalOpen} animationType="slide" onRequestClose={() => setTagModalOpen(false)}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.tagModalHeader}>
            <Pressable onPress={() => setTagModalOpen(false)}>
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.tagModalTitle}>Tag Yourself</Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={styles.tagModalBody}>
            <Text style={styles.tagModalHint}>Tap on yourself in the frame below.</Text>
            {tagFrame && (
              <View
                ref={frameRef}
                style={{ width: '100%', aspectRatio: tagFrame.width / tagFrame.height, borderRadius: radii.lg, overflow: 'hidden' }}
              >
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={(e) => {
                    // `locationX/Y` isn't reliable here — on web, Pressable's
                    // onPress fires from a raw browser MouseEvent (react-
                    // native-web deliberately doesn't route it through the
                    // responder system that provides locationX/Y), so it's
                    // undefined there and the tap silently produced NaN.
                    // pageX/Y + measure() works identically on both platforms.
                    const { pageX, pageY } = e.nativeEvent;
                    frameRef.current?.measure((_x, _y, width, height, frameX, frameY) => {
                      if (!width || !height) return;
                      setSubjectHint({
                        x: Math.min(1, Math.max(0, (pageX - frameX) / width)),
                        y: Math.min(1, Math.max(0, (pageY - frameY) / height)),
                      });
                    });
                  }}
                >
                  <Image source={{ uri: tagFrame.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  {subjectHint && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.tapMarker,
                        { left: `${subjectHint.x * 100}%`, top: `${subjectHint.y * 100}%` },
                      ]}
                    />
                  )}
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.tagModalActions}>
            <Pressable
              style={styles.tagSkipBtn}
              onPress={() => {
                setSubjectHint(null);
                setTagModalOpen(false);
              }}
            >
              <Text style={styles.tagSkipText}>Skip This Step</Text>
            </Pressable>
            <PrimaryButton
              label="Use This Tap"
              onPress={() => setTagModalOpen(false)}
              disabled={!subjectHint}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.display, color: colors.textPrimary },
  sub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginBottom: 20 },
  toggleRow: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: radii.pill, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  toggleText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted },
  toggleTextActive: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
  dropZone: {
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.borderDashed,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 4,
    marginBottom: 20,
  },
  dropTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary, marginTop: 8 },
  dropSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted },
  videoPreview: { height: 160, borderRadius: radii.xl, overflow: 'hidden', marginBottom: 20, backgroundColor: '#000' },
  videoPreviewImage: { width: '100%', height: '100%', opacity: 0.6 },
  videoPreviewOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 6 },
  videoPreviewText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.white },
  videoRemoveBtn: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 12, marginBottom: 20 },
  tagIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tagRowTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  tagRowSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  fields: { gap: 14, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
  aiHint: { flexDirection: 'row', gap: 10, backgroundColor: '#EBF2FF', borderRadius: radii.md, padding: 12, marginBottom: 20, alignItems: 'flex-start' },
  aiHintText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.primaryDark, lineHeight: 18 },
  submitBtn: { marginTop: 4 },
  tagModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  tagModalTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  tagModalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  tagModalHint: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginBottom: 14, textAlign: 'center' },
  tapMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -14,
    marginTop: -14,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'rgba(26,109,255,0.25)',
  },
  tagModalActions: { flexDirection: 'row', gap: 10, padding: 20, alignItems: 'center' },
  tagSkipBtn: { paddingVertical: 14, paddingHorizontal: 12 },
  tagSkipText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textMuted },
});
