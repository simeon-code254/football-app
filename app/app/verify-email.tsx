import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { useSessionStore } from '../src/store/useSessionStore';

const RESEND_COOLDOWN_S = 30;

// Matches Matobev v4.dc.html's EMAIL VERIFICATION block. Scouts skip the
// player-specific profile wizard (position/foot/jersey make no sense for a
// scout) and land straight on their dashboard, starting unverified — real
// scout verification is an admin review step, not a self-serve form.
export default function VerifyEmail() {
  const role = useSessionStore((s) => s.role);
  const setScoutVerified = useSessionStore((s) => s.setScoutVerified);
  const [cooldown, setCooldown] = useState(0);
  const [justSent, setJustSent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const resend = () => {
    if (cooldown > 0) return;
    // TODO(backend wiring): supabase.auth.resend({ type: 'signup', email })
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
          <Text style={styles.email}>you@email.com</Text>
        </Text>
        <PrimaryButton
          label="I've Verified My Email"
          onPress={() => {
            if (role === 'scout') {
              setScoutVerified(false);
              router.replace('/(scout-tabs)/home');
            } else {
              router.push('/profile-complete');
            }
          }}
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
