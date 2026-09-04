import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontFamilyDisplay, fontSize, kicker, radii, spacing, useThemeColors, useIsDark, elevation } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as profileRepository from '../../src/repositories/profileRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import * as notificationsRepository from '../../src/repositories/notificationsRepository';
import * as communityRepository from '../../src/repositories/communityRepository';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonHome } from '../../src/components/Skeleton';
import { FirstWinCard } from '../../src/components/FirstWinCard';
import { PlayerRatingCard } from '../../src/components/PlayerRatingCard';
import { NewsPopup } from '../../src/components/NewsPopup';
import { timeAgo, daysUntil } from '../../src/lib/time';
import Animated from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Logo } from '../../src/components/Logo';
import { Kicker } from '../../src/components/Kicker';
import { usePulse, useSheen } from '../../src/lib/motion';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Home, following the design canvas (Matobev.dc.html screen 10): a navy
// header carrying the greeting, with the rating card lifted to overlap its
// lower edge, then a week summary and the trials/activity sections.
//
// TWO THINGS THE CANVAS ASKS FOR THAT ARE NOT HERE.
//
// A streak counter ("4" beside a flame in the header). Nothing in this
// database records consecutive days of activity, so the number would have to
// be invented. Left out rather than faked -- it can ship the day something
// actually counts days.
//
// (The radial gold glow behind the header used to be listed here too, as
// unbuildable -- expo-linear-gradient is linear only. It is now drawn properly
// with react-native-svg's RadialGradient, at the canvas's own 85% 0% origin
// and 58% falloff, so only the streak remains outstanding.)

