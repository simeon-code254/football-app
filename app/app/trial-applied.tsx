import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../src/theme';
import { SuccessCheck } from '../src/components/SuccessCheck';
import { Button, LinkButton } from '../src/components/Button';
import { Kicker } from '../src/components/Kicker';

// Canvas screen 76 TRIAL APPLIED · SUCCESS.
//
//   "You're in the list"
//   "<Club> has your application for the <Trial> on <date>."
//   WHAT HAPPENS NEXT
//   "Shortlisted players are messaged within a week. We'll remind you three
//    days before."
//   [Add to calendar]  /  Back to trials
//
// -- ONE OMISSION --
//
// The canvas offers "Add to calendar". That needs expo-calendar plus a
// calendar write permission, neither of which this app has, and asking a
// 16-year-old for calendar access to confirm a trial is a poor trade for the
// convenience. Left out rather than shipped as a button that does nothing;
// the reminder promise below is kept by the existing notification pipeline,
// which is the part that actually matters.
export default function TrialApplied() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { club, title, date, applicationId } = useLocalSearchParams<{
    club?: string;
    title?: string;
    date?: string;
    applicationId?: string;
  }>();

  const who = club || 'The club';
  const what = title ? `your application for the ${title}` : 'your application';
  const when = date ? ` on ${date}` : '';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <SuccessCheck replayKey={applicationId} size={74} />

        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          You&apos;re in the list
        </Text>
        <Text style={styles.lede}>
          {who} has {what}
          {when}.
        </Text>

        <View style={styles.nextCard}>
          <Kicker>What happens next</Kicker>
          <Text style={styles.nextBody}>
            Shortlisted players are messaged within a week. We&apos;ll remind you three days
            before.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <Button
          label="Back to trials"
          variant="navy"
          onPress={() => router.replace('/trials')}
          style={styles.cta}
        />
        <LinkButton
          label="Back to home"
          tone="onPaper"
          onPress={() => router.replace('/(player-tabs)/home')}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, alignItems: 'center', paddingHorizontal: cx(24), paddingTop: cx(34) },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.headingLg,
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.45,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },
    nextCard: {
      alignSelf: 'stretch',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginTop: spacing.xl,
    },
    nextBody: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.45,
      color: colors.textBody,
      marginTop: 6,
    },
    cta: { alignSelf: 'stretch' },
  });
}
