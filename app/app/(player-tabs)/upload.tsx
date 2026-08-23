import { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../../src/theme';
import { NoticeBox } from '../../src/components/NoticeBox';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { AppTextField } from '../../src/components/AppTextField';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as videosRepository from '../../src/repositories/videosRepository';
import { router } from 'expo-router';
import * as guardianRepository from '../../src/repositories/guardianRepository';
import { showAlert } from '../../src/lib/alert';
import { successFeedback, errorFeedback } from '../../src/lib/haptics';
import { PushPrimer } from '../../src/components/PushPrimer';
import { getPushPermission } from '../../src/lib/push';
import Animated from 'react-native-reanimated';
import { useFloat } from '../../src/lib/motion';

type UploadMode = 'reel' | 'ai';
type PickedVideo = {
  uri: string;
  fileName?: string | null;
  thumbnailUri?: string;
  durationMs?: number | null;
  fileSize?: number | null;
};
type TagFrame = { uri: string; width: number; height: number };
type SubjectHint = { x: number; y: number }; // normalized 0-1, relative to TagFrame

// Matches the `videos` bucket's own file_size_limit
// (supabase/migrations/20260808190000_storage_upload_limits.sql). Kept in
// sync deliberately: the server is the real enforcer, this is only so the
// user finds out before spending data rather than after.
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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

// The picked file's URI was previously handed straight to <Image> -- an
// image decoder trying to parse a video container's raw bytes as pixel data
// is exactly what produced the garbled/distorted preview. A real player,
// same as everywhere else video is shown in this app.
function VideoPreviewPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  // contentFit="cover" inside a fixed 9:16 box was cropping any clip that
  // wasn't already exactly that shape -- a landscape highlight (very
  // plausible for match footage filmed on a tripod/sideline, not just
  // vertical selfie-style clips) got zoomed in on its top slice only. This
  // is a preview-display choice alone -- it never touched the uploaded
  // file itself, which is untouched full-resolution source. "contain"
  // letterboxes instead of cropping, so the full frame is always visible.
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />;
}

