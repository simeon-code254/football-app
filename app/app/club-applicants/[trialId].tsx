import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../../src/theme';
import { Kicker } from '../../src/components/Kicker';
import { RatingChip } from '../../src/components/RatingChip';
import { InitialsAvatar } from '../../src/components/InitialsAvatar';
import { SegmentedTabs } from '../../src/components/SegmentedTabs';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonRow } from '../../src/components/Skeleton';
import * as trialsRepository from '../../src/repositories/trialsRepository';

// Canvas screen 51 CLUB APPLICANTS.
//
//   "Applicants"                                            142
//   U19 OPEN TRIAL · CLOSES IN 9 DAYS
//   [NEW · 12] [SHORTLIST] [PASSED]
//   rows: name / "RB · 17 · 2 CLIPS · GUARDIAN OK" / rating
//   the last row dimmed: "ST · 20 · OUTSIDE AGE RANGE" with an em dash rating
//
// -- THE DIMMED ROW IS A FEATURE --
//
// The canvas greys an applicant who falls outside the trial's age range and
// shows no rating for them. That is worth reproducing exactly: the club still
// sees that the person applied (hiding them would look like a bug and would
// lose a real application), but the row states why it is not a candidate. An
// out-of-range applicant is a fact about the trial's own rules, not a judgement
// of the player, so it is neutral grey rather than a danger colour.
const TABS = [
  { key: 'new', label: 'New' },
  { key: 'shortlisted', label: 'Shortlist' },
  { key: 'rejected', label: 'Passed' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function ClubApplicants() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { trialId } = useLocalSearchParams<{ trialId?: string }>();
  const [tab, setTab] = useState<TabKey>('new');

  const { data: trial } = useQuery({
    queryKey: ['trial', trialId],
    enabled: !!trialId,
    queryFn: () => trialsRepository.getTrialById(trialId!),
  });

  const { data: counts } = useQuery({
    queryKey: ['applicantStatusCounts', trialId],
    enabled: !!trialId,
    queryFn: () => trialsRepository.getApplicantStatusCounts(trialId!),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['applicants', trialId, tab],
    enabled: !!trialId,
    queryFn: () =>
      trialsRepository.listApplicants(trialId!, {
        status: tab === 'new' ? 'pending' : tab,
        pageSize: 50,
      }),
  });

  const applicants = data?.items ?? [];
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Applicants</Text>
        <Text style={styles.total}>{total ?? '—'}</Text>
      </View>
      <Kicker style={styles.trialLine}>
        {[trial?.title, trial?.application_deadline ? `closes ${trial.application_deadline}` : null]
          .filter(Boolean)
          .join(' · ')}
      </Kicker>

      <View style={styles.tabs}>
        <SegmentedTabs
          tabs={TABS.map((t) => ({
            ...t,
            count:
              t.key === 'new' ? counts?.pending ?? null : counts?.[t.key] ?? null,
          }))}
          value={tab}
          onChange={setTab}
        />
      </View>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeleton={<SkeletonRow count={4} />}
        isEmpty={!applicants.length}
        emptyIcon="users"
        emptyMessage="Nobody in this list yet."
      >
        <FlashList
          data={applicants}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => {
            const p = item.players;
            const age = ageFrom(p?.date_of_birth ?? null);
            // The trial's own age window decides this, not a guess.
            const outOfRange =
              age != null &&
              ((trial?.age_min != null && age < trial.age_min) ||
                (trial?.age_max != null && age > trial.age_max));

            return (
              <Pressable
                style={[styles.row, outOfRange && styles.rowMuted]}
                onPress={() =>
                  router.push({
                    pathname: '/applicant/[applicationId]',
                    params: { applicationId: item.id, trialId: trialId ?? '' },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={
                  (p?.profiles?.full_name ?? 'Applicant') +
                  (outOfRange ? ', outside the age range for this trial' : '')
                }
              >
                <InitialsAvatar
                  name={p?.profiles?.full_name}
                  uri={p?.profiles?.avatar_url}
                  size={34}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {p?.profiles?.full_name ?? 'Applicant'}
                  </Text>
                  <Kicker size={fontSize.caption}>
                    {outOfRange
                      ? [p?.primary_position, age, 'outside age range'].filter(Boolean).join(' · ')
                      : [p?.primary_position, age].filter(Boolean).join(' · ')}
                  </Kicker>
                </View>
                {/* No rating shown for an out-of-range applicant: it is not a
                    comparable candidate, and a number invites comparison. */}
                {outOfRange ? (
                  <Text style={styles.dash}>—</Text>
                ) : (
                  <RatingChip value={p?.overall_rating ?? null} size="sm" />
                )}
              </Pressable>
            );
          }}
        />
      </QueryState>
    </SafeAreaView>
  );
}

/**
 * Whole years from a date of birth. The applicant row carries date_of_birth
 * rather than a precomputed age, and the trial's window is expressed in years,
 * so the comparison has to happen here.
 */
function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  // Not yet had this year's birthday.
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: cx(16),
    },
    title: {
      flex: 1,
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
    },
    total: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textMuted,
    },
    trialLine: { paddingHorizontal: cx(16), marginTop: 2 },
    tabs: { paddingHorizontal: cx(16), marginTop: spacing.md },
    list: { paddingHorizontal: cx(16), paddingVertical: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    rowMuted: { opacity: 0.55 },
    name: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    dash: { fontFamily: fontFamily.regular, fontSize: fontSize.bodyLg, color: colors.textMuted },
  });
}