export default function Home() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);
  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['playerHome', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profile, player, attributes] = await Promise.all([
        profileRepository.getMyProfile(userId!),
        profileRepository.getMyPlayer(userId!),
        profileRepository.getMyPlayer(userId!).then((p) => profileRepository.getPlayerAttributes(userId!, !!p.is_goalkeeper)),
      ]);
      return { profile, player, attributes };
    },
  });

  const { data: trialsPage } = useQuery({
    queryKey: ['openTrialsPreview'],
    // Only ever asks for the 8 rows this preview actually shows -- previously
    // fetched every open trial on the platform just to display 8.
    queryFn: () => trialsRepository.listOpenTrials({ pageSize: 8 }),
  });
  const trials = trialsPage?.items;

  const { data: unreadCount } = useQuery({
    queryKey: ['playerUnreadNotifications', userId],
    enabled: !!userId,
    queryFn: () => notificationsRepository.getUnreadCount(userId!),
  });

  // The three numbers behind the "This week" strip. Each is read from a real
  // table, and each is nullable because null means "we do not know" -- on a
  // screen whose job is to tell a young player whether they are getting
  // anywhere, "no improvement" and "no history yet" are opposite messages.
  const { data: week } = useQuery({
    queryKey: ['playerWeekSummary', userId],
    enabled: !!userId,
    queryFn: () => communityRepository.getWeekSummary(userId!),
  });

  const { data: latestView } = useQuery({
    queryKey: ['playerLatestProfileView', userId],
    enabled: !!userId,
    queryFn: () => notificationsRepository.getLatestProfileView(userId!),
  });

  const { data: recentNotificationsPage } = useQuery({
    queryKey: ['playerRecentNotifications', userId],
    enabled: !!userId,
    // Only ever asks for the 3 rows this preview actually shows -- previously
    // fetched a user's entire notification history just to display 3, which
    // only gets slower and more wasteful as that history grows over time.
    queryFn: () => notificationsRepository.listNotifications(userId!, { pageSize: 3 }),
  });
  const recentNotifications = recentNotificationsPage?.items;

  // Canvas: the unread dot and the scout-viewed dot both pulse. Two separate
  // hooks rather than one shared style, because they are independent elements
  // and sharing a driver would visibly sync them into a single heartbeat.
  const bellPulse = usePulse();
  const viewDotPulse = usePulse(1400);
  const bannerSheen = useSheen();

  const ACTIVITY_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
    trial_status_change: 'clipboard',
    new_message: 'message-circle',
    profile_view: 'eye',
    rating_improved: 'trending-up',
    weekly_digest: 'calendar',
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NewsPopup />
      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonHome />}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.header}
        >
          {/*
            The canvas's radial gold glow, drawn as an actual radial gradient:
            `radial-gradient(circle at 85% 0%, rgba(181,217,253,.2), transparent 58%)`.
          */}
          <Svg style={styles.headerGlow} pointerEvents="none">
            <Defs>
              <RadialGradient id="homeGlow" cx="85%" cy="0%" r="58%">
                <Stop offset="0" stopColor="#b5d9fd" stopOpacity={0.2} />
                <Stop offset="1" stopColor="#b5d9fd" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeGlow)" />
          </Svg>
          <View style={styles.headerRow}>
            {/* The canvas leads the header with the gold mark at 20px. */}
            <Logo variant="gold" size={20} style={{ marginRight: 9 }} />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              {/* First name only. The rating card directly below already
                  prints the full name, so spelling it out twice cost the
                  header its space and truncated to "simeon odhiam...".
                  Shrinking the type would have been the wrong fix -- the name
                  is meant to be the largest thing up here. */}
              <Text style={styles.name} numberOfLines={1}>
                {data?.profile.full_name?.trim().split(/\s+/)[0] || 'Welcome'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <View style={{ flexDirection: 'row', gap: 4, marginRight: 8, alignItems: 'center' }}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: i < 3 ? colors.gold : '#e7e7ea' }} />
                ))}
              </View>
              <Pressable style={styles.iconBtn} onPress={() => router.push('/news')} accessibilityRole="button" accessibilityLabel="News">
                <Feather name="file-text" size={18} color={colors.white} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => router.push('/notifications')}
                accessibilityRole="button"
                accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              >
                <Feather name="bell" size={18} color={colors.white} />
                {!!unreadCount && <Animated.View style={[styles.dot, bellPulse]} />}
              </Pressable>
              <Image source={{ uri: data?.profile.avatar_url ?? images.avatarMale }} style={styles.avatar} />
            </View>
          </View>
        </LinearGradient>

        {/* Only while there is genuinely nothing to show yet. Once any
            attribute has a real value the player has been rated, and the
            rating card below is the better headline -- keeping this around
            after that would just be clutter. */}
        {data && !data.attributes.some((a) => a.value != null) && (
          <FirstWinCard primaryPosition={data.player.primary_position} />
        )}

        <View style={styles.cardLift}>
        <PlayerRatingCard
          name={data?.profile.full_name || 'Player'}
          rating={data?.player.overall_rating ?? null}
          position={data?.player.primary_position}
          countryCode={data?.player.nationality_code}
          attributes={data?.attributes ?? []}
          assessedCount={(data?.attributes ?? []).filter((a) => a.value != null).length}
          totalCount={data?.attributes.length ?? 0}
          onPressReport={() => router.push('/ai-ratings')}
        />
        </View>

        {/* The canvas captions this banner with the scouting organisation
            ("ELITE SCOUTING - 2M AGO"). That is not shown, and cannot be:
            notify_profile_view deliberately omits viewer_id from the payload
            because most players here are minors and naming the scout creates
            an unvetted contact path around the app's own messaging. "A scout"
            is the honest and safe amount of detail. */}
        {!!latestView && (
          <Pressable
            style={styles.viewBanner}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={`A scout viewed your profile ${timeAgo(latestView.created_at)}. Open notifications.`}
          >
            {/* The canvas sweeps a gold highlight across this banner. The
                parent clips it (viewBanner has overflow hidden), and the
                percentage translation is relative to the band's own width. */}
            <Animated.View style={[styles.bannerSheen, bannerSheen]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(181,217,253,0)', 'rgba(181,217,253,0.14)', 'rgba(181,217,253,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
            <View style={styles.viewBannerIcon}>
              <Feather name="eye" size={16} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.viewBannerTitle}>A scout viewed you</Text>
              <Text style={styles.viewBannerMeta}>{timeAgo(latestView.created_at)}</Text>
            </View>
            {!latestView.read_at && <Animated.View style={[styles.viewBannerDot, viewDotPulse]} />}
          </Pressable>
        )}

        <Text style={styles.weekLabel}>This week</Text>
        <View style={styles.weekStrip}>
          <WeekStat
            styles={styles}
            label="Rating"
            // rating_delta is null until a player has a snapshot from a
            // previous week. Showing 0 there would tell someone in their
            // first week that they failed to improve.
            value={
              week?.ratingDelta == null
                ? null
                : `${week.ratingDelta > 0 ? '+' : ''}${Math.round(week.ratingDelta)}`
            }
            up={(week?.ratingDelta ?? 0) > 0}
            hint={week?.ratingDelta == null ? 'No history yet' : undefined}
          />
          <WeekStat
            styles={styles}
            label="Region"
            value={week?.regionRank == null ? null : `#${week.regionRank}`}
            hint={
              week?.regionRank == null
                ? 'Needs a rating'
                : week.regionSize
                  ? `of ${week.regionSize}`
                  : undefined
            }
          />
          <WeekStat styles={styles} label="Trials" value={String(week?.trialsApplied ?? 0)} />
        </View>

        {/* Uploading is the entire point of the product, and it used to be
            one of three identical tiles. It now leads: full width, its own
            weight, with the supporting actions clearly secondary. */}
        <Pressable
          style={[styles.primaryAction, elevation('raised', isDark)]}
          onPress={() => router.push('/(player-tabs)/upload')}
          accessibilityRole="button"
          accessibilityLabel="Upload a highlight"
        >
          <View style={styles.primaryActionIcon}>
            <Feather name="upload" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryActionLabel}>Upload a highlight</Text>
            <Text style={styles.primaryActionSub}>Get rated and seen by scouts</Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.primary} />
        </Pressable>

        <View style={styles.quickActions}>
          <Pressable
            style={[styles.actionCard, elevation('raised', isDark)]}
            onPress={() => router.push('/trials')}
            accessibilityRole="button"
            accessibilityLabel="Browse trials"
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.warningTint }]}>
              <Feather name="award" size={18} color={colors.goldDark} />
            </View>
            <Text style={styles.actionLabel}>Trials</Text>
          </Pressable>
          <Pressable
            style={[styles.actionCard, elevation('raised', isDark)]}
            onPress={() => router.push('/messages')}
            accessibilityRole="button"
            accessibilityLabel="Messages"
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.successTint }]}>
              <Feather name="message-circle" size={18} color={colors.success} />
            </View>
            <Text style={styles.actionLabel}>Messages</Text>
          </Pressable>
          <Pressable
            style={[styles.actionCard, elevation('raised', isDark)]}
            onPress={() => router.push('/leaderboard')}
            accessibilityRole="button"
            accessibilityLabel="Leaderboard"
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.infoTint }]}>
              <Feather name="bar-chart-2" size={18} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Ranking</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Nearby trials for you</Text>
            <Pressable onPress={() => router.push('/trials')}>
              <Text style={styles.sectionLink}>See all</Text>
            </Pressable>
          </View>
          {/*
            Canvas 10 (28 Aug) replaced the horizontal card rail here with a
            stacked row: club and title on one line, "RB WANTED · CLOSES 9D"
            beneath, and an APPLY affordance on the right.

            "Nearby" is the canvas's word and is kept as a section heading
            rather than as a claim about distance -- `trials.location` is free
            text with no coordinates, so nothing here is actually sorted by
            proximity. The heading names the intent; the rows state only what
            the row knows.
          */}
          {!trials?.length && (
            <Text style={{ fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted }}>
              No open trials right now.
            </Text>
          )}
          {(trials ?? []).slice(0, 2).map((trial) => {
            const days = daysUntil(trial.application_deadline);
            const wanted = trial.positions?.length ? `${trial.positions.join('/')} wanted` : null;
            return (
              <Pressable
                key={trial.id}
                style={[styles.trialRow, elevation('raised', isDark)]}
                onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${trial.title}${wanted ? `, ${wanted}` : ''}${days != null ? `, closes in ${days} days` : ''}`}
              >
                <View style={styles.trialRowIcon}>
                  <Feather name="clipboard" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trialRowTitle} numberOfLines={1}>
                    {[trial.title, trial.club].filter(Boolean).join(' · ')}
                  </Text>
                  <Kicker size={fontSize.caption} style={{ marginTop: 2 }}>
                    {[wanted, days != null ? `closes ${days}d` : null].filter(Boolean).join(' · ')}
                  </Kicker>
                </View>
                <Text style={styles.trialApply}>APPLY</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {!recentNotifications?.length && (
            <Text style={{ fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted }}>
              Nothing yet — activity shows up here as scouts and trials interact with your profile.
            </Text>
          )}
          {(recentNotifications ?? []).slice(0, 3).map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.activityIcon}>
                <Feather name={ACTIVITY_ICON[item.type] ?? 'bell'} size={16} color={colors.primary} />
              </View>
              <Text style={styles.activityText}>{item.title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      </QueryState>
    </SafeAreaView>
  );
}

// One tile of the week strip. Split out because the null handling is the
// whole point of it and repeating that three times inline invites one of the
// three to quietly grow a `?? 0`.
function WeekStat({
  styles,
  label,
  value,
  up,
  hint,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  /** Null renders an em dash, never a zero. */
  value: string | null;
  up?: boolean;
  hint?: string;
}) {
  return (
    <View
      style={styles.weekCard}
      accessible
      accessibilityLabel={value == null ? `${label}: ${hint ?? 'not available'}` : `${label}: ${value}${hint ? `, ${hint}` : ''}`}
    >
      <Text
        style={[
          styles.weekValue,
          value == null ? styles.weekValueUnknown : up ? styles.weekValueUp : null,
        ]}
      >
        {value ?? '—'}
      </Text>
      {/* The label is what the tile is; the hint only ever stands in for it
          when there is no value, because a bare em dash with nothing under
          it is a dead end -- it has to say why. When there IS a value the
          label stays, so "#12" is never left captioned "of 240" with no
          word saying what it ranks. */}
      <Text style={styles.weekKey} numberOfLines={1}>
        {value == null ? (hint ?? label) : label}
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerText: { flex: 1, minWidth: 0, marginRight: spacing.md },
  // Deep enough that the rating card can be pulled up over its lower edge
  // without covering the greeting.
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge + spacing.xxl,
    overflow: 'hidden',
  },
  headerGlow: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // The name is the largest thing in the header and the greeting is a kicker
  // above it, rather than the two competing at similar weight.
  //
  // colors.accentOnNavy, not colors.primary: this sits on the navy gradient,
  // and in the light theme primary IS navy2 -- the gradient's own light end --
  // so the greeting was rendering navy-on-navy at about 1.4:1. The accent is
  // the canvas's on-navy caption colour and measures 6.31:1 there.
  greeting: { ...kicker, fontSize: fontSize.caption, color: colors.accentOnNavy },
  name: {
    fontFamily: fontFamilyDisplay.extraBold,
    fontSize: fontSize.hero,
    color: colors.white,
    letterSpacing: -0.4,
    marginTop: 1,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // On navy the icon buttons are translucent white rather than raised
  // surfaces -- a white tile with a drop shadow on a navy header reads as a
  // sticker sitting on top of the design instead of part of it.
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, borderWidth: 1.5, borderColor: colors.primaryDark },
  avatar: { width: 36, height: 36, borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  // Lifts the rating card over the header's lower edge, as the canvas does.
  cardLift: { marginTop: -(spacing.huge + spacing.md) },
  // Navy, because this is the one row on the screen that is about somebody
  // else being interested in the player -- the canvas gives it the same hero
  // treatment as the header for exactly that reason.
  viewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
    overflow: 'hidden',
  },
  bannerSheen: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%' },
  viewBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: 'rgba(181,217,253,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBannerTitle: { fontFamily: fontFamilyDisplay.bold, fontSize: fontSize.bodyLg, color: colors.white },
  // 6.79:1 on primaryDark.
  viewBannerMeta: { ...kicker, fontSize: fontSize.caption, color: colors.accentOnNavy, marginTop: 1 },
  viewBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  weekStrip: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  weekLabel: { ...kicker, fontSize: fontSize.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  weekCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  weekValue: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.display, color: colors.textPrimary },
  weekValueUp: { color: colors.success },
  // A value we do not have is shown as an em dash in the muted tone, never
  // as a zero. "We have no history for you yet" and "you did not improve"
  // are different things to tell a 16-year-old.
  weekValueUnknown: { color: colors.textMuted },
  weekKey: { ...kicker, fontSize: fontSize.caption, color: colors.textMuted, marginTop: 2 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C4B78E',
    backgroundColor: colors.surface,
  },
  primaryActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionLabel: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
  primaryActionSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  quickActions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.md },
  actionCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 4, padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  actionIcon: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textPrimary },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.huge },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary, letterSpacing: -0.2 },
  sectionLink: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.primary },
  trialRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 4, padding: spacing.md, marginTop: spacing.sm },
  trialRowIcon: { width: 32, height: 32, borderRadius: 4, backgroundColor: colors.infoTint, alignItems: 'center', justifyContent: 'center' },
  trialRowTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  trialApply: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.caption, letterSpacing: 1.2, color: colors.gold },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 4, padding: 12, marginBottom: 8 },
  activityIcon: { width: 32, height: 32, borderRadius: 4, backgroundColor: colors.infoTint, alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody },
  });
}
