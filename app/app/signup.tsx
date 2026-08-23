import { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { openLegal } from '../src/lib/legal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors, useIsDark, elevation } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { Checkbox } from '../src/components/Checkbox';
import * as authRepository from '../src/repositories/authRepository';
import { ID_CHECKED_ROLES, type Role } from '../src/repositories/authRepository';
import { showAlert } from '../src/lib/alert';

// Canvas screen 05 SIGN UP.
//
// One form, three roles. Scouts and clubs both get the organisation field and
// both are ID-checked; players get neither. The copy below is the only thing
// that differs between them, so it is a lookup rather than three branches
// scattered through the JSX.
const ROLE_COPY: Record<Role, {
  title: string;
  subtitle: string;
  noun: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}> = {
  player: {
    title: 'Player Sign Up',
    subtitle: 'Create your football profile in minutes',
    noun: 'Player',
    icon: 'user',
  },
  scout: {
    title: 'Scout Sign Up',
    subtitle: 'Start discovering talent across Africa',
    noun: 'Scout',
    icon: 'search',
  },
  club: {
    title: 'Club Sign Up',
    subtitle: 'Post trials and manage your scouting team',
    noun: 'Club',
    icon: 'home',
  },
};
export default function Signup() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const { role: roleParam } = useLocalSearchParams<{ role?: Role }>();
  // Anything unrecognised falls back to player, which is the only role that
  // needs no verification -- never silently up-ranking someone into an
  // ID-checked role because a param was malformed.
  const role: Role = roleParam === 'scout' || roleParam === 'club' ? roleParam : 'player';
  // Scouts and clubs both supply an organisation name and both are ID-checked.
  const needsOrg = ID_CHECKED_ROLES.includes(role);
  const copy = ROLE_COPY[role];
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
    (!needsOrg || organization.trim()) &&
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
        role,
        fullName: fullName.trim(),
        organization: needsOrg ? organization.trim() : undefined,
      });
      router.push({ pathname: '/verify-email', params: { email: email.trim(), role } });
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
          <Feather name={copy.icon} size={22} color={colors.white} />
        </View>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <Text style={styles.headerSub}>
          {copy.subtitle}
        </Text>
      </LinearGradient>

      <ScrollView
        style={[styles.sheet, elevation('overlay', isDark)]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fields}>
          <AppTextField label="Full Name" icon="user" placeholder="Enter full name" value={fullName} onChangeText={setFullName} />
          {needsOrg && (
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
          {/* The document names are real links now. They were styled as links
              and did nothing, so people were being asked to accept two
              documents they had no way to open -- which is not informed
              consent, and is exactly the kind of thing that makes the
              acceptance worthless if it is ever tested.

              onPress is stopped from propagating so tapping the link opens the
              document instead of silently toggling the checkbox underneath. */}
          <Checkbox checked={acceptedTerms} onToggle={() => setAcceptedTerms((v) => !v)}>
            I accept the{' '}
            <Text
              style={styles.link}
              onPress={(e) => {
                e.stopPropagation();
                openLegal('terms');
              }}
              accessibilityRole="link"
              accessibilityLabel="Read the Terms of Service"
            >
              Terms &amp; Conditions
            </Text>
          </Checkbox>
          <Checkbox checked={acceptedPrivacy} onToggle={() => setAcceptedPrivacy((v) => !v)}>
            I accept the{' '}
            <Text
              style={styles.link}
              onPress={(e) => {
                e.stopPropagation();
                openLegal('privacy');
              }}
              accessibilityRole="link"
              accessibilityLabel="Read the Privacy Policy"
            >
              Privacy Policy
            </Text>
          </Checkbox>
        </View>

        <PrimaryButton
          label={submitting ? 'Creating account…' : `Create ${copy.noun} Account`}
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
