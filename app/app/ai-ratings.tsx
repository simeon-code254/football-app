import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';
import { QueryState } from '../src/components/QueryState';

const CONFIDENCE_COLOR: Record<string, string> = {
  High: colors.success,
  Medium: colors.goldDark,
  Low: colors.error,
};

// A real, deep-linkable destination for "your AI ratings" -- previously
// every entry point (the post-upload alert, an analysis-complete
// notification, Home's "View Report" button) just dumped the user on
// Profile's "AI Ratings" tab, which meant losing whatever screen they were
// actually on to get there. Reused as the AI Ratings tab's own destination
// too, so there's exactly one place this data is rendered.
export default function AiRatings() {
  const userId = useSessionStore((s) => s.session?.user.id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aiRatingsScreen', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [player, publicView] = await Promise.all([
        profileRepository.getMyPlayer(userId!),
        profileRepository.getPlayerPublicView(userId!),
      ]);
      const attributes = await profileRepository.getPlayerAttributes(userId!, !!player.is_goalkeeper);
      return { player, publicView, attributes };
    },
  });

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
          <View style={styles.disclaimer}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={styles.disclaimerText}>
              AI performance data is decision support, not a final verdict — ratings update automatically as new
              highlights are analyzed.
            </Text>
          </View>

          <View style={styles.overallCard}>
            <Text style={styles.overallLabel}>OVERALL</Text>
            <Text style={styles.overallValue}>{data?.publicView.overall_rating ?? '—'}</Text>
            {isProvisionalRating && (
              <Text style={styles.provisionalNote}>
                Provisional — {presentAttrCount} of {totalAttrCount} attributes assessed so far.
              </Text>
            )}
          </View>

          <View style={{ gap: 10 }}>
            {(data?.attributes ?? []).map((attr) => (
              <View key={attr.key} style={styles.skillRow}>
                <Text style={styles.skillName}>{attr.displayName}</Text>
                <View style={styles.skillTrack}>
                  <View style={[styles.skillFill, { width: `${attr.value ?? 0}%` }]} />
                </View>
                <Text style={styles.skillVal}>{attr.value ?? '—'}</Text>
                {attr.confidence && <View style={[styles.confDot, { backgroundColor: CONFIDENCE_COLOR[attr.confidence] }]} />}
              </View>
            ))}
          </View>

          {!hasAnyRatings && (
            <View style={styles.empty}>
              <Feather name="bar-chart-2" size={28} color={colors.textPlaceholder} />
              <Text style={styles.emptyTitle}>No ratings yet</Text>
              <Text style={styles.emptySub}>Upload a highlight with AI Analysis enabled to get your first ratings.</Text>
            </View>
          )}
        </ScrollView>
      </QueryState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  content: { padding: 20, paddingTop: 8, gap: 20 },
  disclaimer: { flexDirection: 'row', gap: 8, backgroundColor: '#EBF2FF', borderRadius: radii.md, padding: 12, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, lineHeight: 18 },
  overallCard: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, paddingVertical: 20 },
  overallLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  overallValue: { fontFamily: fontFamily.extraBold, fontSize: fontSize.hero, color: colors.textPrimary, marginTop: 4 },
  provisionalNote: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.goldDark, marginTop: 6, textAlign: 'center' },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skillName: { width: 110, fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  skillTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  skillFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  skillVal: { width: 28, textAlign: 'right', fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  confDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 20, gap: 6 },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary, marginTop: 8 },
  emptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
});
