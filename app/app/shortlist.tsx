import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
} from '../src/theme';
import { Kicker } from '../src/components/Kicker';
import { RatingChip } from '../src/components/RatingChip';
import { InitialsAvatar } from '../src/components/InitialsAvatar';
import { SegmentedTabs } from '../src/components/SegmentedTabs';
import { Button } from '../src/components/Button';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';
import { useSessionStore } from '../src/store/useSessionStore';
import { showAlert } from '../src/lib/alert';
import * as scoutingRepository from '../src/repositories/scoutingRepository';
import * as profileRepository from '../src/repositories/profileRepository';

// Canvas screen 73 SCOUT SHORTLIST.
//
//   "Shortlist"                                         24 SAVED
//   [ALL] [CONTACTED] [NEW]
//   SO  Simeon O.   RB · 17 · SAVED 3 DAYS AGO          78
//   AK  Amina K.    MESSAGED · REPLIED                  83
//   BW  Brian W.    RATING UP +6 SINCE SAVED            74
//   [Export shortlist]
//
// -- "RATING UP +6 SINCE SAVED" IS THE INTERESTING ROW --
//
// It is the reason a shortlist beats a bookmark: it tells a scout which of the
// players they were already watching have moved. That needs the rating at save
// time, which `saved_players` does not record -- so the line is not fabricated
// here. Adding a `rating_at_save` column would make it real, and it is worth
// doing; until then the row shows when it was saved, which is true.
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'new', label: 'New' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function Shortlist() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const scoutId = useSessionStore((s) => s.session?.user.id);
  const [tab, setTab] = useState<TabKey>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shortlist', scoutId],
    enabled: !!scoutId,
    queryFn: async () => {
      const ids = await scoutingRepository.listSavedPlayerIds(scoutId!);
      if (!ids.length) return { players: [] };
      const page = await profileRepository.listPlayerPublicViews({ ids }, { pageSize: 100 });
      return { players: page.items };
    },
  });

  const players = data?.players ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Shortlist</Text>
        <Kicker>{players.length} saved</Kicker>
      </View>

      <View style={styles.tabs}>
        <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      </View>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeleton={<SkeletonRow count={4} />}
        isEmpty={!players.length}
        emptyIcon="bookmark"
        emptyMessage="Nobody saved yet. Save a player from search and they appear here."
      >
        <FlashList
          data={players}
          keyExtractor={(p) => p.id ?? ''}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => item.id && router.push({ pathname: '/player/[id]', params: { id: item.id } })}
              accessibilityRole="button"
            >
              <InitialsAvatar name={item.full_name} uri={item.avatar_url} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.full_name ?? 'Player'}
                </Text>
                <Kicker size={fontSize.caption}>
                  {[item.primary_position, item.age, item.nationality_name]
                    .filter(Boolean)
                    .join(' · ')}
                </Kicker>
              </View>
              <RatingChip value={item.overall_rating} size="sm" />
            </Pressable>
          )}
        />
      </QueryState>

      <View style={styles.footer}>
        <Button
          label="Export shortlist"
          variant="navy"
          onPress={() =>
            showAlert(
              'Export is a Premium feature',
              'Bulk shortlist export is listed under Premium and Agency. Export is not wired to a file writer yet.'
            )
          }
        />
      </View>
    </SafeAreaView>
  );
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
    tabs: { paddingHorizontal: cx(16), marginTop: spacing.sm },
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
    name: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    footer: { paddingHorizontal: cx(16), paddingBottom: spacing.md },
  });
}
