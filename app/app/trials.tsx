import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as trialsRepository from '../src/repositories/trialsRepository';
import { QueryState } from '../src/components/QueryState';

const SEGMENTS = ['Open Trials', 'My Applications'] as const;

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FFF8E1', text: colors.goldDark, label: 'Pending' },
  shortlisted: { bg: '#EBF2FF', text: colors.primary, label: 'Shortlisted' },
  accepted: { bg: '#F0FDF4', text: colors.success, label: 'Accepted' },
  rejected: { bg: '#FEF2F2', text: colors.error, label: 'Rejected' },
  withdrawn: { bg: colors.surfaceMuted, text: colors.textMuted, label: 'Withdrawn' },
};

// The player-side counterpart to (scout-tabs)/trials.tsx — previously there
// was no way for a player to browse or apply to a trial anywhere in the app.
// Reachable from Home's "Trials Near You" section.
export default function PlayerTrials() {
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]>('Open Trials');
  const userId = useSessionStore((s) => s.session?.user.id);

  const { data: openTrials, isLoading: loadingOpen, error: openError, refetch: refetchOpen } = useQuery({
    queryKey: ['openTrials'],
    queryFn: trialsRepository.listOpenTrials,
  });

  const { data: myApplications, isLoading: loadingApps, error: appsError, refetch: refetchApps } = useQuery({
    queryKey: ['myApplications', userId],
    enabled: !!userId,
    queryFn: () => trialsRepository.getMyApplications(userId!),
  });

  const applicationByTrialId = new Map((myApplications ?? []).map((a) => [a.trial_id, a]));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Trials</Text>
        <View style={{ width: 36 }} />
      </View>

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

      {segment === 'Open Trials' ? (
        <QueryState
          isLoading={loadingOpen}
          error={openError}
          onRetry={refetchOpen}
          isEmpty={!openTrials?.length}
          emptyIcon="calendar"
          emptyMessage="No open trials right now."
        >
          <FlatList
            data={openTrials ?? []}
            keyExtractor={(trial) => trial.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            windowSize={7}
            renderItem={({ item: trial }) => {
              const mine = applicationByTrialId.get(trial.id);
              return (
                <Pressable style={styles.card} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{trial.title}</Text>
                    {mine && (
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_STYLE[mine.status]?.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: STATUS_STYLE[mine.status]?.text }]}>
                          {mine.source === 'invited' ? 'Invited' : STATUS_STYLE[mine.status]?.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta}>{trial.club} · {trial.location}</Text>
                  <Text style={styles.cardMeta}>Positions: {trial.positions.join(', ') || 'Any'} · Ages {trial.age_min ?? '—'}-{trial.age_max ?? '—'}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDeadline}>Deadline: {trial.application_deadline}</Text>
                    <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
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
          isEmpty={!myApplications?.length}
          emptyIcon="clipboard"
          emptyMessage="No applications yet. Browse open trials and apply to get started."
        >
          <FlatList
            data={myApplications ?? []}
            keyExtractor={(app) => app.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            windowSize={7}
            renderItem={({ item: app }) => {
              const trial = app.trials;
              if (!trial) return null;
              const s = STATUS_STYLE[app.status] ?? STATUS_STYLE.pending;
              return (
                <Pressable style={styles.card} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  segmentRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.pill, padding: 4, marginHorizontal: 20, marginBottom: 16 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: radii.pill, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted },
  segmentTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary, flex: 1 },
  statusBadge: { borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs },
  cardMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  cardDeadline: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
