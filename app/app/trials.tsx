import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontFamilyDisplay, fontSize, radii, useThemeColors, useIsDark, elevation } from '../src/theme';
import { NoticeBox } from '../src/components/NoticeBox';
import { Kicker } from '../src/components/Kicker';
import { DeadlinePill } from '../src/components/DeadlinePill';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as trialsRepository from '../src/repositories/trialsRepository';
import * as profileRepository from '../src/repositories/profileRepository';
import { QueryState } from '../src/components/QueryState';
import { SkeletonCards } from '../src/components/Skeleton';

// Canvas 18 (28 Aug) segments this screen NEARBY / MY POSITION / SAVED.
//
// -- ONLY ONE OF THE THREE HAS DATA BEHIND IT --
//
// `trials.positions` is a real column and players carry a primary and a
// secondary position, so MY POSITION is a genuine filter and is built below.
//
// NEARBY is not: `trials.location` is free text with no coordinates anywhere in
// the schema, so "nearby" could only ever be a string comparison dressed up as
// proximity -- a player in Kisumu would be shown Nairobi trials labelled as
// near them. SAVED is not either: there is no saved/bookmark table at all.
//
// Rather than ship two tabs that quietly lie, the screen keeps its own working
// pair and adds the one the canvas contributed that the database can answer.
const SEGMENTS = ['Open Trials', 'My Position', 'My Applications'] as const;

