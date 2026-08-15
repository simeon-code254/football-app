import { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { Checkbox } from '../src/components/Checkbox';
import * as authRepository from '../src/repositories/authRepository';
import { showAlert } from '../src/lib/alert';

// Matches Matobev v4.dc.html's SIGNUP FORM block, including the scout-only
// Organization/Club field — redesigned with a role-colored header (the flat
// white-on-white version read as visually flat) and password visibility
// toggles, which a static HTML mockup can't express.
export default function Signup() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { role } = useLocalSearchParams<{ role?: 'player' | 'scout' }>();
  const isScout = role === 'scout';
  const submitLock = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError = touched.email && email.trim() && !isEmailValid ? 'Enter a valid email address.' : undefined;
  const passwordError = touched.password && password.length > 0 && password.length < 8 ? 'Password must be at least 8 characters.' : undefined;
  const confirmError =
    touched.confirmPassword && confirmPassword.length > 0 && confirmPassword !== password ? 'Passwords do not match.' : undefined;

  const canSubmit =
    acceptedTerms &&
    acceptedPrivacy &&
    fullName.trim() &&
    email.trim() &&
    isEmailValid &&
    password.length >= 8 &&
    password === confirmPassword &&
    (!isScout || organization.trim()) &&
    (!retryAt || Date.now() >= retryAt);

  const retryLabel = retryAt ? `Try again in ${Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))}s` : null;

  const submit = async () => {
    if (!canSubmit) {
      setTouched({ fullName: true, email: true, password: true, confirmPassword: true, organization: true });
      return;
    }
    if (submitting || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      await authRepository.signUp({
        email: email.trim(),
        password,
        role: isScout ? 'scout' : 'player',
        fullName: fullName.trim(),
        organization: isScout ? organization.trim() : undefined,
      });
      router.push({ pathname: '/verify-email', params: { email: email.trim(), role: isScout ? 'scout' : 'player' } });
    } catch (err) {
      const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: unknown }).status) : null;
      if (status === 429) {
        const nextRetryAt = Date.now() + 60_000;
        setRetryAt(nextRetryAt);
        if (cooldownRef.current) clearTimeout(cooldownRef.current);
        cooldownRef.current = setTimeout(() => setRetryAt(null), 60_000);
        showAlert('Too many sign up attempts', 'Please wait a minute before trying again.');
        return;
      }
      showAlert('Sign up failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <View style={styles.headerTop}>
          <IconButton icon="chevron-left" light accessibilityLabel="Go back" onPress={() => router.back()} />
        </View>
        <View style={styles.roleBadge}>
          <Feather name={isScout ? 'search' : 'user'} size={22} color={colors.white} />
        </View>
        <Text style={styles.headerTitle}>{isScout ? 'Scout Sign Up' : 'Player Sign Up'}</Text>
        <Text style={styles.headerSub}>
          {isScout ? 'Start discovering talent across Africa' : 'Create your football profile in minutes'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fields}>
          <AppTextField label="Full Name" icon="user" placeholder="Enter full name" value={fullName} onChangeText={setFullName} />
          {isScout && (
            <AppTextField
              label="Organization / Club"
              icon="briefcase"
              placeholder="Club or organization name"
              value={organization}
              onChangeText={setOrganization}
            />
          )}
          <AppTextField
            label="Email Address"
            icon="mail"
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            onBlur={() => touch('email')}
            error={emailError}
          />
          <AppTextField
            label="Password"
            icon="lock"
            placeholder="Min 8 characters"
            isPassword
            value={password}
            onChangeText={setPassword}
            onBlur={() => touch('password')}
            error={passwordError}
          />
          <AppTextField
            label="Confirm Password"
            icon="lock"
            placeholder="Re-enter password"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => touch('confirmPassword')}
            error={confirmError}
          />
        </View>

        <View style={styles.checksCard}>
          <Checkbox checked={acceptedTerms} onToggle={() => setAcceptedTerms((v) => !v)}>
            I accept the <Text style={styles.link}>Terms & Conditions</Text>
          </Checkbox>
          <Checkbox checked={acceptedPrivacy} onToggle={() => setAcceptedPrivacy((v) => !v)}>
            I accept the <Text style={styles.link}>Privacy Policy</Text>
          </Checkbox>
        </View>

        <PrimaryButton
          label={submitting ? 'Creating account…' : `Create ${isScout ? 'Scout' : 'Player'} Account`}
          disabled={!canSubmit || submitting}
          loading={submitting}
          onPress={submit}
          style={styles.submitBtn}
        />
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Text style={styles.loginLink} onPress={() => router.push('/login')}>
            Login
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDark },
  header: { paddingBottom: 28, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', paddingTop: 4, marginBottom: 8 },
  roleBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.white },
  headerSub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    marginTop: -18,
  },
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32, flexGrow: 1 },
  fields: { gap: 14, marginBottom: 16 },
  checksCard: {
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 20,
  },
  link: { color: colors.primary, fontFamily: fontFamily.medium },
  submitBtn: { marginTop: 'auto' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  loginText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  loginLink: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.primary },
  });
}
