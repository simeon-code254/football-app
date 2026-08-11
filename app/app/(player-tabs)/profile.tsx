import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Modal } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import { IconButton } from '../../src/components/IconButton';
import * as profileRepository from '../../src/repositories/profileRepository';
import * as videosRepository from '../../src/repositories/videosRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import { QueryState } from '../../src/components/QueryState';

function VideoPreview({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => p.play());
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />;
}

const COVER = images.onboardSlide1;
const AVATAR = images.avatarMale;

const TABS = ['About', 'Videos', 'AI Ratings', 'Stats'] as const;

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// Matches the mockup's PROFILE tab: cover + avatar + name/position header,
// 4-across stat tiles, About/Videos/AI Ratings/Stats sub-tabs. The mockup
// only implements the About panel's content — Videos/AI Ratings/Stats are
// built out here with real content matching the app's data model.
export default function Profile() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('About');
  const userId = useSessionStore((s) => s.session?.user.id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['playerProfileScreen', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profile, player, publicView, videos, applications, profileViews30d] = await Promise.all([
        profileRepository.getMyProfile(userId!),
        profileRepository.getMyPlayer(userId!),
        profileRepository.getPlayerPublicView(userId!),
        videosRepository.getMyVideos(userId!),
        trialsRepository.getMyApplications(userId!),
        profileRepository.getProfileViewCount(userId!, 30),
      ]);
      const attributes = await profileRepository.getPlayerAttributes(userId!, !!player.is_goalkeeper);
      return {
        profile,
        player,
        publicView,
        attributes,
        videos,
        videoCount: videos.length,
        videoViews30d: videos.reduce((sum, v) => sum + v.view_count, 0),
        trialInvitations: applications.filter((a) => a.source === 'invited').length,
        profileViews30d,
      };
    },
  });

  const presentAttrCount = data?.attributes.filter((a) => a.value != null).length ?? 0;
  const totalAttrCount = data?.attributes.length ?? 0;
  const isProvisionalRating = presentAttrCount > 0 && presentAttrCount < totalAttrCount;

  const statTiles = [
    { label: 'OVR', value: data?.publicView.overall_rating != null ? String(data.publicView.overall_rating) : '—' },
    { label: 'Reels', value: data ? String(data.videoCount) : '—' },
    { label: 'Views', value: data ? formatCompact(data.videoViews30d) : '—' },
    { label: 'Invites', value: data ? String(data.trialInvitations) : '—' },
  ];

  const { data: thumbUrls } = useQuery({
    queryKey: ['profileVideoThumbs', data?.videos.map((v) => v.id)],
    enabled: tab === 'Videos' && !!data?.videos.some((v) => v.thumbnail_path),
    queryFn: async () => {
      // Falling back to storage_path (the video file itself) here used to
      // hand an <Image> a video URL it can't decode -- rendered as nothing,
      // indistinguishable from a loading thumbnail. Only real thumbnails
      // get a signed URL; videos without one get an honest placeholder.
      const withThumb = data!.videos.filter((v) => v.thumbnail_path);
      const urls = await Promise.all(withThumb.map((v) => videosRepository.getVideoUrl(v.thumbnail_path!)));
      return Object.fromEntries(withThumb.map((v, i) => [v.id, urls[i]]));
    },
  });

  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const openVideo = async (storagePath: string) => {
    const url = await videosRepository.getVideoUrl(storagePath);
    setPlayingVideoUrl(url);
  };

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
      <View style={styles.coverWrap}>
        <Image source={{ uri: COVER }} style={styles.cover} />
        <View style={styles.coverMask} />
        <View style={styles.editBtnWrap}>
          <IconButton icon="settings" light accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
          <IconButton icon="edit-2" light accessibilityLabel="Edit profile" onPress={() => router.push({ pathname: '/profile-complete', params: { mode: 'edit' } })} />
        </View>
      </View>

      <View style={styles.headerBlock}>
        <Image source={{ uri: data?.profile.avatar_url ?? AVATAR }} style={styles.avatar} />
        <Text style={styles.name}>{data?.profile.full_name || 'Complete your profile'}</Text>
        <Text style={styles.meta}>
          {[data?.publicView.primary_position, data?.publicView.age, data?.publicView.nationality_name]
            .filter(Boolean)
            .join(' · ') || (isLoading ? 'Loading…' : '')}
        </Text>
      </View>

      <View style={styles.statTiles}>
        {statTiles.map((t) => (
          <View key={t.label} style={styles.statTile}>
            <Text style={styles.statTileValue}>{t.value}</Text>
            <Text style={styles.statTileLabel}>{t.label}</Text>
          </View>
        ))}
      </View>
      {isProvisionalRating && (
        <Text style={styles.provisionalNote}>
          Provisional ({presentAttrCount}/{totalAttrCount} attributes assessed)
        </Text>
      )}

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={styles.tabItem}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{t}</Text>
            {tab === t && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        {tab === 'About' && (
          <View style={{ gap: 16 }}>
            <Text style={styles.bio}>{data?.player.bio || 'No bio yet — add one from Edit Profile.'}</Text>
            <View style={styles.detailsGrid}>
              {[
                ['Position', data?.player.primary_position ?? '—'],
                ['Foot', data?.player.preferred_foot ?? '—'],
                ['Height', data?.player.height_cm ? `${data.player.height_cm} cm` : '—'],
                ['Weight', data?.player.weight_kg ? `${data.player.weight_kg} kg` : '—'],
                ['Club', data?.player.club || '—'],
                ['Experience', data?.player.years_playing ? `${data.player.years_playing} years` : '—'],
              ].map(([label, value]) => (
                <View key={label} style={styles.detailCell}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {tab === 'Videos' && (
          <View style={styles.videoGrid}>
            {!data?.videos.length && (
              <Text style={{ fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted }}>
                No videos uploaded yet.
              </Text>
            )}
            {(data?.videos ?? []).map((v) => (
              <Pressable key={v.id} style={styles.videoThumb} onPress={() => openVideo(v.storage_path)}>
                {thumbUrls?.[v.id] ? (
                  <Image source={{ uri: thumbUrls[v.id] }} style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.videoThumbPlaceholder]}>
                    <Feather name="film" size={22} color={colors.textPlaceholder} />
                  </View>
                )}
                <View style={styles.videoPlay}>
                  <Text style={styles.videoPlayGlyph}>▶</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {tab === 'AI Ratings' && (
          <View style={{ gap: 14 }}>
            <Text style={styles.aiNote}>
              Ratings update automatically as new highlights are analyzed by the AI pipeline.
            </Text>
            {isProvisionalRating && (
              <Text style={styles.provisionalNote}>
                Provisional — {presentAttrCount} of {totalAttrCount} attributes assessed so far.
              </Text>
            )}
            {(data?.attributes ?? []).map((attr) => (
              <View key={attr.key} style={styles.skillRow}>
                <Text style={styles.skillName}>{attr.displayName}</Text>
                <View style={styles.skillTrack}>
                  <View style={[styles.skillFill, { width: `${attr.value ?? 0}%` }]} />
                </View>
                <Text style={styles.skillVal}>{attr.value ?? '—'}</Text>
              </View>
            ))}
            {data && data.attributes.every((a) => a.value == null) && (
              <Text style={styles.aiNote}>No ratings yet — upload a highlight with AI Analysis enabled.</Text>
            )}
          </View>
        )}

        {tab === 'Stats' && (
          // "Scout Saves" was dropped: saved_players is RLS-private to the
          // saving scout (no player-visibility policy), so a player has no
          // honest way to see how many scouts saved them.
          <View style={{ gap: 10 }}>
            {[
              ['Profile Views (30d)', data ? String(data.profileViews30d) : '—'],
              ['Video Views (30d)', data ? String(data.videoViews30d) : '—'],
              ['Trial Invitations', data ? String(data.trialInvitations) : '—'],
            ].map(([label, value]) => (
              <View key={label} style={styles.statRow}>
                <Text style={styles.statRowLabel}>{label}</Text>
                <Text style={styles.statRowValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      </QueryState>

      <Modal visible={!!playingVideoUrl} animationType="fade" onRequestClose={() => setPlayingVideoUrl(null)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {playingVideoUrl && <VideoPreview url={playingVideoUrl} />}
          <Pressable style={styles.videoCloseBtn} onPress={() => setPlayingVideoUrl(null)}>
            <Feather name="x" size={20} color={colors.white} />
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  coverWrap: { height: 140 },
  cover: { width: '100%', height: '100%' },
  editBtnWrap: { position: 'absolute', top: 44, right: 16, flexDirection: 'row', gap: 8 },
  coverMask: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerBlock: { alignItems: 'center', marginTop: -44 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.surface },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginTop: 10 },
  meta: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginTop: 2 },
  statTiles: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, gap: 10 },
  statTile: { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, paddingVertical: 12 },
  statTileValue: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  statTileLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  tabRow: { flexDirection: 'row', marginTop: 24, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingHorizontal: 20 },
  tabItem: { marginRight: 20, paddingBottom: 10 },
  tabLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted },
  tabLabelActive: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
  tabIndicator: { height: 2, backgroundColor: colors.primary, borderRadius: 1, marginTop: 8 },
  panel: { padding: 20 },
  bio: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 21 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailCell: { width: '47%', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 12 },
  detailLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted },
  detailValue: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary, marginTop: 3 },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  videoThumb: {
    width: '31.5%',
    aspectRatio: 9 / 14,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoThumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  videoPlay: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  videoPlayGlyph: { color: colors.white, fontSize: 11 },
  videoCloseBtn: { position: 'absolute', top: 50, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  aiNote: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },
  provisionalNote: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.goldDark, textAlign: 'center', marginTop: 4 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skillName: { width: 110, fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  skillTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  skillFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  skillVal: { width: 28, textAlign: 'right', fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 14 },
  statRowLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody },
  statRowValue: { fontFamily: fontFamily.bold, fontSize: fontSize.bodySm, color: colors.textPrimary },
});
