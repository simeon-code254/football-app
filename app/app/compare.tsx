import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, fontSize, radii } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { MOCK_PLAYERS } from '../src/data/mockPlayers';

// Compare Players (spec §23) — reachable from the Players list's Compare
// mode. Side-by-side attribute table; rows are the union of whatever
// attributes each selected player actually has (a GK and an outfield player
// share almost none), so a missing cell reads as "—", not a fabricated 0.
export default function ComparePlayers() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const playerIds = (ids ?? '').split(',').filter(Boolean);
  const players = playerIds.map((id) => MOCK_PLAYERS.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);

  const attributeKeys = Array.from(new Set(players.flatMap((p) => p.attributes.map((a) => a.key))));

  const valueFor = (playerId: string, key: string) => {
    const player = players.find((p) => p.id === playerId);
    return player?.attributes.find((a) => a.key === key)?.val;
  };

  const best = (key: string) => {
    const vals = players.map((p) => valueFor(p.id, key)).filter((v): v is number => v != null);
    return vals.length ? Math.max(...vals) : null;
  };

  if (players.length < 2) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.notFound}>Select at least 2 players to compare.</Text>
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
                <Image source={{ uri: p.avatar }} style={styles.avatar} />
                <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.playerMeta}>{p.position} · {p.flag}</Text>
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
                <Text style={styles.overallValue}>{p.overall}</Text>
              </View>
            ))}
          </View>

          {attributeKeys.map((key, i) => {
            const bestVal = best(key);
            return (
              <View key={key} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                <View style={styles.labelCol}>
                  <Text style={styles.rowLabel}>{key}</Text>
                </View>
                {players.map((p) => {
                  const val = valueFor(p.id, key);
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
