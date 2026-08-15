import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors } from '../theme';
import { useTranslation } from '../i18n';

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
  const { t } = useTranslation();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card} accessible accessibilityLabel={t('safety.title')}>
      <View style={styles.headRow}>
        <Feather name="shield" size={15} color={colors.primary} />
        <Text style={styles.title}>{t('safety.title')}</Text>
      </View>

      <Text style={styles.point}>
        <Text style={styles.bold}>{t('safety.noMoney')}</Text> {t('safety.noMoneyBody')}
      </Text>

      {!compact && (
        <>
          <Text style={styles.point}>
            <Text style={styles.bold}>{t('safety.clubPays')}</Text> {t('safety.clubPaysBody')}
          </Text>
          <Text style={styles.point}>
            <Text style={styles.bold}>{t('safety.verified')}</Text> {t('safety.verifiedBody')}
          </Text>
          <Text style={styles.point}>
            <Text style={styles.bold}>{t('safety.tellSomeone')}</Text> {t('safety.tellSomeoneBody')}
          </Text>
        </>
      )}

      <Pressable
        onPress={() => router.push('/help-settings')}
        hitSlop={8}
        style={styles.linkRow}
        accessibilityRole="button"
        accessibilityLabel={t('safety.readGuide')}
      >
        <Text style={styles.link}>{compact ? t('safety.readGuide') : t('safety.reportWrong')}</Text>
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
