import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { images } from '../../src/constants/images';
import { MOCK_PLAYERS } from '../../src/data/mockPlayers';
import { ScoutPlayerCard } from '../../src/components/ScoutPlayerCard';
import { useSessionStore } from '../../src/store/useSessionStore';

const TOP_FILTERS = ['All', 'My Region', 'My Positions', 'Under 18', 'Under 21'] as const;

const RECENT_UPLOADS = MOCK_PLAYERS.filter((p) => p.recentlyActive).map((p) => ({
  id: p.id,
  player: p,
  type: 'Match Highlight',
  uploadedAgo: '2 hours ago',
}));

const ACTIVE_TRIALS = [
  { id: '1', title: 'U21 Winger Trial', location: 'Nairobi', applicants: 34, deadline: 'Aug 15' },
  { id: '2', title: 'Goalkeeper Recruitment', location: 'Kisumu', applicants: 12, deadline: 'Aug 21' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// The Scout Dashboard — a talent-intelligence workspace, not a social feed.
// Structure matches the full spec: header w/ verification state, global
// search, quick actions, scouting overview, Recommended (with match-reason
// explanation), Recently Uploaded, Top Performers leaderboard, Active
// Trials. Everything reads from MOCK_PLAYERS until the backend lands.
export default function ScoutDashboard() {
  const [topFilter, setTopFilter] = useState<(typeof TOP_FILTERS)[number]>('All');
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const topPerformers = [...MOCK_PLAYERS].sort((a, b) => b.overall - a.overall);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={{ uri: images.avatarMale }} style={styles.avatar} />
            <View>
              <Text style={styles.greeting}>{getGreeting()}, Simeon</Text>
              {scoutVerified ? (
                <View style={styles.verifiedRow}>
                  <Feather name="check-circle" size={12} color={colors.success} />
                  <Text style={styles.verifiedText}>Verified Scout</Text>
                </View>
              ) : (
                <Text style={styles.pendingText}>Verification Pending</Text>
              )}
            </View>
          </View>
          <Pressable style={styles.bellBtn}>
            <Feather name="bell" size={18} color="#333" />
            <View style={styles.bellDot}>
              <Text style={styles.bellDotText}>3</Text>
            </View>
          </Pressable>
        </View>

        {!scoutVerified && (
          <Pressable style={styles.verifyBanner} onPress={() => router.push('/scout-verification')}>
            <Feather name="alert-circle" size={16} color={colors.goldDark} />
            <Text style={styles.verifyBannerText}>
              Complete verification to message players and create trials.
            </Text>
            <Text style={styles.verifyBannerCta}>Complete</Text>
          </Pressable>
        )}

        {/* Global search */}
        <Pressable style={styles.searchBar} onPress={() => router.push('/(scout-tabs)/players')}>
          <Feather name="search" size={16} color={colors.textPlaceholder} />
          <Text style={styles.searchPlaceholder}>Search players, positions, clubs...</Text>
        </Pressable>

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          <QuickAction icon="search" label="Find Players" onPress={() => router.push('/(scout-tabs)/players')} />
          <QuickAction
            icon="plus-circle"
            label="Create Trial"
            disabled={!scoutVerified}
            onPress={() => router.push('/(scout-tabs)/trials')}
          />
          <QuickAction icon="heart" label="Saved Players" onPress={() => router.push('/(scout-tabs)/players')} />
          <QuickAction icon="clipboard" label="Applications" onPress={() => router.push('/(scout-tabs)/trials')} />
        </View>

        {/* Scouting overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Scouting Overview</Text>
          <View style={styles.overviewRow}>
            {[
              { label: 'Views', val: 126 },
              { label: 'Saved', val: 34 },
              { label: 'Contacted', val: 12 },
              { label: 'Trials', val: 5 },
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
            {MOCK_PLAYERS.slice(0, 4).map((p, i) => (
              <ScoutPlayerCard key={p.id} player={p} showMatchReason={i === 0} />
            ))}
          </ScrollView>
        </View>

        {/* Recently uploaded */}
        <View style={styles.section}>
          <SectionHeader title="Recently Uploaded" onSeeAll={() => router.push('/(scout-tabs)/players')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
            {RECENT_UPLOADS.map((u) => (
              <Pressable key={u.id} style={styles.uploadCard} onPress={() => router.push({ pathname: '/player/[id]', params: { id: u.player.id } })}>
                <Image source={{ uri: u.player.avatar }} style={styles.uploadThumb} />
                <View style={styles.uploadPlay}>
                  <Feather name="play" size={14} color={colors.white} />
                </View>
                <Text style={styles.uploadName}>{u.player.name}</Text>
                <Text style={styles.uploadMeta}>
                  {u.player.position} · {u.player.flag} {u.player.country}
                </Text>
                <Text style={styles.uploadOvr}>{u.player.overall} OVR</Text>
                <Text style={styles.uploadType}>{u.type}</Text>
                <Text style={styles.uploadTime}>{u.uploadedAgo}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Top performers */}
        <View style={styles.section}>
          <SectionHeader title="Top Performers This Week" onSeeAll={() => router.push('/(scout-tabs)/players')} />
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
          <View style={styles.leaderboard}>
            {topPerformers.slice(0, 4).map((p, i) => (
              <Pressable key={p.id} style={styles.leaderRow} onPress={() => router.push({ pathname: '/player/[id]', params: { id: p.id } })}>
                <Text style={styles.leaderRank}>{i + 1}</Text>
                <Image source={{ uri: p.avatar }} style={styles.leaderAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaderName}>{p.name}</Text>
                  <Text style={styles.leaderMeta}>{p.position} · {p.flag} {p.country}</Text>
                </View>
                <Text style={styles.leaderOvr}>{p.overall} OVR</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Active trials */}
        <View style={[styles.section, { paddingBottom: 32 }]}>
          <SectionHeader title="Active Trials" onSeeAll={() => router.push('/(scout-tabs)/trials')} />
          {ACTIVE_TRIALS.map((trial) => (
            <View key={trial.id} style={styles.trialCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trialTitle}>{trial.title}</Text>
                <Text style={styles.trialMeta}>{trial.location}</Text>
                <Text style={styles.trialMeta}>{trial.applicants} Applicants · Deadline {trial.deadline}</Text>
              </View>
              <Pressable style={styles.manageBtn} onPress={() => router.push('/(scout-tabs)/trials')}>
                <Text style={styles.manageBtnText}>Manage</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
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
  return (
    <Pressable style={[styles.quickAction, disabled && { opacity: 0.5 }]} onPress={disabled ? undefined : onPress}>
      <View style={styles.quickIcon}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  greeting: { fontFamily: fontFamily.bold, fontSize: fontSize.heading, color: colors.textPrimary },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  verifiedText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.success },
  pendingText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.goldDark, marginTop: 2 },
  bellBtn: { width: 38, height: 38, borderRadius: radii.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  bellDot: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.surface },
  bellDotText: { fontFamily: fontFamily.bold, fontSize: 9, color: colors.white },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E1', marginHorizontal: 20, borderRadius: radii.md, padding: 12, marginBottom: 14 },
  verifyBannerText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: '#7A5C00' },
  verifyBannerCta: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: colors.goldDark },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, height: 46, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: 14, marginBottom: 16 },
  searchPlaceholder: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPlaceholder },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  quickAction: { width: '47.5%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radii.lg, padding: 12 },
  quickIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EBF2FF', alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary, flexShrink: 1 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  seeAll: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.primary },
  overviewRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16 },
  overviewTile: { flex: 1, alignItems: 'center' },
  overviewVal: { fontFamily: fontFamily.extraBold, fontSize: fontSize.headingLg, color: colors.textPrimary },
  overviewLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  uploadCard: { width: 160, backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', paddingBottom: 10 },
  uploadThumb: { width: '100%', height: 110 },
  uploadPlay: { position: 'absolute', top: 40, left: 66, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  uploadName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 8, marginHorizontal: 10 },
  uploadMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginHorizontal: 10, marginTop: 1 },
  uploadOvr: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: colors.primary, marginHorizontal: 10, marginTop: 4 },
  uploadType: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted, marginHorizontal: 10, marginTop: 4 },
  uploadTime: { fontFamily: fontFamily.regular, fontSize: 10, color: colors.textPlaceholder, marginHorizontal: 10 },
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
  manageBtn: { backgroundColor: '#EBF2FF', borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 9 },
  manageBtnText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
});
