import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';
import * as videosRepository from '../src/repositories/videosRepository';
import { QueryState } from '../src/components/QueryState';

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
  const CONFIDENCE_COLOR: Record<string, string> = {
    High: colors.success,
    Medium: colors.goldDark,
    Low: colors.error,
  };
  const userId = useSessionStore((s) => s.session?.user.id);
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

      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroLabel}>OVERALL RATING</Text>
            <Text style={styles.heroValue}>{data?.publicView.overall_rating ?? '—'}</Text>
            {isProvisionalRating ? (
              <Text style={styles.heroSub}>Provisional — {presentAttrCount} of {totalAttrCount} attributes assessed</Text>
            ) : (
              <Text style={styles.heroSub}>Updates automatically as new highlights are analyzed</Text>
            )}
          </LinearGradient>

          {jobStatusInfo && (
            <View style={styles.statusBanner}>
              <Feather name={jobStatusInfo.icon} size={14} color={colors.goldDark} />
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
              <Text style={styles.sectionLabel}>Performance Attributes</Text>
              <View style={styles.attrGrid}>
                {(data?.attributes ?? []).map((attr) => (
                  <View key={attr.key} style={styles.attrCell}>
                    <View style={styles.attrTopRow}>
                      <Text style={styles.attrName} numberOfLines={1}>{attr.displayName}</Text>
                      {attr.confidence && (
                        <Text style={[styles.confText, { color: CONFIDENCE_COLOR[attr.confidence] }]}>{attr.confidence}</Text>
                      )}
                    </View>
                    <Text style={styles.attrValue}>{attr.value ?? '—'}</Text>
                    <View style={styles.attrTrack}>
                      <View style={[styles.attrFill, { width: `${attr.value ?? 0}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
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
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  content: { padding: 20, paddingTop: 8, gap: 20, paddingBottom: 40 },

  hero: { borderRadius: radii.lg, paddingVertical: 18, paddingHorizontal: 20 },
  heroLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.72)', letterSpacing: 1.2 },
  heroValue: { fontFamily: fontFamily.extraBold, fontSize: 42, color: colors.white, lineHeight: 48, marginTop: 2 },
  heroSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.78)', marginTop: 4 },

  statusBanner: { flexDirection: 'row', gap: 8, backgroundColor: colors.warningTint, borderRadius: radii.md, padding: 12, alignItems: 'center' },
  statusBannerText: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: '#7A5C00' },
  errorBanner: { flexDirection: 'row', gap: 8, backgroundColor: colors.dangerTint, borderRadius: radii.md, padding: 12, alignItems: 'flex-start' },
  errorBannerText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.error, lineHeight: 18 },

  section: { gap: 12 },
  sectionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },

  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 16 },
  attrCell: { width: '43%', flexGrow: 1 },
  attrTopRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  attrName: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted },
  confText: { fontFamily: fontFamily.semiBold, fontSize: 10 },
  attrValue: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginTop: 2 },
  attrTrack: { height: 4, borderRadius: 2, backgroundColor: colors.divider, overflow: 'hidden', marginTop: 6 },
  attrFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },

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
