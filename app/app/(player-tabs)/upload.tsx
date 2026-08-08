import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { AppTextField } from '../../src/components/AppTextField';

type UploadMode = 'reel' | 'ai';
type PickedVideo = { uri: string; thumbnailUri?: string; durationMs?: number | null };

// Matches the mockup's UPLOAD tab: Highlight Reel / AI Analysis mode toggle,
// dashed drop zone, Title/Description/Match/Opponent/Tags, Upload & Publish.
// `uploadMode` maps directly to the `videos.upload_intent` field in the
// platform's data model — 'reel' -> 'highlight_only', 'ai' -> 'ai_analysis'.
export default function Upload() {
  const [mode, setMode] = useState<UploadMode>('reel');
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [publishing, setPublishing] = useState(false);

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a highlight video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setVideo({ uri: asset.uri, durationMs: asset.duration });
  };

  const publish = async () => {
    if (!video) return;
    setPublishing(true);
    // TODO(backend wiring): upload `video.uri` to the `videos` storage bucket
    // at `{player_id}/{video_id}/source.mp4`, then insert a `videos` row with
    // upload_intent matching `mode` and the form fields below.
    await new Promise((res) => setTimeout(res, 700));
    setPublishing(false);
    Alert.alert('Uploaded', 'Your video has been published.', [
      { text: 'OK', onPress: () => router.push('/(player-tabs)/profile') },
    ]);
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
            <Pressable style={styles.videoRemoveBtn} onPress={() => setVideo(null)}>
              <Feather name="x" size={14} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.dropZone} onPress={pickVideo}>
            <Feather name="upload-cloud" size={28} color="#9CA3AF" />
            <Text style={styles.dropTitle}>Upload Video</Text>
            <Text style={styles.dropSub}>MP4, MOV up to 500MB</Text>
          </Pressable>
        )}

        <View style={styles.fields}>
          <AppTextField label="Title" placeholder="e.g. Hat-trick vs Academy FC" />
          <AppTextField label="Description" placeholder="Tell scouts what to look for" multiline style={{ minHeight: 60 }} />
          <View style={styles.row}>
            <AppTextField label="Match" placeholder="League match" />
            <AppTextField label="Opponent" placeholder="Academy FC" />
          </View>
          <AppTextField label="Tags" placeholder="#freekick #goals" autoCapitalize="none" />
        </View>

        {mode === 'ai' && (
          <View style={styles.aiHint}>
            <Feather name="cpu" size={16} color={colors.primary} />
            <Text style={styles.aiHintText}>
              This video will be analyzed by our AI pipeline. Ratings for your position appear once processing completes.
            </Text>
          </View>
        )}

        <PrimaryButton
          label={publishing ? 'Uploading…' : 'Upload & Publish'}
          onPress={publish}
          disabled={!video}
          loading={publishing}
          style={styles.submitBtn}
        />
      </ScrollView>
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
  fields: { gap: 14, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
  aiHint: { flexDirection: 'row', gap: 10, backgroundColor: '#EBF2FF', borderRadius: radii.md, padding: 12, marginBottom: 20, alignItems: 'flex-start' },
  aiHintText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.primaryDark, lineHeight: 18 },
  submitBtn: { marginTop: 4 },
});
