import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Animated from 'react-native-reanimated';
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
import { Kicker } from '../src/components/Kicker';
import { Button } from '../src/components/Button';
import { useSpin } from '../src/lib/motion';
import { useSessionStore } from '../src/store/useSessionStore';

// Canvas screen 86 VERIFICATION PENDING.
//
//   "Checking your documents"
//   "A person reviews every scout application. Usually within one working day."
//   ✓ Payment received  $49
//   ✓ Documents uploaded
//   ◌ Manual review     IN PROGRESS
//   "You can browse in the meantime, but under-18 players stay hidden until
//    this clears."
//
// -- THE LAST LINE IS THE USEFUL ONE --
//
// It tells a waiting scout exactly what they can and cannot do, which stops
// the support ticket that otherwise follows ("the app is broken, I can't see
// any players"). They are not broken; they are unverified, and RLS is doing
// precisely what screen 80 promised it would.
export default function VerificationPending() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const role = useSessionStore((s) => s.role);
  const spin = useSpin(2400);

  const steps = [
    { label: 'Payment received', detail: '$49', state: 'done' as const },
    { label: 'Documents uploaded', detail: undefined, state: 'done' as const },
    { label: 'Manual review', detail: 'In progress', state: 'active' as const },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <VerificationBadge role={role === 'club' ? 'club' : 'scout'} size={cx(58)} glyph="role" />
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Checking your documents
          </Text>
          <Text style={styles.lede}>
            A person reviews every {role === 'club' ? 'club' : 'scout'} application. Usually within
            one working day.
          </Text>
        </View>

        <View style={styles.steps}>
          {steps.map((s) => (
            <View key={s.label} style={styles.step}>
              {s.state === 'done' ? (
                <View style={styles.tickDone}>
                  <Feather name="check" size={12} color={colors.white} />
                </View>
              ) : (
                <Animated.View style={[styles.spinner, spin]} />
              )}
              <Text style={styles.stepLabel}>{s.label}</Text>
              {!!s.detail && (
                <Kicker size={fontSize.caption} style={s.state === 'active' ? styles.active : undefined}>
                  {s.detail}
                </Kicker>
              )}
            </View>
          ))}
        </View>

        <NoticeBox tone="info" style={styles.notice}>
          You can browse in the meantime, but under-18 players stay hidden until this clears.
        </NoticeBox>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Browse in the meantime"
          variant="navy"
          onPress={() => router.replace(role === 'club' ? '/(club-tabs)/home' : '/(scout-tabs)/home')}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: cx(18), paddingTop: cx(30), paddingBottom: spacing.xl },
    hero: { alignItems: 'center' },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
      marginTop: spacing.lg,
      textAlign: 'center',
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
    tickDone: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // A spinning arc rather than a tick: the step is genuinely in flight, and
    // an empty circle would read as "not started".
    spinner: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      borderTopColor: colors.gold,
    },
    stepLabel: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      color: colors.textPrimary,
    },
    active: { color: colors.goldDark },
    notice: { marginTop: spacing.lg },
    footer: { paddingHorizontal: cx(18), paddingBottom: spacing.md },
  });
}
