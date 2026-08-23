import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontFamilyDisplay, fontSize, radii, useThemeColors, useIsDark, elevation } from '../../src/theme';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '../../src/components/Logo';
import { Kicker } from '../../src/components/Kicker';
import { StatTile } from '../../src/components/StatTile';
import { VerificationBadge } from '../../src/components/VerificationBadge';
import { images } from '../../src/constants/images';
import { ScoutPlayerCard } from '../../src/components/ScoutPlayerCard';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as profileRepository from '../../src/repositories/profileRepository';
import * as scoutingRepository from '../../src/repositories/scoutingRepository';
import { showAlert } from '../../src/lib/alert';
import { tapFeedback } from '../../src/lib/haptics';
import * as messagesRepository from '../../src/repositories/messagesRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import * as videosRepository from '../../src/repositories/videosRepository';
import * as notificationsRepository from '../../src/repositories/notificationsRepository';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonScoutHome } from '../../src/components/Skeleton';
import { NewsPopup } from '../../src/components/NewsPopup';

const TOP_FILTERS = ['All', 'My Region', 'My Positions', 'Under 18', 'Under 21'] as const;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// The Scout Dashboard — a talent-intelligence workspace, not a social feed.
// Structure matches the full spec: header w/ verification state, global
// search, quick actions, scouting overview, Recommended (with a real
// match-reason explanation drawn from scout_preferences + recent activity,
// never a fabricated one), Recently Uploaded, Top Performers leaderboard,
// Active Trials.
export default function ScoutDashboard() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const [topFilter, setTopFilter] = useState<(typeof TOP_FILTERS)[number]>('All');
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading, isRefetching: profileRefetching, error: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['scoutHomeProfile', userId],
    enabled: !!userId,
    queryFn: () => profileRepository.getMyProfile(userId!),
  });

  const { data: scout } = useQuery({
    queryKey: ['scoutHomeScoutRow', userId],
    enabled: !!userId,
    queryFn: () => profileRepository.getMyScout(userId!),
  });

  const { data: prefs } = useQuery({
    queryKey: ['scoutHomePrefs', userId],
    enabled: !!userId,
    queryFn: () => scoutingRepository.getPreferences(userId!),
  });

  const { data: overview } = useQuery({
    queryKey: ['scoutOverview', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [views, saved, contacted, trialsCount, openTrialsPage] = await Promise.all([
        profileRepository.getViewsGivenCount(userId!),
        scoutingRepository.getSavedPlayersCount(userId!),
        messagesRepository.getConversationsCount(userId!),
        trialsRepository.getMyTrialsCount(userId!),
        // A scout won't realistically run more than a handful of trials
        // open at once, even if their all-time trial count grows large --
        // bounded fetch instead of pulling every trial ever created just to
        // filter for 'open' ones client-side.
        trialsRepository.listMyTrials(userId!, { status: 'open', pageSize: 50 }),
      ]);
      return { views, saved, contacted, trials: trialsCount, openTrials: openTrialsPage.items };
    },
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['scoutUnreadNotifications', userId],
    enabled: !!userId,
    queryFn: () => notificationsRepository.getUnreadCount(userId!),
  });

  const { data: recommended, refetch: refetchRecommended } = useQuery({
    queryKey: ['scoutRecommended', userId, prefs],
    enabled: !!userId,
    queryFn: async () => {
      const { items: players } = await profileRepository.listPlayerPublicViews(
        {
          positions: prefs?.positions?.length ? prefs.positions : undefined,
          countryCodes: prefs?.countries?.length ? prefs.countries : undefined,
          ageMin: prefs?.age_min ?? undefined,
          ageMax: prefs?.age_max ?? undefined,
          minOverall: prefs?.min_overall ?? undefined,
        },
        { pageSize: 24 }
      );
      const top = players.slice(0, 4);
      return Promise.all(
        top.map(async (p) => {
          const [attrs, savedRow] = await Promise.all([
            profileRepository.getPlayerAttributes(p.id!, p.primary_position === 'GK'),
            scoutingRepository.isPlayerSaved(userId!, p.id!),
          ]);
          const reasons: string[] = [];
          if (prefs?.positions?.includes(p.primary_position as never)) reasons.push('Matches your preferred position');
          if (p.recently_active) reasons.push('Recently active');
          // Computed over ALL scored attributes, not the four the card shows.
          // The overall is a weighted average of everything the engine
          // scored, so an attribute that never makes the top four can still
          // be dragging it -- deriving this from the sliced list would mark
          // the headline only when the uncertainty happened to be visible.
          const anyLowConfidence = attrs.some((a) => a.value != null && a.confidence === 'Low');
          return {
            player: p,
            attrs: attrs.filter((a) => a.value != null).slice(0, 4),
            anyLowConfidence,
            saved: !!savedRow,
            reasons,
          };
        })
      );
    },
  });

  // Optimistic: flip the saved flag in the cache immediately, then reconcile.
  // Previously this awaited the write AND a full refetch of the recommended
  // list before anything moved on screen, so tapping Save felt broken on a
  // slow connection -- which is the normal connection for this app's users.
  // On failure the cache is rolled back to exactly what it was and the
  // scout is told, rather than silently leaving a wrong state on screen.
  const toggleSave = async (playerId: string, saved: boolean) => {
    if (!userId) return;

    const key = ['scoutRecommended', userId, prefs];
    const previous = queryClient.getQueryData<typeof recommended>(key);
    queryClient.setQueryData<typeof recommended>(key, (rows) =>
      rows?.map((r) => (r.player.id === playerId ? { ...r, saved: !saved } : r))
    );
    tapFeedback();

    try {
      if (saved) {
        await scoutingRepository.unsavePlayer(userId, playerId);
      } else {
        const folders = await scoutingRepository.listFolders(userId);
        const defaultFolder = folders.find((f) => f.is_default) ?? folders[0];
        if (defaultFolder) await scoutingRepository.savePlayerToFolder(userId, playerId, defaultFolder.id);
      }
      // Keep the saved-count tile and any other derived view honest.
      queryClient.invalidateQueries({ queryKey: ['scoutOverview'] });
    } catch (err) {
      queryClient.setQueryData(key, previous);
      showAlert('Could not update', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const { data: recentUploads } = useQuery({
    queryKey: ['scoutRecentUploads'],
    queryFn: () => videosRepository.getRecentUploads(6),
  });

  const { data: uploadThumbs } = useQuery({
    queryKey: ['scoutRecentUploadThumbs', recentUploads?.map((v) => v.id)],
    enabled: !!recentUploads?.some((v) => v.thumbnail_path),
    queryFn: async () => {
      // A video with no real thumbnail used to fall back to a signed URL
      // for the video FILE itself, handed to an <Image> that can't decode
      // it -- rendered as nothing. Only real thumbnails get a URL here.
      const withThumb = recentUploads!.filter((v) => v.thumbnail_path);
      const urlByPath = await videosRepository.getVideoUrls(withThumb.map((v) => v.thumbnail_path!));
      return Object.fromEntries(withThumb.map((v) => [v.id, urlByPath[v.thumbnail_path!] ?? '']));
    },
  });

  const { data: topPerformers } = useQuery({
    queryKey: ['scoutTopPerformers', topFilter, prefs, scout?.country_code],
    enabled: !!userId,
    queryFn: async () => {
      if (topFilter === 'My Positions')
        return (await profileRepository.listPlayerPublicViews({ positions: prefs?.positions }, { pageSize: 24 })).items;
      if (topFilter === 'Under 18')
        return (await profileRepository.listPlayerPublicViews({ ageMax: 17 }, { pageSize: 24 })).items;
      if (topFilter === 'Under 21')
        return (await profileRepository.listPlayerPublicViews({ ageMax: 20 }, { pageSize: 24 })).items;
      if (topFilter === 'My Region') {
        // Without a country_code, "showing everyone" would silently mislabel
        // an unfiltered list as region-filtered -- return nothing instead so
        // the empty state can prompt the scout to set their country.
        if (!scout?.country_code) return [];
        return (await profileRepository.listPlayerPublicViews({ countryCode: scout.country_code }, { pageSize: 24 })).items;
      }
      return (await profileRepository.listPlayerPublicViews({}, { pageSize: 24 })).items;
    },
  });

  const { data: applicantCounts } = useQuery({
    queryKey: ['scoutOpenTrialApplicantCounts', overview?.openTrials.map((t) => t.id)],
    enabled: !!overview?.openTrials.length,
    queryFn: () => trialsRepository.getApplicantCounts(overview!.openTrials.map((t) => t.id)),
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NewsPopup />
      <QueryState isLoading={profileLoading} error={profileError} onRetry={refetchProfile} skeleton={<SkeletonScoutHome />}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={profileRefetching} onRefresh={refetchProfile} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/*
          Canvas screen 21 SCOUT HOME. A navy header carrying the org name and
          its verification hexagon, with a steel radial glow at 88% 4% -- the
          scout counterpart to the player home's gold one. The search bar lives
          inside the header rather than under it, and the counters lift over
          its lower edge.
        */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <RadialGradient id="scoutGlow" cx="88%" cy="4%" r="58%">
                <Stop offset="0" stopColor="#4F94D4" stopOpacity={0.32} />
                <Stop offset="1" stopColor="#4F94D4" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#scoutGlow)" />
          </Svg>

          <View style={styles.headerRow}>
            <Logo variant="gold" size={20} />
            <View style={{ flex: 1 }}>
              <Kicker size={fontSize.caption} tone="onNavy">
                {getGreeting()}
              </Kicker>
              <View style={styles.orgRow}>
                <Text style={styles.orgName} numberOfLines={1}>
                  {scout?.organization || profile?.full_name || 'Scout'}
                </Text>
                {scoutVerified && <VerificationBadge role="scout" size={17} glyph="mark" />}
              </View>
            </View>
            <Pressable
              onPress={() => router.push('/notifications')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <Feather name="bell" size={18} color="rgba(255,255,255,0.7)" />
              {!!unreadCount && <View style={styles.headerDot} />}
            </Pressable>
          </View>

          <Pressable
            style={styles.headerSearch}
            onPress={() => router.push('/(scout-tabs)/players')}
            accessibilityRole="button"
            accessibilityLabel="Search players"
          >
            <Feather name="search" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.headerSearchText}>Search position, age, region…</Text>
          </Pressable>
        </LinearGradient>

        {/* The three counters ride up over the header's lower edge. */}
        <View style={styles.counters}>
          <StatTile value={overview?.saved ?? null} label="Saved" />
          <StatTile value={overview?.contacted ?? null} label="Contacted" />
          {/* Reply rate needs per-conversation response tracking that
              `conversations` does not keep -- blank rather than invented. */}
          <StatTile value={null} label="Replies" />
        </View>

        {/* Canvas 21's premium banner: a warm dark gradient with the club
            hexagon, sitting between the counters and the matches list. */}
        <Pressable style={styles.premium} onPress={() => router.push('/premium')} accessibilityRole="button">
          <VerificationBadge role="club" size={26} glyph="mark" />
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>Go Premium</Text>
            <Text style={styles.premiumSub}>Unlimited contacts · priority search</Text>
          </View>
          <Feather name="chevron-right" size={13} color={colors.goldDark} />
        </Pressable>

        {!scoutVerified && scout?.verification_status === 'rejected' ? (
          <Pressable style={[styles.verifyBanner, styles.verifyBannerRejected]} onPress={() => router.push('/scout-verification')}>
            <Feather name="x-circle" size={16} color={colors.error} />
            <Text style={[styles.verifyBannerText, { color: colors.error }]}>
              {scout?.verification_notes || "Your verification wasn't approved. Please review and resubmit."}
            </Text>
            <Text style={[styles.verifyBannerCta, { color: colors.error }]}>Resubmit</Text>
          </Pressable>
        ) : (
          !scoutVerified && (
            <Pressable style={styles.verifyBanner} onPress={() => router.push('/scout-verification')}>
              <Feather name="alert-circle" size={16} color={colors.goldDark} />
              <Text style={styles.verifyBannerText}>
                Complete verification to message players and create trials.
              </Text>
              <Text style={styles.verifyBannerCta}>Complete</Text>
            </Pressable>
          )
        )}

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          <QuickAction icon="search" label="Find Players" onPress={() => router.push('/(scout-tabs)/players')} />
          <QuickAction
            icon="plus-circle"
            label="Create Trial"
            disabled={!scoutVerified}
            onPress={() => router.push('/(scout-tabs)/trials')}
          />
          <QuickAction icon="heart" label="Saved Players" onPress={() => router.push('/(scout-tabs)/players?saved=1')} />
          <QuickAction icon="clipboard" label="Applications" onPress={() => router.push('/(scout-tabs)/trials')} />
        </View>

        {/* Scouting overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Scouting Overview</Text>
          <View style={[styles.overviewRow, elevation('raised', isDark)]}>
            {[
              { label: 'Views', val: overview?.views ?? 0 },
              { label: 'Saved', val: overview?.saved ?? 0 },
              { label: 'Contacted', val: overview?.contacted ?? 0 },
              { label: 'Trials', val: overview?.trials ?? 0 },
            ].map((s) => (
              <View key={s.label} style={styles.overviewTile}>
                <Text style={styles.overviewVal}>{s.val}</Text>
                <Text style={styles.overviewLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recommended for you */}
        <View style={styles.section}>
          <SectionHeader title="Recommended For You" onSeeAll={() => router.push('/(scout-tabs)/players')} />
          {!recommended?.length ? (
            <Text style={styles.emptyText}>No recommendations yet — set your Scouting Preferences.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
              {recommended.map((r) => (
                <ScoutPlayerCard
                  key={r.player.id}
                  id={r.player.id ?? ''}
                  name={r.player.full_name || 'Unnamed player'}
                  avatar={r.player.avatar_url ?? images.avatarMale}
                  overall={r.player.overall_rating}
                  position={r.player.primary_position}
                  country={r.player.nationality_name}
                  age={r.player.age}
                  topAttributes={r.attrs}
                  anyLowConfidence={r.anyLowConfidence}
                  matchReasons={r.reasons.length ? r.reasons : undefined}
                  saved={r.saved}
                  onToggleSave={() => toggleSave(r.player.id ?? '', r.saved)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recently uploaded */}
        <View style={styles.section}>
          <SectionHeader title="Recently Uploaded" onSeeAll={() => router.push('/(scout-tabs)/players')} />
          {!recentUploads?.length ? (
            <Text style={styles.emptyText}>No uploads yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
              {recentUploads.map((v) => (
                <Pressable key={v.id} style={[styles.uploadCard, elevation('raised', isDark)]} onPress={() => router.push({ pathname: '/player/[id]', params: { id: v.player_id } })}>
                  {uploadThumbs?.[v.id] ? (
                    <Image source={{ uri: uploadThumbs[v.id] }} style={styles.uploadThumb} contentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
        />
                  ) : (
                    <View style={[styles.uploadThumb, styles.uploadThumbPlaceholder]}>
                      <Feather name="film" size={20} color={colors.textPlaceholder} />
                    </View>
                  )}
                  <View style={styles.uploadPlay}>
                    <Feather name="play" size={14} color={colors.white} />
                  </View>
                  <Text style={styles.uploadName}>{v.players?.profiles?.full_name || 'Player'}</Text>
                  <Text style={styles.uploadMeta}>{v.players?.primary_position ?? '—'}</Text>
                  <Text style={styles.uploadOvr}>{v.players?.overall_rating ?? '—'} OVR</Text>
                  <Text style={styles.uploadType}>{v.title || 'Highlight'}</Text>
                  <Text style={styles.uploadTime}>{new Date(v.created_at).toLocaleDateString()}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Top performers */}
        <View style={styles.section}>
          <SectionHeader title="Top Performers" onSeeAll={() => router.push('/(scout-tabs)/players')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
            {TOP_FILTERS.map((f) => {
              const active = topFilter === f;
              return (
                <Pressable key={f} style={[styles.chip, active && styles.chipActive]} onPress={() => setTopFilter(f)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={[styles.leaderboard, elevation('raised', isDark)]}>
            {!topPerformers?.length ? (
              <Text style={[styles.emptyText, { padding: 14 }]}>
                {topFilter === 'My Region' && !scout?.country_code
                  ? 'Set your country in Edit Profile to filter by region.'
                  : 'No players match this filter.'}
              </Text>
            ) : (
              topPerformers.slice(0, 4).map((p, i) => (
                <Pressable key={p.id} style={styles.leaderRow} onPress={() => router.push({ pathname: '/player/[id]', params: { id: p.id ?? '' } })}>
                  <Text style={styles.leaderRank}>{i + 1}</Text>
                  <Image source={{ uri: p.avatar_url ?? images.avatarMale }} style={styles.leaderAvatar}
          cachePolicy="memory-disk"
          transition={200}
        />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaderName}>{p.full_name || 'Unnamed player'}</Text>
                    <Text style={styles.leaderMeta}>{p.primary_position ?? '—'} · {p.nationality_name ?? '—'}</Text>
                  </View>
                  <Text style={styles.leaderOvr}>{p.overall_rating ?? '—'} OVR</Text>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Active trials */}
        <View style={[styles.section, { paddingBottom: 32 }]}>
          <SectionHeader title="Active Trials" onSeeAll={() => router.push('/(scout-tabs)/trials')} />
          {!overview?.openTrials.length ? (
            <Text style={styles.emptyText}>No active trials.</Text>
          ) : (
            overview.openTrials.map((trial) => (
              <View key={trial.id} style={styles.trialCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trialTitle}>{trial.title}</Text>
                  <Text style={styles.trialMeta}>{trial.location}</Text>
                  <Text style={styles.trialMeta}>{applicantCounts?.[trial.id] ?? 0} Applicants · Deadline {trial.application_deadline}</Text>
                </View>
                <Pressable style={styles.manageBtn} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
                  <Text style={styles.manageBtnText}>Manage</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      </QueryState>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onSeeAll}>
        <Text style={styles.seeAll}>See All</Text>
      </Pressable>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={[styles.quickAction, elevation('raised', isDark), disabled && { opacity: 0.5 }]}
      onPress={disabled ? undefined : onPress}
    >
      <View style={styles.quickIcon}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  orgName: { flexShrink: 1, fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.title, color: colors.white },
  headerDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  headerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 12,
    marginTop: 14,
  },
  headerSearchText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: 'rgba(255,255,255,0.6)' },
  counters: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginTop: -28 },
  premium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 11,
    padding: 11,
    borderRadius: radii.lg,
    backgroundColor: '#3E2A0A',
  },
  premiumTitle: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodyLg, color: colors.white },
  premiumSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.55)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  bellBtn: { width: 38, height: 38, borderRadius: radii.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningTint, marginHorizontal: 20, borderRadius: radii.md, padding: 12, marginBottom: 14 },
  verifyBannerRejected: { backgroundColor: colors.dangerTint },
  verifyBannerText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.goldDark },
  verifyBannerCta: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: colors.goldDark },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  quickAction: { width: '47.5%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radii.lg, padding: 12 },
  quickIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.infoTint, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary, flexShrink: 1 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  seeAll: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.primary },
  emptyText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  overviewRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16 },
  overviewTile: { flex: 1, alignItems: 'center' },
  overviewVal: { fontFamily: fontFamily.extraBold, fontSize: fontSize.headingLg, color: colors.textPrimary },
  overviewLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  uploadCard: { width: 160, backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', paddingBottom: 10 },
  uploadThumb: { width: '100%', height: 110 },
  uploadThumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  uploadPlay: { position: 'absolute', top: 40, left: 66, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  uploadName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 8, marginHorizontal: 10 },
  uploadMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginHorizontal: 10, marginTop: 1 },
  uploadOvr: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: colors.primary, marginHorizontal: 10, marginTop: 4 },
  uploadType: { fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: colors.textMuted, marginHorizontal: 10, marginTop: 4 },
  uploadTime: { fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: colors.textPlaceholder, marginHorizontal: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  chipTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  leaderboard: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  leaderRank: { width: 18, fontFamily: fontFamily.bold, fontSize: fontSize.body, color: colors.textMuted },
  leaderAvatar: { width: 36, height: 36, borderRadius: 18 },
  leaderName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  leaderMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  leaderOvr: { fontFamily: fontFamily.bold, fontSize: fontSize.bodySm, color: colors.primary },
  trialCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, marginBottom: 10, gap: 12 },
  trialTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
  trialMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  manageBtn: { backgroundColor: colors.infoTint, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 9 },
  manageBtnText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
  });
}
