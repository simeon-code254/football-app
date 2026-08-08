import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, fontFamily, fontSize, radii } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { images } from '../src/constants/images';
import * as profileRepository from '../src/repositories/profileRepository';

// Compare Players (spec §23) — reachable from the Players list's Compare
// mode. Side-by-side attribute table; rows are the union of whatever
// attributes each selected player actually has (a GK and an outfield player
// share almost none), so a missing cell reads as "—", not a fabricated 0.
export default function ComparePlayers() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const playerIds = (ids ?? '').split(',').filter(Boolean);

  const { data: players, isLoading } = useQuery({
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

  const valueFor = (playerId: string, label: string) => {
    const player = (players ?? []).find((p) => p.id === playerId);
    return player?.attributes.find((a) => a.displayName === label)?.value ?? null;
  };

  const best = (label: string) => {
    const vals = (players ?? []).map((p) => valueFor(p.id ?? '', label)).filter((v): v is number => v != null);
    return vals.length ? Math.max(...vals) : null;
  };

  if (playerIds.length < 2) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.notFound}>Select at least 2 players to compare.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading || !players) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
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
                <Text style={styles.overallValue}>{p.overall_rating ?? '—'}</Text>
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
                  const isBest = val != null && val === bestVal && players.length > 1;
                  return (
                    <View key={p.id} style={styles.playerCol}>
                      <Text style={[styles.cellValue, isBest && styles.cellValueBest]}>{val ?? '—'}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const COL_WIDTH = 110;
const LABEL_WIDTH = 130;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  notFound: { textAlign: 'center', marginTop: 40, fontFamily: fontFamily.regular, color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowAlt: { backgroundColor: colors.surfaceMuted },
  rowHighlight: { backgroundColor: '#EBF2FF' },
  labelCol: { width: LABEL_WIDTH, paddingLeft: 20 },
  rowLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  rowLabelBold: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: colors.textPrimary },
  playerCol: { width: COL_WIDTH, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginBottom: 6 },
  playerName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary, maxWidth: COL_WIDTH - 10 },
  playerMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  overallValue: { fontFamily: fontFamily.extraBold, fontSize: fontSize.headingLg, color: colors.primary },
  cellValue: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  cellValueBest: { color: colors.success },
});
