import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { cx, fontFamilyDisplay, fontSize, radii, spacing, useThemeColors } from '../../src/theme';
import { Kicker } from '../../src/components/Kicker';
import { Button } from '../../src/components/Button';
import { DeadlinePill } from '../../src/components/DeadlinePill';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonCards } from '../../src/components/Skeleton';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as trialsRepository from '../../src/repositories/trialsRepository';

// The club's own trials list.
//
// -- DESIGNED FRESH --
//
// The canvas gives clubs a dashboard (27/50) and an applicant pipeline (51) but
// never draws a standalone club trials list; the dashboard only previews four.
// This is that list, built from the same parts the dashboard uses -- the trial
// row, the deadline pill, the applicant count -- so it reads as the same
// product rather than a new screen.
export default function ClubTrials() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const clubId = useSessionStore((s) => s.session?.user.id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clubTrials', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const page = await trialsRepository.listMyTrials(clubId!, { pageSize: 50 });
      const counts = await trialsRepository.getApplicantCounts(page.items.map((t) => t.id));
      return { trials: page.items, counts };
    },
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Trials</Text>
      </View>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeleton={<SkeletonCards />}
        isEmpty={!data?.trials.length}
        emptyIcon="clipboard"
        emptyMessage="No trials posted yet. Post one and applicants appear here."
      >
        <FlashList
          data={data?.trials ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/club-applicants/[trialId]', params: { trialId: item.id } })
              }
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Kicker size={fontSize.caption} style={{ marginTop: 2 }}>
                  {[
                    (data?.counts[item.id] ?? 0) + ' applicants',
                    item.location,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Kicker>
              </View>
              <DeadlinePill deadline={item.application_deadline} />
            </Pressable>
          )}
        />
      </QueryState>

      <View style={styles.footer}>
        <Button label="+ Post a trial" variant="navy" onPress={() => router.push('/trial-post')} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: cx(16) },
    title: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.display, color: colors.textPrimary },
    list: { paddingHorizontal: cx(16), paddingVertical: spacing.md },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    cardTitle: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
    footer: { paddingHorizontal: cx(16), paddingBottom: spacing.md },
  });
}
