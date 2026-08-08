import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';

// Login's "Forgot Password?" was dead text. Real send-reset-email call
// (supabase.auth.resetPasswordForEmail) lands during backend wiring; the
// flow and success state are real now.
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!email.trim()) return;
    setSending(true);
    await new Promise((res) => setTimeout(res, 500));
    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.successWrap}>
          <View style={styles.successBadge}>
            <Feather name="mail" size={32} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successSub}>
            If an account exists for <Text style={styles.email}>{email}</Text>, we've sent a link to reset your password.
          </Text>
          <PrimaryButton label="Back to Login" onPress={() => router.replace('/login')} style={{ width: '100%', marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.sub}>Enter the email address linked to your account and we'll send you a reset link.</Text>
        <AppTextField
          label="Email"
          icon="mail"
          placeholder="you@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <PrimaryButton
          label={sending ? 'Sending…' : 'Send Reset Link'}
          onPress={send}
          disabled={!email.trim()}
          loading={sending}
          style={{ marginTop: 20 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 4 },
  content: { paddingHorizontal: 28, paddingTop: 20 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.displayLg, color: colors.textPrimary, marginBottom: 4 },
  sub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginBottom: 28, lineHeight: 20 },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EBF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginBottom: 8 },
  successSub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  email: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
});
