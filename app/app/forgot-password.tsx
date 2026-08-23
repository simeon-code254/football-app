import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  spacing,
  useThemeColors,
} from '../src/theme';
import { Field } from '../src/components/Field';
import { Button, LinkButton } from '../src/components/Button';
import { SuccessCheck } from '../src/components/SuccessCheck';
import * as authRepository from '../src/repositories/authRepository';
import { showAlert } from '../src/lib/alert';

// Canvas screen 68 FORGOT PASSWORD.
//
//   BACK TO SIGN IN
//   "Reset your password"
//   "Enter the email on your account. We'll send a link that works for one hour."
//   EMAIL
//   [Send reset link]
//
// -- THE CONFIRMATION DOES NOT SAY WHETHER THE ACCOUNT EXISTS --
//
// Supabase deliberately does not error on resetPasswordForEmail for an unknown
// address, and this screen must not undo that: telling someone "no account with
// that email" turns the reset form into an account-enumeration oracle. So the
// success state is the same either way, and says "if that address has an
// account" rather than "we sent you a link".
export default function ForgotPassword() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async () => {
    if (!valid || sending) return;
    setSending(true);
    try {
      await authRepository.sendPasswordReset(email.trim());
      setSent(true);
    } catch {
      showAlert('Could not send the link', 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.done}>
          <SuccessCheck replayKey={email} size={64} />
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Check your email
          </Text>
          <Text style={[styles.lede, styles.ledeCentered]}>
            If {email.trim()} has an account, a reset link is on its way. It works for one hour.
          </Text>
          <View style={{ flex: 1 }} />
          <Button label="Back to sign in" variant="navy" onPress={() => router.replace('/login')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <LinkButton
            label="Back to sign in"
            tone="onPaper"
            onPress={() => router.replace('/login')}
            style={styles.back}
          />

          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Reset your password
          </Text>
          <Text style={styles.lede}>
            Enter the email on your account. We&apos;ll send a link that works for one hour.
          </Text>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            onSubmitEditing={submit}
            returnKeyType="send"
            style={styles.field}
          />

          <View style={{ flex: 1 }} />

          <Button
            label="Send reset link"
            variant="navy"
            loading={sending}
            disabled={!valid}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, paddingHorizontal: cx(24), paddingBottom: spacing.md },
    done: { flex: 1, alignItems: 'center', paddingHorizontal: cx(24), paddingTop: cx(48), paddingBottom: spacing.md },
    back: { alignSelf: 'flex-start' },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.5,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    ledeCentered: { textAlign: 'center' },
    field: { marginTop: spacing.xxl, alignSelf: 'stretch' },
  });
}
