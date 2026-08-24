import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { cx, fontFamily, fontFamilyDisplay, fontSize, radii, spacing, useThemeColors } from '../src/theme';
import { Kicker } from '../src/components/Kicker';
import { AttributeBar } from '../src/components/AttributeBar';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';
import * as videosRepository from '../src/repositories/videosRepository';
import { QueryState } from '../src/components/QueryState';
import { SkeletonProfile } from '../src/components/Skeleton';
import { RatingReveal } from '../src/components/RatingReveal';
import { RatingHistory } from '../src/components/RatingHistory';
import Animated from 'react-native-reanimated';
import { useSpin, useSheen } from '../src/lib/motion';
import * as communityRepository from '../src/repositories/communityRepository';

// Canvas barGrow: each attribute bar fills from zero rather than appearing
// already full. Split into its own component because useBarGrow is a hook and
// these are rendered in a .map -- calling it inside the loop body would break
// the rules of hooks the moment the attribute list changes length.
// Key holds the last job id whose reveal was shown, so it fires once.
const SEEN_REVEAL_KEY = 'matobev-last-rating-reveal-job';

// result_summary is a free-form jsonb column written by the AI pipeline --
// recommendations is rule-based text derived from real computed metrics
// (see ai-service/src/pipeline/attributes.py), never fabricated.
type ResultSummary = { recommendations?: string[] };

const JOB_STATUS_COPY: Record<string, { icon: React.ComponentProps<typeof Feather>['name']; text: string }> = {
  queued: { icon: 'clock', text: 'Your latest highlight is queued for analysis.' },
  processing: { icon: 'loader', text: 'Analyzing your latest highlight…' },
};

