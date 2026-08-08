import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, fontFamily, fontSize, radii, spacing } from '../theme';
import type { MockPlayer } from '../data/mockPlayers';

type Props = {
  player: MockPlayer;
  /** Shows the "Why you're seeing this player" explanation strip. */
  showMatchReason?: boolean;
};

// The signature scout-facing player card (spec §8/§9): image, OVR+position,
// name, country, age, four key attributes, Save + View Profile actions, and
// an optional recommendation-reason strip. `matchScore` (a recommendation
// match, not a football rating) is visually separated from `overall` so the
// two are never confused.
export function ScoutPlayerCard({ player, showMatchReason }: Props) {
  const [saved, setSaved] = useState(false);
  const topAttrs = player.attributes.slice(0, 4);

  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: player.avatar }} style={styles.image} />
        <View style={styles.ovrBadge}>
          <Text style={styles.ovrValue}>{player.overall}</Text>
          <Text style={styles.ovrLabel}>OVR</Text>
        </View>
        <View style={styles.posBadge}>
          <Text style={styles.posText}>{player.position}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.meta}>
          {player.flag} {player.country} · Age {player.age}
        </Text>

        <View style={styles.attrGrid}>
          {topAttrs.map((a) => (
            <Text key={a.key} style={styles.attrText}>
              <Text style={styles.attrKey}>{a.key.slice(0, 3).toUpperCase()} </Text>
              {a.val}
            </Text>
          ))}
        </View>

        {showMatchReason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>Why you're seeing this player</Text>
            <Text style={styles.reasonLine}>✓ Matches your preferred position</Text>
            <Text style={styles.reasonLine}>✓ Strong pace rating</Text>
            {player.recentlyActive && <Text style={styles.reasonLine}>✓ Recently active</Text>}
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable style={styles.saveBtn} onPress={() => setSaved((v) => !v)}>
            <Feather name="heart" size={15} color={saved ? '#EF4444' : colors.textMuted} style={saved ? { opacity: 1 } : undefined} />
            <Text style={[styles.saveText, saved && { color: '#EF4444' }]}>{saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
          <Pressable style={styles.viewBtn} onPress={() => router.push({ pathname: '/player/[id]', params: { id: player.id } })}>
            <Text style={styles.viewText}>View Profile</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 240, backgroundColor: colors.surface, borderRadius: radii.xl, overflow: 'hidden' },
  imageWrap: { height: 140, backgroundColor: colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  ovrBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  ovrValue: { fontFamily: fontFamily.bold, fontSize: fontSize.body, color: colors.white, lineHeight: 16 },
  ovrLabel: { fontFamily: fontFamily.medium, fontSize: 9, color: 'rgba(255,255,255,0.8)' },
  posBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.primary, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4 },
  posText: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: colors.white },
  body: { padding: 14 },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
  meta: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, marginBottom: 10 },
  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  attrText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary, width: '45%' },
  attrKey: { fontFamily: fontFamily.medium, color: colors.textMuted },
  reasonBox: { backgroundColor: '#F0FDF4', borderRadius: radii.md, padding: 10, marginBottom: 10, gap: 2 },
  reasonTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textPrimary, marginBottom: 2 },
  reasonLine: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.success },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  saveText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted },
  viewBtn: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8 },
  viewText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
});
