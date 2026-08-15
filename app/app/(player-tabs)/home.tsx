import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, useIsDark, elevation } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as profileRepository from '../../src/repositories/profileRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import * as notificationsRepository from '../../src/repositories/notificationsRepository';
import { QueryState } from '../../src/components/QueryState';
import { FirstWinCard } from '../../src/components/FirstWinCard';
import { NewsPopup } from '../../src/components/NewsPopup';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Header matches Matobev v4.dc.html's HOME block exactly (greeting, name,
// notification bell w/ dot, avatar). The stat summary / quick actions/trials
// below use the same hard-coded PAC/SHO/DRI/OVR values the mockup's
// Profile+Reels tabs already established (78/85/90/82) — the rest of Home
// wasn't captured in the source read, so this section is a reasonable
// reconstruction in the established visual language rather than a pixel
// trace, filled out with the Trials feature from the product brief.
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

  const { data: recentNotificationsPage } = useQuery({
    queryKey: ['playerRecentNotifications', userId],
    enabled: !!userId,
    // Only ever asks for the 3 rows this preview actually shows -- previously
    // fetched a user's entire notification history just to display 3, which
    // only gets slower and more wasteful as that history grows over time.
    queryFn: () => notificationsRepository.listNotifications(userId!, { pageSize: 3 }),
  });
  const recentNotifications = recentNotificationsPage?.items;

  const ACTIVITY_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
    trial_status_change: 'clipboard',
    new_message: 'message-circle',
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NewsPopup />
      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{data?.profile.full_name || 'Welcome'}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/leaderboard')} accessibilityRole="button" accessibilityLabel="Leaderboard">
              <Feather name="bar-chart-2" size={18} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/news')} accessibilityRole="button" accessibilityLabel="News">
              <Feather name="file-text" size={18} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <Feather name="bell" size={18} color={colors.textPrimary} />
              {!!unreadCount && <View style={styles.dot} />}
            </Pressable>
            <Image source={{ uri: data?.profile.avatar_url ?? images.avatarMale }} style={styles.avatar} />
          </View>
        </View>

        {/* Only while there is genuinely nothing to show yet. Once any
            attribute has a real value the player has been rated, and the
            rating card below is the better headline -- keeping this around
            after that would just be clutter. */}
        {data && !data.attributes.some((a) => a.value != null) && (
          <FirstWinCard primaryPosition={data.player.primary_position} />
        )}

        {/* The hero. A player opens this app to see one number, so it now
            behaves like one thing rather than a card of equal parts: the
            rating dominates, the label sits under it as a caption, and the
            whole card lifts off the page instead of sitting flat in it. */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ratingCard, elevation('floating', isDark)]}
        >
          <View style={styles.ratingCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ratingValue}>{data?.player.overall_rating != null ? data.player.overall_rating : '—'}</Text>
              <Text style={styles.ratingLabel}>Overall rating</Text>
            </View>
            <Pressable style={styles.viewReportBtn} onPress={() => router.push('/ai-ratings')} accessibilityRole="button" accessibilityLabel="View full report">
              <Text style={styles.viewReportText}>Report</Text>
              <Feather name="arrow-right" size={14} color={colors.white} />
            </Pressable>
          </View>
          <View style={styles.statRow}>
            {(data?.attributes ?? []).slice(0, 3).map((attr) => (
              <View key={attr.key} style={styles.statChip}>
                <Text style={styles.statVal}>{attr.value ?? '—'}</Text>
                <Text style={styles.statKey}>{attr.displayName.slice(0, 3).toUpperCase()}</Text>
              </View>
            ))}
            {!data?.attributes.length && (
              <Text style={{ fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)' }}>
                Ratings appear once your highlights are analyzed.
              </Text>
            )}
          </View>
        </LinearGradient>

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
            <Text style={styles.sectionTitle}>Trials Near You</Text>
            <Pressable onPress={() => router.push('/trials')}>
              <Text style={styles.sectionLink}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {!trials?.length && (
              <Text style={{ fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted }}>
                No open trials right now.
              </Text>
            )}
            {(trials ?? []).slice(0, 8).map((trial) => (
              <Pressable key={trial.id} style={[styles.trialCard, elevation('raised', isDark)]} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
                <View style={styles.trialDateBadge}>
                  <Text style={styles.trialDateText}>{trial.trial_date}</Text>
                </View>
                <Text style={styles.trialClub}>{trial.title}</Text>
                <Text style={styles.trialLocation}>{trial.location}</Text>
                <Text style={styles.trialSpots}>Deadline {trial.application_deadline}</Text>
              </Pressable>
            ))}
          </ScrollView>
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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  // The name is the largest thing in the header and the greeting is a
  // caption above it, rather than the two competing at similar weight.
  greeting: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 0.3 },
  name: { fontFamily: fontFamily.extraBold, fontSize: fontSize.displayLg, color: colors.textPrimary, letterSpacing: -0.5, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  dot: { position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.notificationDot, borderWidth: 1.5, borderColor: colors.surface },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.primary },
  ratingCard: { marginHorizontal: spacing.xl, borderRadius: radii.xxl, padding: spacing.xxl, marginTop: spacing.md },
  ratingCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  // Caption UNDER the number, not above it -- the number is the headline,
  // the label only explains it.
  ratingLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.75)', marginTop: -2, letterSpacing: 0.2 },
  ratingValue: { fontFamily: fontFamily.extraBold, fontSize: 56, lineHeight: 60, color: colors.white, letterSpacing: -2 },
  viewReportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill },
  viewReportText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.white },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radii.md, paddingVertical: 10, alignItems: 'center' },
  statVal: { fontFamily: fontFamily.bold, fontSize: fontSize.heading, color: colors.white },
  statKey: { fontFamily: fontFamily.medium, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  primaryActionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionLabel: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
  primaryActionSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  quickActions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.md },
  actionCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  actionIcon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textPrimary },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.huge },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary, letterSpacing: -0.2 },
  sectionLink: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.primary },
  trialCard: { width: 190, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg },
  trialDateBadge: { alignSelf: 'flex-start', backgroundColor: colors.infoTint, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 10 },
  trialDateText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.primary },
  trialClub: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  trialLocation: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  trialSpots: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.success, marginTop: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radii.md, padding: 12, marginBottom: 8 },
  activityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.infoTint, alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody },
  });
}
