import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { fontFamily, fontSize, radii, useThemeColors, useIsDark, elevation } from '../theme';

// Confidence is marked here for the same reason it is on the player's own
// card (see PlayerRatingCard), but the stakes are different: this is the
// surface a scout makes decisions on. An unqualified "PAC 1" here is not
// just discouraging, it is misinformation acted upon -- the engine's Low
// confidence usually means it could not track the player in that clip, which
// says something about our footage, not about them.
export type ScoutPlayerCardAttribute = {
  key: string;
  displayName: string;
  value: number | null;
  confidence?: 'High' | 'Medium' | 'Low' | null;
};

type Props = {
  id: string;
  name: string;
  avatar: string;
  overall: number | null;
  position: string | null;
  country: string | null;
  age: number | null;
  topAttributes: ScoutPlayerCardAttribute[];
  // Derived from every scored attribute, not just the four shown -- see the
  // caller in (scout-tabs)/home.tsx.
  anyLowConfidence?: boolean;
  matchReasons?: string[];
  saved: boolean;
  onToggleSave: () => void;
};

// The signature scout-facing player card (spec §8/§9): image, OVR+position,
// name, country, age, four key attributes, Save + View Profile actions, and
// an optional recommendation-reason strip built from real signals (preferred
// position match, recent activity) — never a fabricated explanation.
export function ScoutPlayerCard({ id, name, avatar, overall, position, country, age, topAttributes, anyLowConfidence, matchReasons, saved, onToggleSave }: Props) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.card, elevation('raised', isDark)]}>
      <View style={styles.imageWrap}>
        {/* See PlayerCard for why these three props matter on a recycled list row. */}
        <Image
          source={{ uri: avatar }}
          style={styles.image}
          cachePolicy="memory-disk"
          recyclingKey={avatar}
          transition={200}
        />
        <View
          style={styles.ovrBadge}
          accessible
          accessibilityLabel={`Overall ${overall ?? 'not rated'}${anyLowConfidence ? ', based partly on low-confidence analysis' : ''}`}
        >
          <Text style={styles.ovrValue}>
            {overall ?? '—'}
            {anyLowConfidence ? '·' : ''}
          </Text>
          <Text style={styles.ovrLabel}>OVR</Text>
        </View>
        {!!position && (
          <View style={styles.posBadge}>
            <Text style={styles.posText}>{position}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          {country ?? '—'} {age != null ? `· Age ${age}` : ''}
        </Text>

        <View style={styles.attrGrid}>
          {topAttributes.map((a) => {
            const low = a.confidence === 'Low';
            return (
              <Text
                key={a.key}
                style={styles.attrText}
                accessibilityLabel={`${a.displayName} ${a.value ?? 'not rated'}${low ? ', low confidence' : ''}`}
              >
                <Text style={styles.attrKey}>{a.displayName.slice(0, 3).toUpperCase()} </Text>
                {/* Value shown in full either way -- a scout should see every
                    number the engine produced -- but de-emphasised and marked
                    when the analysis was not confident in it. */}
                <Text style={low ? styles.attrValueLow : undefined}>
                  {a.value ?? '—'}
                  {low ? '·' : ''}
                </Text>
              </Text>
            );
          })}
        </View>

        {anyLowConfidence && (
          <Text style={styles.confidenceNote}>· Some values are low-confidence — footage was hard to measure</Text>
        )}

        {!!matchReasons?.length && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>Why you're seeing this player</Text>
            {matchReasons.map((line) => (
              <Text key={line} style={styles.reasonLine}>✓ {line}</Text>
            ))}
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.saveBtn}
            onPress={onToggleSave}
            accessibilityRole="button"
            accessibilityLabel={saved ? `Unsave ${name}` : `Save ${name}`}
            accessibilityState={{ selected: saved }}
          >
            <Feather name="heart" size={15} color={saved ? colors.error : colors.textMuted} />
            <Text style={[styles.saveText, saved && { color: colors.error }]}>{saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
          <Pressable
            style={styles.viewBtn}
            onPress={() => router.push({ pathname: '/player/[id]', params: { id } })}
            accessibilityRole="button"
            accessibilityLabel={`View ${name}'s profile`}
          >
            <Text style={styles.viewText}>View Profile</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: { width: 240, backgroundColor: colors.surface, borderRadius: radii.xl, overflow: 'hidden', alignSelf: 'flex-start' },
    imageWrap: { height: 140, backgroundColor: colors.surfaceMuted },
    image: { width: '100%', height: '100%' },
    ovrBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
    ovrValue: { fontFamily: fontFamily.bold, fontSize: fontSize.body, color: colors.white, lineHeight: 16 },
    ovrLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: 'rgba(255,255,255,0.8)' },
    posBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.primary, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4 },
    posText: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: colors.white },
    body: { padding: 14 },
    name: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
    meta: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, marginBottom: 10 },
    attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    attrText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary, width: '45%' },
    attrKey: { fontFamily: fontFamily.medium, color: colors.textMuted },
    attrValueLow: { color: colors.textMuted },
    confidenceNote: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: 10,
      lineHeight: 15,
    },
    reasonBox: { backgroundColor: colors.successTint, borderRadius: radii.md, padding: 10, marginBottom: 10, gap: 2 },
    reasonTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textPrimary, marginBottom: 2 },
    reasonLine: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.success },
    actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    saveText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted },
    viewBtn: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8 },
    viewText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  });
}