// The player-side counterpart to (scout-tabs)/trials.tsx — previously there
// was no way for a player to browse or apply to a trial anywhere in the app.
// Reachable from Home's "Trials Near You" section.
export default function PlayerTrials() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: colors.warningTint, text: colors.goldDark, label: 'Pending' },
    shortlisted: { bg: colors.infoTint, text: colors.primary, label: 'Shortlisted' },
    accepted: { bg: colors.successTint, text: colors.success, label: 'Accepted' },
    rejected: { bg: colors.dangerTint, text: colors.error, label: 'Rejected' },
    withdrawn: { bg: colors.surfaceMuted, text: colors.textMuted, label: 'Withdrawn' },
  };
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]>('Open Trials');
  const userId = useSessionStore((s) => s.session?.user.id);

  const PAGE_SIZE = 20;
  const {
    data: openTrialsPages,
    isLoading: loadingOpen,
    error: openError,
    refetch: refetchOpen,
    fetchNextPage: fetchMoreOpenTrials,
    hasNextPage: hasMoreOpenTrials,
    isFetchingNextPage: isFetchingOpenTrials,
  } = useInfiniteQuery({
    queryKey: ['openTrials'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => trialsRepository.listOpenTrials({ page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });
  const openTrials = openTrialsPages?.pages.flatMap((p) => p.items) ?? [];

  const {
    data: myApplicationsPages,
    isLoading: loadingApps,
    error: appsError,
    refetch: refetchApps,
    fetchNextPage: fetchMoreApplications,
    hasNextPage: hasMoreApplications,
    isFetchingNextPage: isFetchingApplications,
  } = useInfiniteQuery({
    queryKey: ['myApplications', userId],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => trialsRepository.getMyApplications(userId!, { page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });
  const myApplications = myApplicationsPages?.pages.flatMap((p) => p.items) ?? [];

  // Badges the Open Trials tab with the player's own application status --
  // a separate, generously-sized fetch (not the paginated list above) since
  // an application to a trial from far back in a player's history should
  // still badge correctly even though "My Applications" itself now loads
  // incrementally.
  const { data: myApplicationsForBadges } = useQuery({
    queryKey: ['myApplicationsForBadges', userId],
    enabled: !!userId,
    queryFn: () => trialsRepository.getMyApplications(userId!, { pageSize: 200 }),
  });
  const applicationByTrialId = new Map((myApplicationsForBadges?.items ?? []).map((a) => [a.trial_id, a]));

  // The player's own positions, for the MY POSITION segment. A secondary
  // position counts: scout search already treats it as an equally legitimate
  // match (profileRepository), and a right-back who also plays centre-back
  // should see both calls.
  const { data: me } = useQuery({
    queryKey: ['myPlayer', userId],
    enabled: !!userId,
    queryFn: () => profileRepository.getMyPlayer(userId!),
  });
  const myPositions = [me?.primary_position, me?.secondary_position].filter(Boolean) as string[];
  const positionMatches = openTrials.filter(
    (t) => !t.positions?.length || t.positions.some((p) => myPositions.includes(p))
  );
  // A trial that names no positions is open to everyone, so it stays in the
  // filtered list rather than being hidden by a filter it does not answer.
  const listedTrials = segment === 'My Position' ? positionMatches : openTrials;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Trials</Text>
        <View style={{ width: 36 }} />
      </View>

      {/*
        Canvas screen 18 leads with this, above the list, in danger tint. It is
        the single most important thing on the screen: trial fraud is the known
        scam in this market, and a player who reads nothing else should read
        this. Not dismissible, and not moved below the fold.
      */}
      <NoticeBox tone="danger" icon="alert-circle" style={styles.safety}>
        <Text style={styles.safetyStrong}>Never pay to attend a trial.</Text> Report anyone who asks.
      </NoticeBox>

      <View style={styles.segmentRow}>
        {SEGMENTS.map((s) => {
          const active = segment === s;
          return (
            <Pressable key={s} style={[styles.segment, active && styles.segmentActive]} onPress={() => setSegment(s)}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s}</Text>
            </Pressable>
          );
        })}
      </View>

      {segment !== 'My Applications' ? (
        <QueryState
          isLoading={loadingOpen}
          error={openError}
          onRetry={refetchOpen} skeleton={<SkeletonCards />}
          isEmpty={!listedTrials.length}
          emptyIcon="calendar"
          emptyMessage={segment === 'My Position' ? 'No open trials for your position right now.' : 'No open trials right now.'}
        >
          <FlashList
            data={listedTrials}
            keyExtractor={(trial) => trial.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onEndReached={() => hasMoreOpenTrials && !isFetchingOpenTrials && fetchMoreOpenTrials()}
            onEndReachedThreshold={0.4}
            ListFooterComponent={isFetchingOpenTrials ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} /> : null}
            renderItem={({ item: trial }) => {
              const mine = applicationByTrialId.get(trial.id);
              return (
                <Pressable style={[styles.card, elevation('raised', isDark)]} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle} numberOfLines={2}>{trial.title}</Text>
                          <Kicker size={fontSize.caption} style={{ marginTop: 2 }}>
                            {[trial.club, trial.location].filter(Boolean).join(' · ')}
                          </Kicker>
                        </View>
                        {mine ? (
                          <View style={[styles.statusBadge, { backgroundColor: STATUS_STYLE[mine.status]?.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: STATUS_STYLE[mine.status]?.text }]}>
                              {mine.source === 'invited' ? 'Invited' : STATUS_STYLE[mine.status]?.label}
                            </Text>
                          </View>
                        ) : (
                          <DeadlinePill deadline={trial.application_deadline} />
                        )}
                      </View>
                      <View style={styles.chipRow}>
                        {(trial.positions.length ? trial.positions : ['Any']).map((pos) => (
                          <View key={pos} style={styles.posChip}>
                            <Text style={styles.posChipText}>{pos}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </QueryState>
      ) : (
        <QueryState
          isLoading={loadingApps}
          error={appsError}
          onRetry={refetchApps}
          isEmpty={!myApplications.length}
          emptyIcon="clipboard"
          emptyMessage="No applications yet. Browse open trials and apply to get started."
        >
          <FlashList
            data={myApplications}
            keyExtractor={(app) => app.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onEndReached={() => hasMoreApplications && !isFetchingApplications && fetchMoreApplications()}
            onEndReachedThreshold={0.4}
            ListFooterComponent={isFetchingApplications ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} /> : null}
            renderItem={({ item: app }) => {
              const trial = app.trials;
              if (!trial) return null;
              const s = STATUS_STYLE[app.status] ?? STATUS_STYLE.pending;
              return (
                <Pressable style={[styles.card, elevation('raised', isDark)]} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{trial.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: s.text }]}>{app.source === 'invited' ? 'Invited' : s.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>{trial.club} · {trial.location}</Text>
                  <Text style={styles.cardMeta}>{app.source === 'invited' ? 'Invited' : 'Applied'} {new Date(app.applied_at).toLocaleDateString()}</Text>
                </Pressable>
              );
            }}
          />
        </QueryState>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  segmentRow: { flexDirection: 'row', gap: 5, marginHorizontal: 20, marginBottom: 16 },
  segment: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  segmentText: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.caption, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.textMuted },
  segmentTextActive: { color: colors.gold },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 16,
  },
  safety: { marginHorizontal: 20, marginBottom: 12, backgroundColor: '#FDEDE9', borderColor: '#F4C4BA', borderRadius: 4 },
  safetyStrong: { fontFamily: fontFamily.bold, color: '#7A1F13' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  posChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  posChipText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.caption, color: colors.primaryDark },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs },
  cardMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  cardDeadline: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted },
  });
}
