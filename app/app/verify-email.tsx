import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Keyboard } from 'react-native';
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
import { Button, LinkButton } from '../src/components/Button';
import * as authRepository from '../src/repositories/authRepository';
import { useSessionStore } from '../src/store/useSessionStore';
import { showAlert } from '../src/lib/alert';

// Canvas screen 06 VERIFY EMAIL.
//
//   60x60 rounded envelope tile on #EEF2F6
//   "Check your email"                    .h 20px w800
//   "We sent a 6-digit code to <email>"
//   six 46px boxes, filled ones outlined gold, the active one underlined navy
//   "Resend in 00:42"
//   [Verify]
//
// -- TWO PATHS, ONE SCREEN --
//
// The canvas draws a code. The Supabase project currently emails a link (see
// authRepository.verifyEmailOtp for the template change that switches it). So
// this screen does both: the user can type the code, and if their email only
// contained a link, tapping it still confirms the account and the poll below
// notices and moves them on. Neither path dead-ends while the template is
// whatever it currently is.
const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;
const POLL_MS = 3000;

export default function VerifyEmail() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { email = '', role } = useLocalSearchParams<{ email?: string; role?: string }>();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);
  const hydrate = useSessionStore((s) => s.hydrate);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // The link path: if the user confirms in their mail client instead of typing
  // the code, nothing here would otherwise ever fire. Polling is the only
  // signal available -- Supabase does not push a confirmation to this device.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        if (await authRepository.isEmailConfirmed()) {
          clearInterval(id);
          const session = await authRepository.getSession();
          await hydrate(session);
          router.replace('/profile-complete');
        }
      } catch {
        // Offline, or no session yet. Keep polling rather than surfacing an
        // error for something the user did not do.
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [hydrate]);

  const submit = async (value: string) => {
    if (value.length !== CODE_LENGTH || submitting) return;
    setSubmitting(true);
    Keyboard.dismiss();
    try {
      await authRepository.verifyEmailOtp(String(email), value);
      const session = await authRepository.getSession();
      await hydrate(session);
      router.replace(!role || role === 'player' ? '/profile-complete' : '/(scout-tabs)/home');
    } catch (e) {
      setCode('');
      showAlert(
        'That code did not work',
        e instanceof Error && /expired|invalid/i.test(e.message)
          ? 'Check the code and try again, or use the link in the email instead.'
          : 'Something went wrong. Try again in a moment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    try {
      await authRepository.resendVerificationEmail(String(email));
      setSecondsLeft(RESEND_SECONDS);
    } catch {
      showAlert('Could not resend', 'Check your connection and try again.');
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.envelope}>
          <Feather name="mail" size={26} color={colors.primary} />
        </View>

        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          Check your email
        </Text>
        <Text style={styles.subtitle}>
          We sent a {CODE_LENGTH}-digit code to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        {/*
          One real input behind six drawn boxes. Six separate inputs is the
          usual approach and it fights the platform: SMS/email autofill delivers
          the whole code to a single field, and backspacing between six fields
          is fiddly. The boxes are presentational; the input is one field.
        */}
        <Pressable style={styles.boxRow} onPress={() => inputRef.current?.focus()}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const char = code[i];
            const active = i === code.length;
            return (
              <View
                key={i}
                style={[styles.box, char ? styles.boxFilled : null, active ? styles.boxActive : null]}
              >
                <Text style={styles.boxText}>{char ?? ''}</Text>
              </View>
            );
          })}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
            setCode(digits);
            if (digits.length === CODE_LENGTH) submit(digits);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus
          style={styles.hiddenInput}
          accessibilityLabel={'Verification code, ' + CODE_LENGTH + ' digits'}
        />

        {secondsLeft > 0 ? (
          <Text style={styles.resend}>
            Resend in <Text style={styles.resendClock}>{mm}:{ss}</Text>
          </Text>
        ) : (
          <LinkButton label="Resend the code" tone="onPaper" onPress={resend} />
        )}

        <View style={{ flex: 1 }} />

        <Button
          label="Verify"
          variant="navy"
          loading={submitting}
          disabled={code.length !== CODE_LENGTH}
          onPress={() => submit(code)}
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, alignItems: 'center', paddingHorizontal: cx(24), paddingBottom: cx(24) },
    envelope: {
      width: cx(60),
      height: cx(60),
      borderRadius: 4,
      backgroundColor: colors.infoTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
    },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.headingLg,
      color: colors.textPrimary,
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.4,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },
    email: { fontFamily: fontFamily.bold, color: colors.textPrimary },
    boxRow: { flexDirection: 'row', gap: spacing.sm, marginTop: cx(22), width: '100%' },
    box: {
      flex: 1,
      minWidth: 0,
      height: 52,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // The canvas outlines entered digits in gold and underlines the caret box.
    boxFilled: { borderColor: colors.gold },
    boxActive: { borderBottomWidth: 2, borderBottomColor: colors.primaryDark },
    boxText: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.heading,
      color: colors.textPrimary,
    },
    // Off-screen rather than opacity 0 -- a zero-opacity input still takes
    // taps on some Android builds and would swallow presses on the boxes.
    hiddenInput: { position: 'absolute', top: -1000, left: -1000, height: 1, width: 1 },
    resend: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      marginTop: spacing.lg,
    },
    resendClock: { fontFamily: fontFamily.bold, color: colors.primary },
    cta: { width: '100%' },
  });
}
