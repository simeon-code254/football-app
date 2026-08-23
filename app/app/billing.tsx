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
import { Kicker } from '../src/components/Kicker';
import { Button } from '../src/components/Button';
import { QueryState } from '../src/components/QueryState';
import { useSessionStore } from '../src/store/useSessionStore';
import { showAlert } from '../src/lib/alert';
import * as billingRepository from '../src/repositories/billingRepository';

// Canvas screen 85 BILLING HISTORY.
//
//   "Billing"
//   M-Pesa ···· 4182 · DEFAULT METHOD                          CHANGE
//   HISTORY
//     Club verification   14 MAR 2026   $49.00
//     Academy plan         1 AUG 2026  $119.00
//     Academy plan         1 JUL 2026  $119.00
//   [Download receipts]
//
// -- WHAT THIS SHOWS TODAY --
//
// Nothing, honestly. billingRepository throws until a provider is connected, so
// QueryState renders the error and the user is told why rather than shown an
// invented history. Fabricating three plausible-looking transactions on a
// billing screen would be the single worst place in this app to fake data --
// it is the screen someone opens specifically to check what they were charged.
export default function Billing() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);

  const { data: method } = useQuery({
    queryKey: ['billingMethod', userId],
    enabled: !!userId,
    queryFn: () => billingRepository.getDefaultMethod(userId!),
    // The seam throws by design; a retry storm against it helps nobody.
    retry: false,
  });

  const { data: receipts, isLoading, error, refetch } = useQuery({
    queryKey: ['billingReceipts', userId],
    enabled: !!userId,
    queryFn: () => billingRepository.listReceipts(userId!),
    retry: false,
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Billing</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.methodCard}>
          <View style={styles.methodIcon}>
            <Feather name="smartphone" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodLabel}>{method?.label ?? 'No payment method'}</Text>
            <Kicker size={fontSize.caption}>Default method</Kicker>
          </View>
          <Pressable
            onPress={() =>
              showAlert(
                'Payments are not connected yet',
                'There is no payment provider configured, so there is no method to change.'
              )
            }
            hitSlop={8}
          >
            <Kicker style={{ color: colors.primary }}>Change</Kicker>
          </Pressable>
        </View>

        <Kicker style={styles.sectionLabel}>History</Kicker>

        <QueryState
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          isEmpty={!receipts?.length}
          emptyIcon="file-text"
          emptyMessage="No charges yet."
        >
          <View style={styles.list}>
            {(receipts ?? []).map((r) => (
              <View key={r.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.description}</Text>
                  <Kicker size={fontSize.caption}>{r.paidAt}</Kicker>
                </View>
                <Text style={styles.rowAmount}>
                  {(r.amountCents / 100).toFixed(2)} {r.currency}
                </Text>
              </View>
            ))}
          </View>
        </QueryState>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Download receipts"
          variant="navy"
          onPress={() =>
            showAlert(
              'No receipts to download',
              'Receipts are issued by the payment provider, which is not connected yet.'
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
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: cx(18) },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
    },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xl },
    methodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginTop: spacing.md,
    },
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
    sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
    list: { gap: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    rowTitle: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    rowAmount: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    footer: { paddingHorizontal: cx(18), paddingBottom: spacing.md },
  });
}
