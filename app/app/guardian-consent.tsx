import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors, useIsDark, elevation } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { AppTextField } from '../src/components/AppTextField';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as guardianRepository from '../src/repositories/guardianRepository';
import { showAlert } from '../src/lib/alert';

// Where an under-18 player goes to get a parent or guardian's permission for
// AI analysis.
//
// The consent itself is confirmed on a web page served by the guardian-consent
// Edge Function, not here -- a child tapping "my parent agrees" inside their
// own app is not consent, it is the child consenting to themselves. The player
// sends a link; the guardian opens it and decides.
//
// Sharing goes through the OS share sheet rather than email, because a
// WhatsApp message is how this audience actually reaches a parent, and it
// needs no mail infrastructure to work.
export default function GuardianConsentScreen() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: consent, isLoading, error, refetch } = useQuery({
    queryKey: ['guardianConsent', userId],
    enabled: !!userId,
    queryFn: () => guardianRepository.getMyConsent(userId!),
  });

  const share = async (token: string) => {
    const link = guardianRepository.consentLink(token);
    try {
      await Share.share({
        message: `Please confirm you are happy for me to use Matobev, including having my football videos analysed: ${link}`,
      });
    } catch {
      // Dismissing the share sheet is not an error worth reporting.
    }
  };

  const submit = async () => {
    if (!userId) return;
    if (!name.trim() || !email.trim()) {
      showAlert('Almost there', 'Enter your parent or guardian name and email.');
      return;
    }
    setSaving(true);
    try {
      const row = await guardianRepository.requestConsent(userId, { name, email, relationship });
      await refetch();
      await share(row.confirmation_token);
    } catch (err) {
      showAlert('Could not send', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} accessibilityLabel="Back" />
        <Text style={styles.headerTitle}>Parent or guardian</Text>
        <View style={{ width: 40 }} />
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonRow count={3} />}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {consent?.confirmed_at ? (
            <View style={[styles.card, elevation('raised', isDark)]}>
              <Feather name="check-circle" size={22} color={colors.success} />
              <Text style={styles.cardTitle}>Consent confirmed</Text>
              <Text style={styles.cardText}>
                {consent.guardian_name} confirmed this. You can upload videos for AI analysis.
              </Text>
            </View>
          ) : consent ? (
            <View style={[styles.card, elevation('raised', isDark)]}>
              <Feather name="clock" size={22} color={colors.goldDark} />
              <Text style={styles.cardTitle}>Waiting on {consent.guardian_name}</Text>
              <Text style={styles.cardText}>
                They need to open the link and confirm. You can send it again if it got lost.
              </Text>
              <PrimaryButton
                label="Send the link again"
                onPress={() => share(consent.confirmation_token)}
                style={{ width: '100%', marginTop: spacing.lg }}
              />
            </View>
          ) : (
            <>
              <Text style={styles.intro}>
                Because you are under 18, a parent or guardian has to agree before your videos can be analysed. The
                analysis measures how you move from the video, so we ask for it separately.
              </Text>
              <Text style={styles.introMuted}>
                You can still post highlights without this. Only the AI rating needs permission.
              </Text>

              <AppTextField label="Their name" value={name} onChangeText={setName} placeholder="e.g. Jane Odhiambo" />
              <AppTextField
                label="Their email"
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <AppTextField
                label="Relationship (optional)"
                value={relationship}
                onChangeText={setRelationship}
                placeholder="e.g. Mother"
              />

              <PrimaryButton
                label={saving ? 'Preparing…' : 'Send them the link'}
                onPress={submit}
                disabled={saving}
                style={{ width: '100%', marginTop: spacing.lg }}
              />
              <Text style={styles.footnote}>
                We only store their name and email as a record that consent was given. They can withdraw it at any
                time.
              </Text>
            </>
          )}
        </ScrollView>
      </QueryState>
    </SafeAreaView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surfaceMuted },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    body: { padding: spacing.xl, gap: spacing.md },
    intro: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 21 },
    introMuted: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 18,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    cardTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    cardText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    footnote: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 17,
      marginTop: spacing.sm,
    },
  });
}