// A real, deep-linkable destination for "your AI ratings" -- previously
// every entry point (the post-upload alert, an analysis-complete
// notification, Home's "View Report" button) just dumped the user on
// Profile's "AI Ratings" tab, which meant losing whatever screen they were
// actually on to get there. Reused as the AI Ratings tab's own destination
// too, so there's exactly one place this data is rendered.
export default function AiRatings() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  // 1.2s rather than the canvas's 4s: this one signals live work, and at 4s
  // a loader reads as stalled rather than busy.
  const spin = useSpin(1200);

  const userId = useSessionStore((s) => s.session?.user.id);

  const { data: history } = useQuery({
    queryKey: ['ratingHistory', userId],
    enabled: !!userId,
    queryFn: () => communityRepository.getRatingHistory(userId!),
  });

  const role = useSessionStore((s) => s.role);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aiRatingsScreen', userId],
    // Player-only screen -- _layout.tsx redirects a scout away in an
    // effect, but that runs after the first render, so this query would
    // otherwise still fire once against a `players` row that will never
    // exist for a scout account (a real 406 seen in practice, not
    // hypothetical). Gating on role here is the defense-in-depth half of
    // that fix.
    enabled: !!userId && role === 'player',
    queryFn: async () => {
      const [player, publicView] = await Promise.all([
        profileRepository.getMyPlayer(userId!),
        profileRepository.getPlayerPublicView(userId!),
      ]);
      const attributes = await profileRepository.getPlayerAttributes(userId!, !!player.is_goalkeeper);
      return { player, publicView, attributes };
    },
  });

  const { data: latestJob } = useQuery({
    queryKey: ['latestAnalysisJob', userId],
    enabled: !!userId,
    refetchInterval: (query) => (query.state.data?.status === 'processing' || query.state.data?.status === 'queued' ? 5000 : false),
    queryFn: () => videosRepository.getLatestAnalysisJob(userId!),
  });
  const jobStatusInfo = latestJob ? JOB_STATUS_COPY[latestJob.status] : undefined;
  const recommendations =
    latestJob?.status === 'completed' ? ((latestJob.result_summary as ResultSummary | null)?.recommendations ?? []) : [];

  // Celebrate a rating exactly once per analysed video. The job id is the
  // natural key -- storing the last one seen means re-opening this screen,
  // or the poll above refetching, never re-fires it. AsyncStorage rather
  // than component state so it survives an app restart too.
  const [revealJobId, setRevealJobId] = useState<string | null>(null);
  useEffect(() => {
    if (latestJob?.status !== 'completed' || !latestJob.id) return;
    let cancelled = false;
    AsyncStorage.getItem(SEEN_REVEAL_KEY).then((seen) => {
      if (!cancelled && seen !== latestJob.id) setRevealJobId(latestJob.id);
    });
    return () => {
      cancelled = true;
    };
  }, [latestJob?.id, latestJob?.status]);

  const dismissReveal = () => {
    if (latestJob?.id) AsyncStorage.setItem(SEEN_REVEAL_KEY, latestJob.id).catch(() => {});
    setRevealJobId(null);
  };

  const heroSheen = useSheen(4000); // canvas 12: sheen 4s

  const presentAttrCount = data?.attributes.filter((a) => a.value != null).length ?? 0;
  const totalAttrCount = data?.attributes.length ?? 0;
  const isProvisionalRating = presentAttrCount > 0 && presentAttrCount < totalAttrCount;
  const hasAnyRatings = presentAttrCount > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>AI Ratings</Text>
        <View style={{ width: 36 }} />
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonProfile />}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/*
            Canvas screen 12: a navy card with the overall in gold at 40px on
            the left and the position on the right, swept by the sheen. The
            provisional line sits under it -- the canvas does not draw one, but
            a rating computed from part of the attribute set is a different
            claim from a complete one.
          */}
          <View style={styles.hero}>
            <Animated.View style={[styles.heroSheen, heroSheen]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(255,197,61,0)', 'rgba(255,197,61,0.16)', 'rgba(255,197,61,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
            <View style={styles.heroRow}>
              <View>
                <Kicker size={fontSize.caption} tone="onNavy">Overall</Kicker>
                <Text style={styles.heroValue}>
                  {data?.publicView.overall_rating != null
                    ? Math.round(data.publicView.overall_rating)
                    : '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Kicker size={fontSize.caption} style={{ color: 'rgba(255,255,255,0.5)' }}>Position</Kicker>
                <Text style={styles.heroPosition}>
                  {data?.publicView.primary_position ?? '—'}
                </Text>
              </View>
            </View>
            {isProvisionalRating && (
              <Text style={styles.heroSub}>
                Provisional — {presentAttrCount} of {totalAttrCount} attributes assessed
              </Text>
            )}
          </View>

          <RatingHistory snapshots={history ?? []} />

          {jobStatusInfo && (
            <View style={styles.statusBanner}>
              {/* Canvas ringSpin. Only while genuinely processing -- a
                  spinner on a queued job would claim work is happening that
                  has not started. */}
              {latestJob?.status === 'processing' ? (
                <Animated.View style={spin}>
                  <Feather name={jobStatusInfo.icon} size={14} color={colors.goldDark} />
                </Animated.View>
              ) : (
                <Feather name={jobStatusInfo.icon} size={14} color={colors.goldDark} />
              )}
              <Text style={styles.statusBannerText}>{jobStatusInfo.text}</Text>
            </View>
          )}
          {latestJob?.status === 'failed' && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorBannerText}>
                Your last analysis didn't complete{latestJob.error ? `: ${latestJob.error}` : '.'} Try uploading again.
              </Text>
            </View>
          )}

          {hasAnyRatings && (
            <View style={styles.section}>
              <Kicker style={styles.sectionKicker}>Fifa attributes</Kicker>
              {(data?.attributes ?? []).map((attr, i) => (
                <AttributeBar
                  key={attr.key}
                  code={attr.key.slice(0, 3).toUpperCase()}
                  name={attr.displayName}
                  value={attr.value}
                  confidence={attr.confidence}
                  index={i}
                />
              ))}
            </View>
          )}

          {!!recommendations.length && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Ways to Improve</Text>
              <Text style={styles.recoSub}>Based on the movement data from your most recently analyzed highlight.</Text>
              <View style={styles.recoList}>
                {recommendations.map((line, i) => (
                  <View key={i} style={styles.recoRow}>
                    <View style={styles.recoBar} />
                    <Text style={styles.recoText}>{line}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!hasAnyRatings && (
            <View style={styles.empty}>
              <Feather name="bar-chart-2" size={26} color={colors.textPlaceholder} />
              <Text style={styles.emptyTitle}>No ratings yet</Text>
              <Text style={styles.emptySub}>Upload a highlight with AI Analysis enabled to get your first ratings.</Text>
            </View>
          )}
        </ScrollView>
      </QueryState>

      <RatingReveal
        visible={!!revealJobId && hasAnyRatings}
        rating={Math.round(data?.publicView.overall_rating ?? 0)}
        attributesAssessed={presentAttrCount}
        attributesTotal={totalAttrCount}
        position={data?.publicView.primary_position}
        lowConfidence={(data?.attributes ?? []).some((a) => a.value != null && a.confidence === 'Low')}
        onClose={dismissReveal}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  content: { padding: 20, paddingTop: 8, gap: 20, paddingBottom: 40 },

  heroSheen: { position: 'absolute', top: 0, left: '-40%', width: '50%', height: '100%' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroPosition: { fontFamily: fontFamilyDisplay.bold, fontSize: fontSize.bodyLg, color: colors.white, marginTop: 2 },
  sectionKicker: { marginBottom: spacing.md },
  hero: { borderRadius: radii.lg, paddingVertical: 18, paddingHorizontal: 20 },
  heroValue: { fontFamily: fontFamily.extraBold, fontSize: 42, color: colors.white, lineHeight: 48, marginTop: 2 },
  heroSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.78)', marginTop: 4 },

  statusBanner: { flexDirection: 'row', gap: 8, backgroundColor: colors.warningTint, borderRadius: radii.md, padding: 12, alignItems: 'center' },
  statusBannerText: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.goldDark },
  errorBanner: { flexDirection: 'row', gap: 8, backgroundColor: colors.dangerTint, borderRadius: radii.md, padding: 12, alignItems: 'flex-start' },
  errorBannerText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.error, lineHeight: 18 },

  section: { gap: 12 },
  sectionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },


  recoSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: -6 },
  recoList: { gap: 10 },
  recoRow: { flexDirection: 'row', gap: 10 },
  recoBar: { width: 2, borderRadius: 1, backgroundColor: colors.primary, marginTop: 2 },
  recoText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 19 },

  empty: { alignItems: 'center', paddingTop: 24, gap: 6 },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary, marginTop: 4 },
  emptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  });
}
