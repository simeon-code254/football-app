import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Share } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView } from 'expo-video';
import Feather from '@expo/vector-icons/Feather';
import { cx, fontFamily, fontFamilyDisplay, fontSize, kicker, radii, spacing, useThemeColors, useIsDark, elevation } from '../../src/theme';
import Svg, { Defs, Pattern, Path, Rect, RadialGradient, Stop } from 'react-native-svg';
import { Kicker } from '../../src/components/Kicker';
import { RatingChip } from '../../src/components/RatingChip';
import { StatTile } from '../../src/components/StatTile';
import { VerificationBadge } from '../../src/components/VerificationBadge';
import * as guardianRepository from '../../src/repositories/guardianRepository';
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

/** First and last initial, matching InitialsAvatar's rule. */
function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase();
}


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
  const isDark = useIsDark();
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
  const anyLowConfidence = data?.attributes.some((a) => a.value != null && a.confidence === 'Low') ?? false;

  const statTiles = [
    // OVR is deliberately not a tile: the identity card above already shows
    // it in the gold chip, and printing the same number twice six lines apart
    // read as two different figures.
    { label: 'Clips', value: data ? data.videoCount : null },
    { label: 'Views', value: data ? formatCompact(data.videoViews30d) : null },
    { label: 'Invites', value: data ? data.trialInvitations : null },
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

  // The player hexagon means "guardian consent on file", which is the only
  // thing this app verifies about a player account. Nothing else earns it.
  const { data: hasGuardianConsent } = useQuery({
    queryKey: ['guardianConsentFlag', userId],
    enabled: !!userId,
    queryFn: () => guardianRepository.hasAiConsent(userId!),
  });

  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const openVideo = async (storagePath: string) => {
    const url = await videosRepository.getVideoUrl(storagePath);
    setPlayingVideoUrl(url);
  };

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonProfile />}>
      {/*
        Canvas screen 17: a navy cover with a faint blueprint grid and the gold
        glow, NOT a photograph. The photo cover this replaced was a stock image
        that had nothing to do with the player -- the canvas gives the space to
        the identity card that overlaps it instead.
      */}
      <View style={styles.coverWrap}>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Pattern id="ppg" width="16" height="16" patternUnits="userSpaceOnUse">
              <Path d="M0 8h16M8 0v16" stroke={colors.accentOnNavy} strokeWidth={0.4} />
            </Pattern>
            <RadialGradient id="profileGlow" cx="85%" cy="0%" r="58%">
              <Stop offset="0" stopColor="#b5d9fd" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#b5d9fd" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#ppg)" opacity={0.08} />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#profileGlow)" />
        </Svg>
        <View style={styles.coverActions}>
          <IconButton icon="settings" light accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
          <IconButton icon="edit-2" light accessibilityLabel="Edit profile" onPress={() => router.push({ pathname: '/profile-complete', params: { mode: 'edit' } })} />
        </View>
      </View>

      {/* The identity card rides up over the cover's lower edge. */}
      <View style={styles.idCardWrap}>
        <View style={[styles.idCard, elevation('raised', isDark)]}>
          <View style={styles.idRow}>
            <View style={styles.idTile}>
              <Text style={styles.idTileText}>{initialsOf(data?.profile.full_name)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.idNameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {data?.profile.full_name || 'Complete your profile'}
                </Text>
                {/* The player hexagon appears only once guardian consent is on
                    file, which is the only thing this app actually verifies
                    about a player. */}
                {hasGuardianConsent && <VerificationBadge role="player" size={12} glyph="mark" />}
              </View>
              <Kicker size={fontSize.caption} style={{ marginTop: 3 }}>
                {[
                  data?.publicView.primary_position,
                  data?.publicView.nationality_name,
                  data?.publicView.age,
                  data?.publicView.club,
                ]
                  .filter(Boolean)
                  .join(' · ') || (isLoading ? 'Loading…' : '')}
              </Kicker>
            </View>
            <RatingChip value={data?.publicView.overall_rating ?? null} size="lg" />
          </View>

          {/* Canvas 17: Edit | Messages | Share, inside the card. Share is the
              filled one because it is the action that gets a player seen. */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => router.push({ pathname: '/profile-complete', params: { mode: 'edit' } })}
              accessibilityRole="button"
            >
              <Feather name="edit-2" size={12} color={colors.primaryDark} />
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => router.push('/messages')}
              accessibilityRole="button"
            >
              <Feather name="message-square" size={12} color={colors.primaryDark} />
              <Text style={styles.actionText}>Messages</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnFilled]}
              onPress={() =>
                userId &&
                Share.share({
                  message: `${data?.profile.full_name ?? 'This player'} on Matobev — matobev://p/${userId}`,
                }).catch(() => {})
              }
              accessibilityRole="button"
            >
              <Feather name="share" size={12} color={colors.gold} />
              <Text style={[styles.actionText, styles.actionTextFilled]}>Share</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {!!data?.player.bio && (
        <View style={styles.aboutBlock}>
          <Kicker>About</Kicker>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>{data.player.bio}</Text>
          </View>
        </View>
      )}

      {/* Canvas 17: three separate bordered tiles, not one divided card. */}
      <View style={styles.statTileRow}>
        {statTiles.map((t) => (
          <StatTile key={t.label} value={t.value} label={t.label} />
        ))}
      </View>
      {(isProvisionalRating || anyLowConfidence) && (
        <Text style={styles.provisionalNote}>
          {isProvisionalRating
            ? `Provisional — ${presentAttrCount} of ${totalAttrCount} attributes assessed.`
            : ''}
          {isProvisionalRating && anyLowConfidence ? ' ' : ''}
          {anyLowConfidence
            ? 'Some values were hard to measure — clearer footage improves them.'
            : ''}
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
  coverWrap: { height: cx(104), backgroundColor: colors.primaryDark, overflow: 'hidden' },
  coverActions: { position: 'absolute', top: cx(32), right: 16, flexDirection: 'row', gap: 8 },
  // The card overlaps the cover's lower edge, as the canvas does at -38px.
  idCardWrap: { paddingHorizontal: cx(15), marginTop: -cx(38) },
  idCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 14 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  idTile: {
    width: 58,
    height: 58,
    borderRadius: radii.xl,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idTileText: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.heading, color: colors.primaryDark },
  idNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.title, color: colors.textPrimary },
  statTile: { flex: 1, alignItems: 'center' },
  tabRow: { flexDirection: 'row', marginTop: 24, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingHorizontal: 20 },
  tabItem: { marginRight: 20, paddingBottom: 10 },
  tabLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted },
  tabLabelActive: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
  tabIndicator: { height: 2, backgroundColor: colors.primary, borderRadius: 1, marginTop: 8 },
  panel: { padding: 20 },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: spacing.md },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionBtnFilled: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  actionText: { fontFamily: fontFamilyDisplay.bold, fontSize: fontSize.sm, color: colors.primaryDark },
  actionTextFilled: { color: colors.gold },
  aboutBlock: { paddingHorizontal: 20, marginTop: spacing.xl },
  aboutCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  aboutText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodySm,
    lineHeight: fontSize.bodySm * 1.45,
    color: colors.textPrimary,
  },
  statTileRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginTop: spacing.md },
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
