import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as profileRepository from '../../src/repositories/profileRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import * as notificationsRepository from '../../src/repositories/notificationsRepository';
import { QueryState } from '../../src/components/QueryState';
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
            <Pressable style={styles.iconBtn} onPress={() => router.push('/news')}>
              <Feather name="file-text" size={18} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
              <Feather name="bell" size={18} color={colors.textPrimary} />
              {!!unreadCount && <View style={styles.dot} />}
            </Pressable>
            <Image source={{ uri: data?.profile.avatar_url ?? images.avatarMale }} style={styles.avatar} />
          </View>
        </View>

        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.ratingCard}>
          <View style={styles.ratingCardTop}>
            <View>
              <Text style={styles.ratingLabel}>Overall Rating</Text>
              <Text style={styles.ratingValue}>{data?.player.overall_rating != null ? data.player.overall_rating : '—'}</Text>
            </View>
            <Pressable style={styles.viewReportBtn} onPress={() => router.push('/ai-ratings')}>
              <Text style={styles.viewReportText}>View Report</Text>
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

        <View style={styles.quickActions}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(player-tabs)/upload')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.infoTint }]}>
              <Feather name="upload" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Upload Highlight</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/trials')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.warningTint }]}>
              <Feather name="award" size={20} color={colors.goldDark} />
            </View>
            <Text style={styles.actionLabel}>Browse Trials</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/messages')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.successTint }]}>
              <Feather name="message-circle" size={20} color={colors.success} />
            </View>
            <Text style={styles.actionLabel}>Messages</Text>
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
              <Pressable key={trial.id} style={styles.trialCard} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
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
  greeting: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize.heading, color: colors.textPrimary },
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
  ratingCard: { marginHorizontal: 20, borderRadius: radii.xl, padding: 20, marginTop: 4 },
  ratingCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ratingLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)' },
  ratingValue: { fontFamily: fontFamily.extraBold, fontSize: 40, color: colors.white, marginTop: 2 },
  viewReportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill },
  viewReportText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.white },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radii.md, paddingVertical: 10, alignItems: 'center' },
  statVal: { fontFamily: fontFamily.bold, fontSize: fontSize.heading, color: colors.white },
  statKey: { fontFamily: fontFamily.medium, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16 },
  actionCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, alignItems: 'flex-start', gap: 10 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  sectionLink: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.primary },
  trialCard: { width: 180, backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14 },
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
