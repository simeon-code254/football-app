import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { images } from '../../src/constants/images';
import { MOCK_TRIALS } from '../../src/data/mockTrials';

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
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>Marcus Johnson</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
              <Feather name="bell" size={18} color="#333" />
              <View style={styles.dot} />
            </Pressable>
            <Image source={{ uri: images.avatarMale }} style={styles.avatar} />
          </View>
        </View>

        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.ratingCard}>
          <View style={styles.ratingCardTop}>
            <View>
              <Text style={styles.ratingLabel}>Overall Rating</Text>
              <Text style={styles.ratingValue}>82</Text>
            </View>
            <Pressable style={styles.viewReportBtn} onPress={() => router.push('/(player-tabs)/profile')}>
              <Text style={styles.viewReportText}>View Report</Text>
              <Feather name="arrow-right" size={14} color={colors.white} />
            </Pressable>
          </View>
          <View style={styles.statRow}>
            {[
              { key: 'PAC', val: 78 },
              { key: 'SHO', val: 85 },
              { key: 'DRI', val: 90 },
            ].map((s) => (
              <View key={s.key} style={styles.statChip}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statKey}>{s.key}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.quickActions}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(player-tabs)/upload')}>
            <View style={[styles.actionIcon, { backgroundColor: '#EBF2FF' }]}>
              <Feather name="upload" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Upload Highlight</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(player-tabs)/discover')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF8E1' }]}>
              <Feather name="award" size={20} color={colors.goldDark} />
            </View>
            <Text style={styles.actionLabel}>Browse Trials</Text>
          </Pressable>
          <Pressable style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
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
            {MOCK_TRIALS.map((trial) => (
              <Pressable key={trial.id} style={styles.trialCard} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
                <View style={styles.trialDateBadge}>
                  <Text style={styles.trialDateText}>{trial.trialDate}</Text>
                </View>
                <Text style={styles.trialClub}>{trial.title}</Text>
                <Text style={styles.trialLocation}>{trial.location}</Text>
                <Text style={styles.trialSpots}>Deadline {trial.deadline}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {[
            { icon: 'eye', text: '3 scouts viewed your profile this week' },
            { icon: 'trending-up', text: 'Your Pace rating improved by +3' },
            { icon: 'message-circle', text: 'New message from Academy FC scout' },
          ].map((item, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={styles.activityIcon}>
                <Feather name={item.icon as any} size={16} color={colors.primary} />
              </View>
              <Text style={styles.activityText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  dot: { position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4444', borderWidth: 1.5, borderColor: colors.surface },
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
  trialDateBadge: { alignSelf: 'flex-start', backgroundColor: '#EBF2FF', borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 10 },
  trialDateText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.primary },
  trialClub: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  trialLocation: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  trialSpots: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.success, marginTop: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radii.md, padding: 12, marginBottom: 8 },
  activityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EBF2FF', alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody },
});
