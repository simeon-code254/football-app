import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  spacing,
  useThemeColors,
} from '../src/theme';
import { PlanCard } from '../src/components/PlanCard';
import { Button } from '../src/components/Button';
import { Kicker } from '../src/components/Kicker';
import { VerificationBadge } from '../src/components/VerificationBadge';
import { useSessionStore } from '../src/store/useSessionStore';
import { showAlert } from '../src/lib/alert';
import { BILLING_ENABLED } from '../src/repositories/billingRepository';

// Canvas screens 83 SCOUT PREMIUM TIERS and 84 CLUB PREMIUM.
//
// One screen, because they are the same layout with different rows and the
// viewer's own role already decides which they should see. A scout who lands on
// the club plans could not buy one anyway.
//
//   83  Verified $49/yr · Premium $29/mo (MOST PICKED) · Agency $89/mo
//   84  Verified club $49/yr · Academy $119/mo (YOUR PLAN) · League "Talk to us"
//
// Prices are transcribed exactly from the canvas. They are presentational only
// -- nothing here charges anything, and the CTA says so (see billingRepository
// for why that is deliberate rather than unfinished).
const SCOUT_PLANS = [
  {
    name: 'Verified',
    price: '$49',
    period: '/yr',
    blurb: 'The badge, 20 contacts a month, basic filters.',
  },
  {
    name: 'Premium',
    price: '$29',
    period: '/mo',
    tag: 'Most picked',
    highlighted: true,
    features: [
      'Unlimited contacts',
      'Advanced filters & priority search',
      'Full attribute breakdown',
      'Bulk shortlist export',
    ],
  },
  {
    name: 'Agency',
    price: '$89',
    period: '/mo',
    blurb: 'Everything in Premium, five seats, shared shortlists.',
  },
];

const CLUB_PLANS = [
  {
    name: 'Verified club',
    price: '$49',
    period: '/yr',
    blurb: 'Gold badge, 2 open trials, 2 scout seats.',
  },
  {
    name: 'Academy',
    price: '$119',
    period: '/mo',
    tag: 'Your plan',
    highlighted: true,
    features: [
      'Unlimited open trials',
      'Ten scout seats, shared shortlists',
      'Applicant CSV export',
      'Club page with your crest',
    ],
  },
  {
    name: 'League',
    price: 'Talk to us',
    blurb: 'Multi-club accounts and federation reporting.',
  },
];

export default function Premium() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const role = useSessionStore((s) => s.role);
  const club = useSessionStore((s) => s.club);

  const isClub = role === 'club';
  const plans = isClub ? CLUB_PLANS : SCOUT_PLANS;

  const start = () => {
    if (!BILLING_ENABLED) {
      showAlert(
        'Payments are not connected yet',
        'Matobev has no payment provider configured. The plans and prices here are final, but nothing can be charged until M-Pesa or a card processor is wired up.'
      );
      return;
    }
    router.push('/checkout');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
            <Feather name="chevron-left" size={22} color={colors.white} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <VerificationBadge role={isClub ? 'club' : 'scout'} size={38} glyph="role" />
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              {isClub ? 'Club plans' : 'Choose your plan'}
            </Text>
            <Kicker tone="onNavy">
              {isClub ? club?.name ?? 'Your club' : 'Scout accounts'}
            </Kicker>
          </View>

          <View style={styles.plans}>
            {plans.map((p) => (
              <PlanCard
                key={p.name}
                name={p.name}
                price={p.price}
                period={'period' in p ? p.period : undefined}
                blurb={'blurb' in p ? p.blurb : undefined}
                features={'features' in p ? p.features : undefined}
                tag={'tag' in p ? p.tag : undefined}
                highlighted={'highlighted' in p ? p.highlighted : false}
              />
            ))}
          </View>

          {isClub && (
            <Text style={styles.renewal}>
              {club?.verification_status === 'verified'
                ? 'Your club badge renews yearly. Cancel any time.'
                : 'Verification is checked by a person before the badge appears.'}
            </Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={isClub ? 'Manage plan' : 'Start Premium'}
            variant="gold"
            onPress={start}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.primaryDark },
    header: { paddingHorizontal: cx(18) },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xl },
    hero: { alignItems: 'center', marginTop: spacing.md },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.white,
      marginTop: spacing.md,
    },
    plans: { gap: spacing.lg, marginTop: spacing.xxl },
    renewal: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: 'rgba(255,255,255,0.45)',
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    footer: { paddingHorizontal: cx(18), paddingBottom: spacing.md },
  });
}
