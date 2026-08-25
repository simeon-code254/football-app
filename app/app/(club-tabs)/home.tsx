import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
  useIsDark,
  elevation,
} from '../../src/theme';
import { Logo } from '../../src/components/Logo';
import { Kicker } from '../../src/components/Kicker';
import { RatingChip } from '../../src/components/RatingChip';
import { InitialsAvatar } from '../../src/components/InitialsAvatar';
import { Button } from '../../src/components/Button';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonScoutHome } from '../../src/components/Skeleton';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as clubsRepository from '../../src/repositories/clubsRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';

// Canvas screens 27 CLUB HOME and 50 CLUB DASHBOARD -- the same screen drawn
// twice in the deck, so it is built once.
//
//   navy2->navy header: crest tile, name, "CLUB VERIFIED · KPL", gold mark
//   three counters: APPLICANTS (gold) / OPEN TRIALS / SCOUTS
//   an alert card: "12 new applicants today"
//   SHORTLIST list
//   [+ Post a trial]
//
// -- EVERY NUMBER HERE IS COUNTED, NOT ASSUMED --
//
// The canvas shows 142 / 3 / 5. Each is read from a real table: applicants from
// trial_applications across this club's trials, trials from trials.club_id, and
// scouts from club_members. Where a count cannot be read the tile shows an em
// dash, because a club making a recruitment decision on a fabricated number is
// a worse failure than a blank tile.
export default function ClubHome() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const clubId = useSessionStore((s) => s.session?.user.id);
  const club = useSessionStore((s) => s.club);

  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['clubHome', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const [trialsPage, seats] = await Promise.all([
        trialsRepository.listMyTrials(clubId!, { pageSize: 20 }),
        clubsRepository.countActiveSeats(clubId!),
      ]);
      const trials = trialsPage.items;
      const counts = await trialsRepository.getApplicantCounts(trials.map((t) => t.id));
      const applicants = Object.values(counts).reduce((a, b) => a + b, 0);
      return { trials, seats, counts, applicants };
    },
  });

  const openTrials = (data?.trials ?? []).filter((t) => t.status === 'open');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeleton={<SkeletonScoutHome />}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <View style={styles.crest}>
                <Text style={styles.crestText}>{initials(club?.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clubName} numberOfLines={1}>
                  {club?.name || 'Your club'}
                </Text>
                <View style={styles.verifiedRow}>
                  {club?.verification_status === 'verified' ? (
                    <>
                      <Feather name="star" size={9} color={colors.accentOnNavy} />
                      <Kicker size={fontSize.caption} tone="onNavy">
                        {['Club verified', club?.league].filter(Boolean).join(' · ')}
                      </Kicker>
                    </>
                  ) : (
                    // Unverified is stated plainly rather than left blank: the
                    // badge is the thing that unlocks seeing minors, so a club
                    // that has not earned it should know why it sees less.
                    <Kicker size={fontSize.caption} tone="onNavy">
                      Verification pending
                    </Kicker>
                  )}
                </View>
              </View>
              <Logo variant="gold" size={20} />
            </View>

            <View style={styles.counters}>
              <Counter styles={styles} value={data?.applicants ?? null} label="Applicants" gold />
              <Counter styles={styles} value={openTrials.length} label="Open trials" />
              <Counter styles={styles} value={data?.seats ?? null} label="Scouts" />
            </View>
          </LinearGradient>

          <View style={styles.body}>
            {openTrials.length > 0 && (
              <Pressable
                style={[styles.alertCard, elevation('raised', isDark)]}
                onPress={() =>
                  router.push({
                    pathname: '/club-applicants/[trialId]',
                    params: { trialId: openTrials[0].id },
                  })
                }
                accessibilityRole="button"
              >
                <View style={styles.alertIcon}>
                  <Feather name="check-circle" size={16} color={colors.goldDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>
                    {data?.counts[openTrials[0].id] ?? 0} applicants
                  </Text>
                  <Kicker size={fontSize.caption}>{openTrials[0].title}</Kicker>
                </View>
                <Feather name="chevron-right" size={14} color={colors.primary} />
              </Pressable>
            )}

            <View style={styles.sectionRow}>
              <Kicker>Open trials</Kicker>
              <Pressable onPress={() => router.push('/(club-tabs)/trials')} hitSlop={8}>
                <Kicker style={{ color: colors.primary }}>View all</Kicker>
              </Pressable>
            </View>

            <View style={styles.list}>
              {openTrials.slice(0, 4).map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.trialRow}
                  onPress={() =>
                    router.push({ pathname: '/club-applicants/[trialId]', params: { trialId: t.id } })
                  }
                >
                  <InitialsAvatar name={t.title} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trialTitle} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Kicker size={fontSize.caption}>
                      {(data?.counts[t.id] ?? 0) + ' applicants'}
                    </Kicker>
                  </View>
                  <View style={styles.livePill}>
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                </Pressable>
              ))}
              {openTrials.length === 0 && (
                <Text style={styles.empty}>
                  No open trials. Post one and applicants appear here.
                </Text>
              )}
            </View>

            <Button
              label="+ Post a trial"
              variant="navy"
              onPress={() => router.push('/trial-post')}
              style={styles.cta}
            />
          </View>
        </ScrollView>
      </QueryState>
    </SafeAreaView>
  );
}

function Counter({
  styles,
  value,
  label,
  gold,
}: {
  styles: ReturnType<typeof makeStyles>;
  value: number | null;
  label: string;
  gold?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.counterValue, gold && styles.counterValueGold]}>
        {value == null ? '—' : value}
      </Text>
      <Kicker size={fontSize.caption} style={styles.counterLabel}>
        {label}
      </Kicker>
    </View>
  );
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase();
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: cx(16), paddingTop: cx(20), paddingBottom: cx(44) },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    crest: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    crestText: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodySm,
      color: colors.primaryDark,
    },
    clubName: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.title,
      color: colors.white,
    },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    counters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    counterValue: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.displayLg,
      color: colors.white,
    },
    counterValueGold: { color: colors.gold },
    counterLabel: { color: 'rgba(255,255,255,0.55)' },
    body: { paddingHorizontal: cx(16), marginTop: -cx(30) },
    alertCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    alertIcon: {
      width: 34,
      height: 34,
      borderRadius: radii.sm,
      backgroundColor: colors.warningTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertTitle: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    list: { gap: spacing.sm },
    trialRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    trialTitle: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    livePill: {
      backgroundColor: colors.successTint,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    liveText: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.caption,
      color: colors.success,
    },
    empty: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      paddingVertical: spacing.lg,
    },
    cta: { marginTop: spacing.lg, marginBottom: spacing.xxl },
  });
}
