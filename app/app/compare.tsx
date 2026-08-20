import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fontFamily, fontSize, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { images } from '../src/constants/images';
import * as profileRepository from '../src/repositories/profileRepository';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';

// Compare Players (spec §23) — reachable from the Players list's Compare
// mode. Side-by-side attribute table; rows are the union of whatever
// attributes each selected player actually has (a GK and an outfield player
// share almost none), so a missing cell reads as "—", not a fabricated 0.
export default function ComparePlayers() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const playerIds = (ids ?? '').split(',').filter(Boolean);

  const { data: players, isLoading, error, refetch } = useQuery({
    queryKey: ['comparePlayers', playerIds],
    enabled: playerIds.length >= 2,
    queryFn: async () => {
      const rows = await Promise.all(
        playerIds.map(async (id) => {
          const publicView = await profileRepository.getPlayerPublicView(id);
          const attributes = await profileRepository.getPlayerAttributes(id, publicView.primary_position === 'GK');
          return { ...publicView, attributes };
        })
      );
      return rows;
    },
  });

  const attributeKeys = Array.from(
    new Set((players ?? []).flatMap((p) => p.attributes.filter((a) => a.value != null).map((a) => a.displayName)))
  );

  const attrFor = (playerId: string, label: string) =>
    (players ?? []).find((p) => p.id === playerId)?.attributes.find((a) => a.displayName === label);

  const valueFor = (playerId: string, label: string) => attrFor(playerId, label)?.value ?? null;
  const isLowFor = (playerId: string, label: string) => attrFor(playerId, label)?.confidence === 'Low';

  // Over every scored attribute, not only the rows the table happens to show:
  // the overall is a weighted average of all of them.
  const anyLowFor = (p: { attributes: { value: number | null; confidence?: string | null }[] }) =>
    p.attributes.some((a) => a.value != null && a.confidence === 'Low');

  // Highlighting a cell as "best" is not a display choice, it is the app
  // asserting that one player beats another at this attribute. That assertion
  // needs a measurement we actually trust, so low-confidence values are not
  // eligible to win -- otherwise a shakily-measured 40 visually defeats a
  // confidently-measured 38 and a scout reads it as a verdict.
  //
  // The values themselves are still shown in full, marked. Nothing is hidden;
  // we just decline to crown a winner on evidence we would not stand behind.
  const best = (label: string) => {
    const vals = (players ?? [])
      .filter((p) => !isLowFor(p.id ?? '', label))
      .map((p) => valueFor(p.id ?? '', label))
      .filter((v): v is number => v != null);
    return vals.length ? Math.max(...vals) : null;
  };

  if (playerIds.length < 2) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.notFound}>Select at least 2 players to compare.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading || error || !players) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonRow count={5} />}>
          <Text style={styles.notFound}>Couldn't load these players.</Text>
        </QueryState>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Compare</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Player headers */}
          <View style={styles.row}>
            <View style={styles.labelCol} />
            {players.map((p) => (
              <View key={p.id} style={styles.playerCol}>
                <Image source={{ uri: p.avatar_url ?? images.avatarMale }} style={styles.avatar} />
                <Text style={styles.playerName} numberOfLines={1}>{p.full_name || 'Unnamed'}</Text>
                <Text style={styles.playerMeta}>{p.primary_position} · {p.nationality_name}</Text>
              </View>
            ))}
          </View>

          {/* Overall row */}
          <View style={[styles.row, styles.rowHighlight]}>
            <View style={styles.labelCol}>
              <Text style={styles.rowLabelBold}>OVR</Text>
            </View>
            {players.map((p) => (
              <View key={p.id} style={styles.playerCol}>
                <Text
                  style={styles.overallValue}
                  accessibilityLabel={`${p.full_name ?? 'Player'} overall ${p.overall_rating ?? 'not rated'}${anyLowFor(p) ? ', based partly on low-confidence analysis' : ''}`}
                >
                  {p.overall_rating ?? '—'}
                  {anyLowFor(p) ? '·' : ''}
                </Text>
              </View>
            ))}
          </View>

          {attributeKeys.map((label, i) => {
            const bestVal = best(label);
            return (
              <View key={label} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                <View style={styles.labelCol}>
                  <Text style={styles.rowLabel}>{label}</Text>
                </View>
                {players.map((p) => {
                  const val = valueFor(p.id ?? '', label);
                  const low = isLowFor(p.id ?? '', label);
                  const isBest = val != null && !low && val === bestVal && players.length > 1;
                  return (
                    <View key={p.id} style={styles.playerCol}>
                      <Text
                        style={[styles.cellValue, isBest && styles.cellValueBest, low && styles.cellValueLow]}
                        accessibilityLabel={`${p.full_name ?? 'Player'} ${label} ${val ?? 'not rated'}${low ? ', low confidence' : ''}${isBest ? ', highest' : ''}`}
                      >
                        {val ?? '—'}
                        {low ? '·' : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        {(players ?? []).some(anyLowFor) && (
          // Says what the marker means AND what the app declined to do with
          // it. A scout reading a comparison table needs to know that an
          // unhighlighted row may simply be one we would not call.
          <Text style={styles.legend}>
            · Low-confidence values — the footage was hard to measure. These are shown in full but are not
            highlighted as the strongest, since the comparison would not be sound.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const COL_WIDTH = 110;
const LABEL_WIDTH = 130;

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  notFound: { textAlign: 'center', marginTop: 40, fontFamily: fontFamily.regular, color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowAlt: { backgroundColor: colors.surfaceMuted },
  rowHighlight: { backgroundColor: colors.infoTint },
  labelCol: { width: LABEL_WIDTH, paddingLeft: 20 },
  rowLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  rowLabelBold: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: colors.textPrimary },
  playerCol: { width: COL_WIDTH, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginBottom: 6 },
  playerName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary, maxWidth: COL_WIDTH - 10 },
  playerMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  overallValue: { fontFamily: fontFamily.extraBold, fontSize: fontSize.headingLg, color: colors.primary },
  cellValue: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  // Was colour-only, which fails WCAG 1.4.1 and lands on the same green/red
  // axis ~8% of men cannot separate. The weight change carries the meaning
  // independently of hue; the screen-reader label says "highest" outright.
  cellValueBest: { color: colors.success, fontFamily: fontFamily.extraBold },
  cellValueLow: { color: colors.textMuted },
  legend: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  });
}
