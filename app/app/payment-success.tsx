import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  spacing,
  useThemeColors,
} from '../src/theme';
import { SuccessCheck, Confetti } from '../src/components/SuccessCheck';
import { Button } from '../src/components/Button';

// Canvas screen 41 SUCCESS · PAYMENT.
//
//   "Payment confirmed"
//   "$49 charged · your badge is live now"
//   [Done]
//
// The amount and what it bought are both in the subtitle because this is the
// only confirmation the user gets in-app -- a receipt arrives by email from
// the provider, not from here.
//
// The amount is passed in rather than hardcoded: verification is $49/yr for
// scouts and clubs, but the premium tiers on screens 83/84 are $29 and $119,
// and a screen that always says $49 would be wrong three times out of four.
export default function PaymentSuccess() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { amount, what, reference } = useLocalSearchParams<{
    amount?: string;
    what?: string;
    reference?: string;
  }>();

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="payGlow" cx="50%" cy="30%" r="60%">
            <Stop offset="0" stopColor="#1E8449" stopOpacity={0.25} />
            <Stop offset="1" stopColor="#1E8449" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#payGlow)" />
      </Svg>
      <Confetti />

      <SafeAreaView style={styles.body} edges={['top', 'bottom']}>
        <View style={styles.hero}>
          <SuccessCheck replayKey={reference} size={74} />
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Payment confirmed
          </Text>
          <Text style={styles.lede}>
            {[amount ? `${amount} charged` : 'Payment received', what || 'your badge is live now']
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {!!reference && <Text style={styles.reference}>Reference {reference}</Text>}
        </View>

        <View style={{ flex: 1 }} />

        <Button label="Done" variant="gold" onPress={() => router.replace('/(scout-tabs)/home')} />
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.primaryDark },
    body: { flex: 1, paddingHorizontal: cx(24), paddingBottom: cx(20) },
    hero: { alignItems: 'center', marginTop: cx(34) },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.headingLg,
      color: colors.white,
      marginTop: spacing.lg,
    },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      marginTop: 6,
    },
    reference: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: 'rgba(255,255,255,0.4)',
      marginTop: spacing.sm,
    },
  });
}
