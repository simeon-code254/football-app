import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../src/theme';
import { NoticeBox } from '../src/components/NoticeBox';
import { Kicker } from '../src/components/Kicker';
import { Button, LinkButton } from '../src/components/Button';
import { useSessionStore } from '../src/store/useSessionStore';
import { showAlert } from '../src/lib/alert';

// Canvas screen 87 VERIFICATION REJECTED.
//
//   "We couldn't verify this"
//   "Your agency letter was dated 2019. We need one issued in the last twelve
//    months."
//   WHAT TO FIX — "Upload a current letter on agency headed paper, signed and
//    dated."
//   "Your $49 is still held. No second charge when you resubmit. Refunded in
//    full if you'd rather stop."
//   [Upload a new letter]  /  Request a refund
//
// -- WHY THE REASON IS SPECIFIC --
//
// The canvas does not say "verification failed". It names the document, names
// what was wrong with it, and names the fix. A rejection a person cannot act on
// is just a wall, and this one costs $49 -- so the reason comes from the
// reviewer's own note (scouts.verification_notes / clubs.verification_notes)
// rather than a generic string. If no note was left, this screen says so
// instead of inventing a reason.
//
// The money paragraph is equally deliberate: the first thing anyone rejected
// after paying wants to know is whether they have lost $49.
export default function VerificationRejected() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const role = useSessionStore((s) => s.role);
  const scout = useSessionStore((s) => s.scout);
  const club = useSessionStore((s) => s.club);

  const notes = role === 'club' ? club?.verification_notes : scout?.verification_notes;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Feather name="alert-triangle" size={26} color={colors.error} />
        </View>

        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          We couldn&apos;t verify this
        </Text>
        <Text style={styles.lede}>
          {notes?.trim() ||
            'The reviewer did not leave a reason. Contact support and we will tell you what is missing.'}
        </Text>

        <View style={styles.fixCard}>
          <Kicker>What to fix</Kicker>
          <Text style={styles.fixBody}>
            Upload a current letter on {role === 'club' ? 'club' : 'agency'} headed paper, signed
            and dated.
          </Text>
        </View>

        <NoticeBox tone="success" style={styles.notice}>
          <Text style={styles.strong}>Your $49 is still held.</Text> No second charge when you
          resubmit. Refunded in full if you&apos;d rather stop.
        </NoticeBox>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Upload a new letter"
          variant="navy"
          onPress={() => router.push('/scout-verification')}
        />
        <LinkButton
          label="Request a refund"
          tone="onPaper"
          onPress={() =>
            showAlert(
              'Refunds are handled by support',
              'Payments are not connected in this build, so refunds cannot be issued from the app. Contact support and the held amount will be returned in full.'
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
    scroll: { paddingHorizontal: cx(18), paddingTop: cx(30), paddingBottom: spacing.xl },
    iconWrap: {
      alignSelf: 'center',
      width: cx(52),
      height: cx(52),
      borderRadius: radii.xl,
      backgroundColor: colors.dangerTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.5,
      color: colors.textBody,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    fixCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginTop: spacing.xl,
    },
    fixBody: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.45,
      color: colors.textBody,
      marginTop: 6,
    },
    notice: { marginTop: spacing.lg },
    strong: { fontFamily: fontFamily.bold },
    footer: { paddingHorizontal: cx(18), paddingBottom: spacing.md },
  });
}
