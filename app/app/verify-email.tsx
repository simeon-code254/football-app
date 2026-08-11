import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { AppTextField } from '../src/components/AppTextField';
import { IconButton } from '../src/components/IconButton';
import * as authRepository from '../src/repositories/authRepository';
import * as profileRepository from '../src/repositories/profileRepository';
import { useSessionStore } from '../src/store/useSessionStore';
import { showAlert } from '../src/lib/alert';

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
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
      showAlert('Could not resend', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const proceedAfterAuth = async (session: NonNullable<Awaited<ReturnType<typeof authRepository.getSession>>>) => {
    await hydrate(session);
    if (role === 'scout') {
      router.replace('/(scout-tabs)/home');
      return;
    }
    // A signed-in player may already have completed their profile in a
    // previous session (e.g. retrying this screen after already finishing
    // onboarding) — don't force them back through the wizard.
    try {
      const player = await profileRepository.getMyPlayer(session.user.id);
      router.push(player.profile_completed ? '/(player-tabs)/home' : '/profile-complete');
    } catch {
      router.push('/profile-complete');
    }
  };

  const checkVerified = async () => {
    setChecking(true);
    setError('');
    try {
      // Confirming the email happens wherever the link is tapped — a
      // separate process from this app — so there's usually no local
      // session yet even once the email is genuinely confirmed. Try the
      // fast path (a session already exists, e.g. from a deep link) first;
      // if that fails, fall back to asking for the password so we can
      // actually establish a session. signIn() itself is the real "is this
      // email confirmed?" check — Supabase rejects it with "Email not
      // confirmed" until the link has actually been tapped.
      const session = await authRepository.getSession();
      if (session?.user.email_confirmed_at) {
        await proceedAfterAuth(session);
        return;
      }
      setNeedsPassword(true);
    } finally {
      setChecking(false);
    }
  };

  const signInAndProceed = async () => {
    if (!email || !password) return;
    setChecking(true);
    setError('');
    try {
      const session = await authRepository.signIn(email, password);
      await proceedAfterAuth(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      setError(
        message.toLowerCase().includes('email not confirmed')
          ? "Your email isn't confirmed yet — check your inbox and tap the link, then try again."
          : message.toLowerCase().includes('invalid login credentials')
          ? 'Incorrect password.'
          : message
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
      </View>
      <View style={styles.content}>
        <View style={styles.iconBadge}>
          <Feather name="mail" size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.sub}>
          We've sent a verification link to{'\n'}
          <Text style={styles.email}>{email ?? 'your email'}</Text>
        </Text>

        {needsPassword && (
          <AppTextField
            label="Password"
            icon="lock"
            placeholder="Enter your password to continue"
            isPassword
            value={password}
            onChangeText={setPassword}
            style={{ width: '100%', marginBottom: 12 }}
          />
        )}
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <PrimaryButton
          label={checking ? 'Checking…' : needsPassword ? 'Continue' : "I've Verified My Email"}
          onPress={needsPassword ? signInAndProceed : checkVerified}
          disabled={needsPassword && !password}
          loading={checking}
          style={styles.cta}
        />
        {needsPassword && (
          <Text style={styles.hintText}>
            We need your password once to confirm the verification — this only happens the first time.
          </Text>
        )}
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
  header: { paddingHorizontal: 20, paddingTop: 4 },
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
  errorText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.error, marginBottom: 12, textAlign: 'center' },
  hintText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  resendText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center' },
  resendLink: { color: colors.primary, fontFamily: fontFamily.semiBold },
  resendLinkDisabled: { color: colors.textPlaceholder },
});
