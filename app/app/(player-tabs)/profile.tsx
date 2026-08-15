import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView } from 'expo-video';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import { IconButton } from '../../src/components/IconButton';
import * as profileRepository from '../../src/repositories/profileRepository';
import * as videosRepository from '../../src/repositories/videosRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import { QueryState } from '../../src/components/QueryState';
import { ProfileStrength } from '../../src/components/ProfileStrength';
import { SkeletonProfile } from '../../src/components/Skeleton';
import { showAlert } from '../../src/lib/alert';

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
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [tab, setTab] = useState<(typeof TABS)[number]>('About');
  const userId = useSessionStore((s) => s.session?.user.id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['playerProfileScreen', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profile, player, publicView, videos, trialInvitations, profileViews30d] = await Promise.all([
        profileRepository.getMyProfile(userId!),
        profileRepository.getMyPlayer(userId!),
        profileRepository.getPlayerPublicView(userId!),
        videosRepository.getMyVideos(userId!),
        trialsRepository.getMyInvitationsCount(userId!),
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
        trialInvitations,
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
      const urlByPath = await videosRepository.getVideoUrls(withThumb.map((v) => v.thumbnail_path!));
      return Object.fromEntries(withThumb.map((v) => [v.id, urlByPath[v.thumbnail_path!] ?? '']));
    },
  });

  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const openVideo = async (storagePath: string) => {
    const url = await videosRepository.getVideoUrl(storagePath);
    setPlayingVideoUrl(url);
  };

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonProfile />}>
      <View style={styles.coverWrap}>
        <Image source={{ uri: COVER }} style={styles.cover} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)']} style={StyleSheet.absoluteFill} />
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

      <View style={styles.statCard}>
        {statTiles.map((t, i) => (
          <View key={t.label} style={[styles.statTile, i < statTiles.length - 1 && styles.statTileDivider]}>
            <Text style={styles.statTileValue}>{t.value}</Text>
            <Text style={styles.statTileLabel}>{t.label}</Text>
          </View>
        ))}
      </View>
      {isProvisionalRating && (
        <Text style={styles.provisionalNote}>
          Provisional — {presentAttrCount}/{totalAttrCount} attributes assessed
        </Text>
      )}

      {/* Sits directly under the stats so it's the first thing a player
          sees about their OWN profile. Only shown while there's something
          left to do -- a permanent 100% bar is just clutter. */}
      {data && (
        <ProfileStrength
          avatarUrl={data.profile.avatar_url}
          bio={data.player.bio}
          club={data.player.club}
          heightCm={data.player.height_cm}
          secondaryPosition={data.player.secondary_position}
          videoCount={data.videoCount}
          socials={{
            instagram: data.player.instagram_handle,
            youtube: data.player.youtube_url,
            tiktok: data.player.tiktok_handle,
            facebook: data.player.facebook_url,
          }}
        />
      )}

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => (t === 'AI Ratings' ? router.push('/ai-ratings') : setTab(t))}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityLabel={t}
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{t}</Text>
            {tab === t && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        {tab === 'About' && (
          <View style={{ gap: 18 }}>
            <View style={styles.bioCard}>
              <Text style={styles.bio}>{data?.player.bio || 'No bio yet — add one from Edit Profile.'}</Text>
            </View>
            <View>
              <Text style={styles.sectionLabel}>PLAYER INFO</Text>
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
              <Pressable
                key={v.id}
                style={styles.videoThumb}
                onPress={() =>
                  v.is_removed
                    ? showAlert(
                        'Video removed',
                        v.removed_reason || 'This video was removed by an admin for violating community guidelines.'
                      )
                    : openVideo(v.storage_path)
                }
              >
                {thumbUrls?.[v.id] ? (
                  <Image
                    source={{ uri: thumbUrls[v.id] }}
                    style={[StyleSheet.absoluteFill, v.is_removed && styles.videoThumbDimmed]}
                    contentFit="contain"
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.videoThumbPlaceholder]}>
                    <Feather name="film" size={22} color={colors.textPlaceholder} />
                  </View>
                )}
                {v.is_removed ? (
                  <View style={styles.removedBadge}>
                    <Feather name="eye-off" size={11} color={colors.white} />
                    <Text style={styles.removedBadgeText}>Removed</Text>
                  </View>
                ) : (
                  <View style={styles.videoPlay}>
                    <Text style={styles.videoPlayGlyph}>▶</Text>
                  </View>
                )}
              </Pressable>
            ))}
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
        <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: '#000' }}>
          {playingVideoUrl && <VideoPreview url={playingVideoUrl} />}
          <Pressable style={styles.videoCloseBtn} onPress={() => setPlayingVideoUrl(null)} accessibilityRole="button" accessibilityLabel="Close video">
            <Feather name="x" size={20} color={colors.white} />
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginTop: 10 },
  meta: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginTop: 2 },
  statCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    paddingVertical: 14,
  },
  statTile: { flex: 1, alignItems: 'center' },
  statTileDivider: { borderRightWidth: 1, borderRightColor: colors.divider },
  statTileValue: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  statTileLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  tabRow: { flexDirection: 'row', marginTop: 24, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingHorizontal: 20 },
  tabItem: { marginRight: 20, paddingBottom: 10 },
  tabLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted },
  tabLabelActive: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
  tabIndicator: { height: 2, backgroundColor: colors.primary, borderRadius: 1, marginTop: 8 },
  panel: { padding: 20 },
  sectionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1, marginBottom: 12 },
  bioCard: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.primary },
  bio: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 21 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailCell: { width: '47%', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 12 },
  detailLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted },
  detailValue: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary, marginTop: 3 },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  videoThumb: {
    width: '31%',
    aspectRatio: 9 / 14,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoThumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  videoThumbDimmed: { opacity: 0.35 },
  removedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  removedBadgeText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.white },
  videoPlay: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  videoPlayGlyph: { color: colors.white, fontSize: 11 },
  videoCloseBtn: { position: 'absolute', top: 50, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  provisionalNote: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.goldDark, textAlign: 'center', marginTop: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 14 },
  statRowLabel: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody },
  statRowValue: { fontFamily: fontFamily.bold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  });
}
