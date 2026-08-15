import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors } from '../theme';

// Shown the first time a scout contacts a player, and permanently on the
// help screen.
//
// This exists because of a documented, specific harm in this market, not
// as generic safety boilerplate: fraudsters posing as scouts approach young
// players through recruitment platforms, promise trials and contracts, and
// ask for money upfront -- a known route into trafficking. The single most
// reliable red flag is a request for payment, and under FIFA's own rules
// the inviting club covers travel and accommodation for a real trial.
//
// Matobev already verifies scouts and reviews their documents. It just
// never told the player any of that, or what to watch for. Competitors
// market reach; this is the thing they don't do.
export function ScoutSafetyNotice({ compact = false }: { compact?: boolean }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card} accessible accessibilityLabel="Safety information about scouts">
      <View style={styles.headRow}>
        <Feather name="shield" size={15} color={colors.primary} />
        <Text style={styles.title}>Staying safe with scouts</Text>
      </View>

      <Text style={styles.point}>
        <Text style={styles.bold}>No real scout asks you for money.</Text> Not for trials, not for registration, not
        for travel. A request for payment is the clearest sign of a scam.
      </Text>

      {!compact && (
        <>
          <Text style={styles.point}>
            <Text style={styles.bold}>A real club pays your way.</Text> Under FIFA rules, a club inviting you to a
            trial covers travel, accommodation and meals.
          </Text>
          <Text style={styles.point}>
            <Text style={styles.bold}>Verified means we checked.</Text> A verified scout submitted identity and
            organisation documents that our team reviewed. Unverified accounts can't message you at all.
          </Text>
          <Text style={styles.point}>
            <Text style={styles.bold}>Tell someone you trust.</Text> Bring a parent, guardian or your coach into any
            conversation about a trial before you agree to anything.
          </Text>
        </>
      )}

      <Pressable
        onPress={() => router.push('/help-settings')}
        hitSlop={8}
        style={styles.linkRow}
        accessibilityRole="button"
        accessibilityLabel="Read the full safety guide"
      >
        <Text style={styles.link}>{compact ? 'Read the full safety guide' : 'Report anything that feels wrong'}</Text>
        <Feather name="chevron-right" size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.infoTint,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    title: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
    point: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textBody,
      lineHeight: 19,
      marginBottom: spacing.sm,
    },
    bold: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
    link: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.primary },
  });
}
