import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import * as authRepository from '../src/repositories/authRepository';
import { useSessionStore } from '../src/store/useSessionStore';

const RESEND_COOLDOWN_S = 30;

// Matches Matobev v4.dc.html's EMAIL VERIFICATION block. Scouts skip the
// player-specific profile wizard (position/foot/jersey make no sense for a
// scout) and land straight on their dashboard, starting unverified — real
// scout verification is an admin review step, not a self-serve form.
export default function VerifyEmail() {
  const { email, role } = useLocalSearchParams<{ email?: string; role?: 'player' | 'scout' }>();
  const hydrate = useSessionStore((s) => s.hydrate);
  const [cooldown, setCooldown] = useState(0);
  const [justSent, setJustSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const resend = async () => {
    if (cooldown > 0 || !email) return;
    try {
      await authRepository.resendVerificationEmail(email);
      setJustSent(true);
      setCooldown(RESEND_COOLDOWN_S);
      timerRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      Alert.alert('Could not resend', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const checkVerified = async () => {
    setChecking(true);
    try {
      // Supabase's default confirm-email flow means there's no session on
      // this device until the user actually logs in — the email link is
      // confirmed wherever it's tapped, not necessarily here. So this can
      // only honestly succeed if a session already exists and is confirmed;
      // otherwise route to a real login rather than pretending it worked.
      const session = await authRepository.getSession();
      if (session?.user.email_confirmed_at) {
        await hydrate(session);
        if (role === 'scout') {
          router.replace('/(scout-tabs)/home');
        } else {
          router.push('/profile-complete');
        }
      } else {
        Alert.alert(
          'Not verified yet',
          "Once you've tapped the link in your email, log in to continue.",
          [{ text: 'Go to Login', onPress: () => router.replace('/login') }]
        );
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconBadge}>
          <Feather name="mail" size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.sub}>
          We've sent a verification link to{'\n'}
          <Text style={styles.email}>{email ?? 'your email'}</Text>
        </Text>
        <PrimaryButton
          label={checking ? 'Checking…' : "I've Verified My Email"}
          onPress={checkVerified}
          loading={checking}
          style={styles.cta}
        />
        {justSent && <Text style={styles.sentText}>Verification email sent.</Text>}
        <Pressable onPress={resend} disabled={cooldown > 0} hitSlop={8}>
          <Text style={styles.resendText}>
            Didn't receive it?{' '}
            <Text style={[styles.resendLink, cooldown > 0 && styles.resendLinkDisabled]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
            </Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginBottom: 6 },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 32,
  },
  email: { color: colors.textPrimary, fontFamily: fontFamily.semiBold },
  cta: { width: '100%', marginBottom: 12 },
  sentText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.success, marginBottom: 8 },
  resendText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center' },
  resendLink: { color: colors.primary, fontFamily: fontFamily.semiBold },
  resendLinkDisabled: { color: colors.textPlaceholder },
});