// Matches the mockup's UPLOAD tab: Highlight Reel / AI Analysis mode toggle,
// dashed drop zone, Title/Description/Match/Opponent/Tags, Upload & Publish.
// `uploadMode` maps directly to the `videos.upload_intent` field in the
// platform's data model — 'reel' -> 'highlight_only', 'ai' -> 'ai_analysis'.
export default function Upload() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const float = useFloat();
  const userId = useSessionStore((s) => s.session?.user.id);
  const [mode, setMode] = useState<UploadMode>('reel');
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matchName, setMatchName] = useState('');
  const [opponent, setOpponent] = useState('');
  const [tags, setTags] = useState('');
  const [publishing, setPublishing] = useState(false);
  // Asked only AFTER a successful upload -- the user has just done the thing
  // notifications are about, so the request finally makes sense to them.
  const [primerVisible, setPrimerVisible] = useState(false);
  // Real byte progress, and a way out. Previously the only feedback was the
  // button label changing, with no way to stop a large upload once started
  // -- on metered data that meant watching money leave with no exit.
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

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

  const resetForm = () => {
    resetVideo();
    setTitle('');
    setDescription('');
    setMatchName('');
    setOpponent('');
    setTags('');
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
    // `quality` is deliberately NOT passed: despite appearances it is an
    // IMAGE option ("if the selected image has been compressed before...")
    // and does nothing for a library-picked video on either platform. The
    // previous `quality: 1` here read as "max quality, no compression" but
    // was in fact a no-op. Real video transcoding needs a native module
    // (react-native-compressor) and a dev build -- until then the honest
    // control is the size guard below, which refuses an oversized file
    // BEFORE any of the user's data is spent on it.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    // Supabase enforces the 100MB bucket limit only after the whole file has
    // been uploaded, so without this check a user on a metered connection
    // pays for the entire transfer and then gets an error. `fileSize` was
    // already available on the asset and simply never read.
    if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
      showAlert(
        'Video too large',
        `This clip is ${formatBytes(asset.fileSize)}, and the limit is ${formatBytes(MAX_VIDEO_BYTES)}. ` +
          'Trim it or record a shorter highlight, then try again.'
      );
      return;
    }

    setTagFrame(null);
    setSubjectHint(null);
    setVideo({
      uri: asset.uri,
      fileName: asset.fileName,
      durationMs: asset.duration,
      fileSize: asset.fileSize,
    });
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

    // Checked BEFORE a single byte is uploaded. The database rejects this
    // anyway (migration 20260820151000), but that rejection happens after the
    // video is already in storage -- so without this check a 15-year-old on a
    // metered connection would pay for the whole transfer to be told no. The
    // cleanup path then deletes the orphaned object, meaning they paid for
    // nothing at all.
    if (mode === 'ai') {
      try {
        const consented = await guardianRepository.hasAiConsent(userId);
        if (!consented) {
          showAlert(
            'A parent or guardian needs to agree',
            'AI analysis measures how you move from the video, so someone over 18 has to approve it first. You can still post this as a highlight.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Ask them', onPress: () => router.push('/guardian-consent') },
            ]
          );
          return;
        }
      } catch {
        // If the check itself fails, fall through and let the upload proceed:
        // the database is the real gate, so the worst case is the honest
        // error rather than blocking someone who is actually allowed.
      }
    }

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

      const controller = new AbortController();
      abortRef.current = controller;
      const storagePath = await videosRepository.uploadVideoSource(
        userId,
        videoId,
        video.uri,
        video.fileName,
        { onProgress: setProgress, signal: controller.signal }
      );

      try {
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
      } catch (rowError) {
        // The bytes are already in storage at this point. Without this, a
        // failed row insert leaves an orphaned object that nothing
        // references and nothing will ever clean up -- it just silently
        // consumes the player's storage quota forever. Best-effort: if the
        // cleanup itself fails there's nothing further to do, and the
        // original error is what the user needs to hear about.
        await videosRepository.deleteVideoObjects(userId, videoId).catch(() => {});
        throw rowError;
      }

      successFeedback();

      // Only if the OS hasn't already been asked. Re-prompting a user who
      // declined is both useless (iOS won't show it again) and annoying.
      getPushPermission()
        .then((p) => {
          if (p === 'undetermined') setPrimerVisible(true);
        })
        .catch(() => {});

      // Canvas screen 15 gives the upload its own success screen rather than
      // an OS alert. The form is reset first so returning here via "Upload
      // another" lands on a clean one.
      resetForm();
      router.push({
        pathname: '/upload-success',
        params: { videoId, title: title.trim() || 'Your highlight', mode },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // The user asked to stop; anything already written is cleaned up
        // by the orphan handling above, so this needs no alert.
        return;
      }
      errorFeedback();
      showAlert('Upload Failed', err instanceof Error ? err.message : 'Something went wrong submitting your video. Please try again.');
    } finally {
      abortRef.current = null;
      setProgress(0);
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>New upload</Text>

        {/*
          Canvas screen 14 puts AI ANALYSIS first and HIGHLIGHT ONLY second,
          which is the right default: analysis is the product, and a player who
          picks highlight-only by accident gets no rating and no explanation.
          The order was reversed here before.
        */}
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, mode === 'ai' && styles.toggleBtnActive]}
            onPress={() => setMode('ai')}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'ai' }}
          >
            <Text style={[styles.toggleText, mode === 'ai' && styles.toggleTextActive]}>
              AI analysis
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, mode === 'reel' && styles.toggleBtnActive]}
            onPress={() => setMode('reel')}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'reel' }}
          >
            <Text style={[styles.toggleText, mode === 'reel' && styles.toggleTextActive]}>
              Highlight only
            </Text>
          </Pressable>
        </View>

        {/* Canvas 14's framing tip. It is not decoration: camera shake and the
            player leaving frame are the two things that most often make the
            pipeline fail calibration or lose the subject. */}
        {mode === 'ai' && (
          <NoticeBox style={styles.framingTip}>
            Keep the camera still and stay in frame — it lifts every attribute score.
          </NoticeBox>
        )}

        {video ? (
          <>
            {!!video.fileName && (
              // Surfaces exactly which file was picked -- when testing via a
              // desktop file dialog it's easy to select the wrong local file
              // by mistake and assume the app is showing/uploading the wrong
              // video, when really a different file was picked.
              <Text style={styles.pickedFileName} numberOfLines={1}>
                Selected: {video.fileName}
              </Text>
            )}
            {!!video.fileSize && (
              // Mobile data is a real cost for this app's users -- roughly
              // 5.8% of average monthly income per GB across Sub-Saharan
              // Africa. Showing the size before they commit lets them decide
              // to wait for Wi-Fi instead of finding out from their balance.
              <Text style={styles.pickedFileSize}>
                {formatBytes(video.fileSize)} will be uploaded
              </Text>
            )}
            <View style={styles.videoPreview}>
              <VideoPreviewPlayer uri={video.uri} />
              <Pressable style={styles.videoRemoveBtn} onPress={resetVideo} accessibilityRole="button" accessibilityLabel="Remove selected video">
                <Feather name="x" size={14} color={colors.white} />
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable style={styles.dropZone} onPress={pickVideo}>
            {/* Canvas float (screen 14): the empty drop zone's icon drifts,
                which is what marks it as the thing to act on rather than an
                illustration. */}
            <Animated.View style={[styles.dropIconWrap, float]}>
              <Feather name="upload-cloud" size={26} color={colors.primary} />
            </Animated.View>
            <Text style={styles.dropTitle}>Upload Video</Text>
            <Text style={styles.dropSub}>MP4, MOV up to 100MB</Text>
          </Pressable>
        )}

        {mode === 'ai' && video && (
          <Pressable style={styles.tagRow} onPress={openTagModal} disabled={extractingFrame}>
            <View style={[styles.tagIconWrap, subjectHint && { backgroundColor: colors.successTint }]}>
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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DETAILS</Text>
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
        </View>

        {mode === 'ai' && (
          <View style={styles.aiHint}>
            <View style={styles.aiHintIconWrap}>
              <Feather name="cpu" size={14} color={colors.primary} />
            </View>
            <Text style={styles.aiHintText}>
              This video will be analyzed by our AI pipeline. Ratings for your position appear once processing completes.
              For best accuracy, film yourself only, in one continuous shot with no cuts, camera held roughly level.
            </Text>
          </View>
        )}

        <PrimaryButton
          label={publishing ? `Uploading… ${Math.round(progress * 100)}%` : 'Upload & Publish'}
          onPress={publish}
          disabled={!video || publishing}
          loading={publishing}
          style={styles.submitBtn}
        />

        {publishing && (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(2, progress * 100)}%` }]} />
            </View>
            {/* An upload of this size on metered data is a real cost, so
                stopping it has to be possible -- not just waiting it out. */}
            <Pressable
              onPress={() => abortRef.current?.abort()}
              hitSlop={10}
              style={styles.cancelWrap}
              accessibilityRole="button"
              accessibilityLabel="Cancel upload"
            >
              <Text style={styles.cancelText}>Cancel upload</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal visible={tagModalOpen} animationType="slide" onRequestClose={() => setTagModalOpen(false)}>
        <SafeAreaView accessibilityViewIsModal style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.tagModalHeader}>
            <Pressable onPress={() => setTagModalOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
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
                  <Image source={{ uri: tagFrame.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
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

      <PushPrimer
        visible={primerVisible}
        profileId={userId ?? ''}
        onDone={() => setPrimerVisible(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  framingTip: { marginBottom: 20 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.display, color: colors.textPrimary },
  toggleRow: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radii.md },
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
    paddingVertical: 40,
    gap: 4,
    marginBottom: 20,
  },
  dropIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.infoTint, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  dropTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
  dropSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted },
  pickedFileName: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginBottom: 2 },
  progressTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  cancelWrap: { alignItems: 'center', marginTop: 12 },
  cancelText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.error },
  pickedFileSize: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, textAlign: 'center', marginBottom: 8 },
  videoPreview: {
    width: '70%',
    alignSelf: 'center',
    aspectRatio: 9 / 16,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  videoRemoveBtn: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 12, marginBottom: 20 },
  tagIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tagRowTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  tagRowSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  section: { marginBottom: 20, gap: 12 },
  sectionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  fields: { gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  aiHint: { flexDirection: 'row', gap: 10, backgroundColor: colors.infoTint, borderRadius: radii.lg, padding: spacing.lg, marginBottom: 20, alignItems: 'flex-start' },
  aiHintIconWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
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
    backgroundColor: 'rgba(18,58,107,0.25)',
  },
  tagModalActions: { flexDirection: 'row', gap: 10, padding: 20, alignItems: 'center' },
  tagSkipBtn: { paddingVertical: 14, paddingHorizontal: 12 },
  tagSkipText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textMuted },
  });
}
