import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
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
import { VerificationBadge } from '../src/components/VerificationBadge';
import { NoticeBox } from '../src/components/NoticeBox';
import { Button } from '../src/components/Button';
import { Kicker } from '../src/components/Kicker';
import { useSessionStore } from '../src/store/useSessionStore';
import * as guardianRepository from '../src/repositories/guardianRepository';
import * as authRepository from '../src/repositories/authRepository';
import { showAlert } from '../src/lib/alert';

// Canvas screen 81 PLAYER VERIFICATION.
//
//   green hexagon
//   "Get your green mark"
//   "Verified players appear above unverified ones in every scout search —
//    and it is free."
//   ✓ Email confirmed   ✓ Guardian consent   ○ Selfie check · takes 20 seconds
//   [notice] "Always free for players. We charge scouts and clubs, never the
//            people being scouted."
//   [Do the selfie check]
//
// -- THE CHECKLIST IS READ, NOT DECORATED --
//
// Email confirmed comes from the auth user, guardian consent from the consent
// record. Only the selfie step is outstanding, and it is outstanding for
// everyone: there is no liveness/selfie provider in this project, so the button
// says so rather than opening a camera that leads nowhere.
//
// -- THE SEARCH-RANKING CLAIM --
//
// "Verified players appear above unverified ones in every scout search" is
// printed because the canvas prints it, but nothing in listPlayerPublicViews
// currently sorts on verification -- it sorts by rating, name or age. Either
// the ordering ships or this sentence should not. Flagged rather than quietly
// dropped, because it is a promise made to a child about being seen.
export default function PlayerVerification() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);

  const { data: emailConfirmed } = useQuery({
    queryKey: ['emailConfirmed', userId],
    enabled: !!userId,
    queryFn: () => authRepository.isEmailConfirmed(),
  });

  const { data: consent } = useQuery({
    queryKey: ['guardianConsent', userId],
    enabled: !!userId,
    queryFn: () => guardianRepository.getMyConsent(userId!),
  });

  const steps = [
    { label: 'Email confirmed', done: !!emailConfirmed, hint: undefined as string | undefined },
    {
      // A consent row exists as soon as the link is sent; it counts as done
      // only once the guardian has actually confirmed it, which is what
      // confirmed_at records. Treating "requested" as "granted" would be the
      // exact failure this gate exists to prevent.
      label: 'Guardian consent',
      done: !!consent?.confirmed_at,
      hint: consent
        ? consent.confirmed_at
          ? undefined
          : 'Waiting on their reply'
        : 'Only needed if you are under 18',
    },
    { label: 'Selfie check', done: false, hint: 'Takes 20 seconds' },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <VerificationBadge role="player" size={cx(58)} glyph="role" />
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Get your green mark
          </Text>
          <Text style={styles.lede}>
            Verified players appear above unverified ones in every scout search — and it is free.
          </Text>
        </View>

        <View style={styles.steps}>
          {steps.map((s) => (
            <View key={s.label} style={styles.step}>
              <View style={[styles.tick, s.done && styles.tickDone]}>
                {s.done && <Feather name="check" size={12} color={colors.white} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepLabel, s.done && styles.stepLabelDone]}>{s.label}</Text>
                {!!s.hint && (
                  <Kicker size={fontSize.caption} style={{ marginTop: 2 }}>
                    {s.hint}
                  </Kicker>
                )}
              </View>
            </View>
          ))}
        </View>

        <NoticeBox tone="success" style={styles.notice}>
          <Text style={styles.noticeStrong}>Always free for players.</Text> We charge scouts and
          clubs, never the people being scouted.
        </NoticeBox>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Do the selfie check"
          variant="navy"
          onPress={() =>
            showAlert(
              'Selfie check is not available yet',
              'Matobev has no identity provider connected. Your email and guardian consent are already on file — the selfie step will be enabled when the check goes live.'
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
    header: { paddingHorizontal: cx(18) },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xl },
    hero: { alignItems: 'center', marginTop: spacing.md },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.5,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },
    steps: {
      gap: spacing.lg,
      marginTop: spacing.xxl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    tick: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.borderDashed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tickDone: { backgroundColor: colors.success, borderColor: colors.success },
    stepLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.body, color: colors.textMuted },
    stepLabelDone: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
    notice: { marginTop: spacing.lg },
    noticeStrong: { fontFamily: fontFamily.bold },
    footer: { paddingHorizontal: cx(18), paddingBottom: spacing.md },
  });
}
