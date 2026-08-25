import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
import { MoneyRow } from '../src/components/PlanCard';
import { Button } from '../src/components/Button';
import { Kicker } from '../src/components/Kicker';
import { VerificationBadge } from '../src/components/VerificationBadge';
import { useSessionStore } from '../src/store/useSessionStore';
import { showAlert } from '../src/lib/alert';
import * as billingRepository from '../src/repositories/billingRepository';
import type { PaymentMethod } from '../src/repositories/billingRepository';

// Canvas screen 82 VERIFICATION PAYMENT.
//
//   "Checkout"
//   [gold hexagon] Club verification · NAIROBI FC · 12 MONTHS      $49
//   PAY WITH
//     (•) M-Pesa   ···· 4182
//     ( ) Card     VISA · MASTERCARD
//   Verification, 12 months   $49.00
//   VAT                        $0.00
//   Total today                $49.00
//   [Pay $49]
//   RENEWS YEARLY · CANCEL ANY TIME
//
// -- M-PESA IS FIRST BECAUSE THE CANVAS PUTS IT FIRST --
//
// That ordering is a product decision, not a layout one: this is a Kenya-first
// product, and card penetration among the clubs and scouts paying $49 is far
// lower than mobile money. It is the default selection here for the same
// reason.
//
// Nothing on this screen charges anything -- see billingRepository. The button
// is live and calls the seam; the seam throws, and the error is shown honestly
// rather than swallowed into a fake success.
const METHODS: { key: PaymentMethod; label: string; detail: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'mpesa', label: 'M-Pesa', detail: 'Mobile money', icon: 'smartphone' },
  { key: 'card', label: 'Card', detail: 'Visa · Mastercard', icon: 'credit-card' },
];

export default function Checkout() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const club = useSessionStore((s) => s.club);
  const role = useSessionStore((s) => s.role);
  const { amount = '$49', label = 'Verification, 12 months' } = useLocalSearchParams<{
    amount?: string;
    label?: string;
  }>();

  const [method, setMethod] = useState<PaymentMethod>('mpesa');
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    setPaying(true);
    try {
      const receipt = await billingRepository.startPayment({
        amountCents: 4900,
        currency: 'USD',
        description: String(label),
        method,
      });
      router.replace({
        pathname: '/payment-success',
        params: { amount: String(amount), what: 'your badge is live now', reference: receipt.reference },
      });
    } catch (e) {
      // The seam throws by design. Say what is actually true rather than
      // "something went wrong", which would imply a transient failure the user
      // could fix by retrying.
      showAlert(
        'Payments are not connected yet',
        e instanceof Error ? e.message : 'No payment provider is configured.'
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <Feather name="lock" size={16} color={colors.success} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <VerificationBadge role={role === 'club' ? 'club' : 'scout'} size={34} glyph="role" />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>
              {role === 'club' ? 'Club verification' : 'Scout verification'}
            </Text>
            <Kicker size={fontSize.caption} tone="onNavy">
              {[club?.name, '12 months'].filter(Boolean).join(' · ')}
            </Kicker>
          </View>
          <Text style={styles.summaryPrice}>{amount}</Text>
        </View>

        <Kicker style={styles.sectionLabel}>Pay with</Kicker>
        <View style={styles.methods}>
          {METHODS.map((m) => {
            const active = m.key === method;
            return (
              <Pressable
                key={m.key}
                style={[styles.method, active && styles.methodOn]}
                onPress={() => setMethod(m.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.methodIcon}>
                  <Feather name={m.icon} size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  <Kicker size={fontSize.caption}>{m.detail}</Kicker>
                </View>
                <View style={[styles.radio, active && styles.radioOn]}>
                  {active && <Feather name="check" size={11} color={colors.primaryDark} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.totals}>
          <MoneyRow label={String(label)} amount="$49.00" />
          <MoneyRow label="VAT" amount="$0.00" />
          <View style={styles.rule} />
          <MoneyRow label="Total today" amount="$49.00" emphasis />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={`Pay ${amount}`} variant="navy" loading={paying} onPress={pay} />
        <Kicker style={styles.renewal}>Renews yearly · cancel any time</Kicker>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: cx(18),
    },
    headerTitle: {
      flex: 1,
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
    },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xl },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.primaryDark,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginTop: spacing.md,
    },
    summaryTitle: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.white,
    },
    summaryPrice: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.headingLg,
      color: colors.gold,
    },
    sectionLabel: { marginTop: spacing.xl },
    methods: { gap: spacing.sm, marginTop: spacing.sm },
    method: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    methodOn: { borderColor: colors.gold },
    methodIcon: {
      width: 34,
      height: 34,
      borderRadius: radii.sm,
      backgroundColor: colors.infoTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    methodLabel: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.borderDashed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { backgroundColor: colors.gold, borderColor: colors.gold },
    totals: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginTop: spacing.xl,
    },
    rule: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
    footer: { paddingHorizontal: cx(18), paddingBottom: spacing.md },
    renewal: { textAlign: 'center', marginTop: spacing.sm },
  });
}
