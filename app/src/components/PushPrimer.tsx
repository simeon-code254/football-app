import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors, useIsDark, elevation } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { registerForPush } from '../lib/push';
import { useTranslation } from '../i18n';

// The screen shown BEFORE the operating system's own permission dialog.
//
// This is not decoration. A cold OS prompt gets refused, and on iOS a
// refusal is close to permanent -- the system will not ask again, and the
// only route back is the Settings app. Explaining what will actually be
// sent first is what moves opt-in from roughly half of users to about two
// thirds, and it is the difference between push being a retention channel
// and being dead on arrival.
//
// Each line below is a real notification this app already generates via
// existing database triggers, not a hypothetical.
export function PushPrimer({
  visible,
  profileId,
  onDone,
}: {
  visible: boolean;
  profileId: string;
  onDone: (granted: boolean) => void;
}) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const { t } = useTranslation();
  const styles = makeStyles(colors);
  const [working, setWorking] = useState(false);

  const enable = async () => {
    setWorking(true);
    try {
      const granted = await registerForPush(profileId);
      onDone(granted);
    } catch {
      onDone(false);
    } finally {
      setWorking(false);
    }
  };

  const reasons: { icon: React.ComponentProps<typeof Feather>['name']; text: string }[] = [
    { icon: 'eye', text: t('push.reasonViewed') },
    { icon: 'message-circle', text: t('push.reasonMessage') },
    { icon: 'clipboard', text: t('push.reasonAccepted') },
    { icon: 'bar-chart-2', text: t('push.reasonRating') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onDone(false)}>
      <View accessibilityViewIsModal style={styles.backdrop}>
        <View style={[styles.sheet, elevation('overlay', isDark)]}>
          <View style={styles.iconWrap}>
            <Feather name="bell" size={22} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('push.title')}</Text>
          <Text style={styles.sub}>
            {t('push.sub')}
          </Text>

          <View style={styles.reasons}>
            {reasons.map((r) => (
              <View key={r.text} style={styles.reasonRow}>
                <Feather name={r.icon} size={15} color={colors.primary} />
                <Text style={styles.reasonText}>{r.text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.fine}>{t('push.fine')}</Text>

          <PrimaryButton
            label={working ? `${t('common.loading')}…` : t('push.enable')}
            onPress={enable}
            disabled={working}
            loading={working}
            style={{ width: '100%', marginTop: spacing.lg }}
          />
          <Pressable
            onPress={() => onDone(false)}
            hitSlop={10}
            style={styles.later}
            accessibilityRole="button"
            accessibilityLabel={t('common.notNow')}
          >
            <Text style={styles.laterText}>{t('common.notNow')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.xxl,
      alignItems: 'center',
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: radii.pill,
      backgroundColor: colors.infoTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: { fontFamily: fontFamily.bold, fontSize: fontSize.heading, color: colors.textPrimary, textAlign: 'center' },
    sub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 19,
      marginTop: spacing.sm,
    },
    reasons: { alignSelf: 'stretch', marginTop: spacing.lg, gap: spacing.md },
    reasonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    reasonText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textBody, flex: 1 },
    fine: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: colors.textPlaceholder,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    later: { marginTop: spacing.md, paddingVertical: spacing.sm },
    laterText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textMuted },
  });
}
