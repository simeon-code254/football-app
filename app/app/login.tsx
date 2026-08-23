import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
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
import { Logo } from '../src/components/Logo';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';
import * as profileRepository from '../src/repositories/profileRepository';
import { showAlert } from '../src/lib/alert';

// -- DESIGNED FRESH, NOT PORTED --
//
// The canvas has no login screen. It draws 87 and this is not one of them:
// screen 02 offers "Sign in" and screen 68 handles a forgotten password, but
// the sign-in form itself was never mocked.
//
// So this is built from the canvas's own vocabulary rather than invented:
// paper ground, a Barlow Condensed display heading, the kicker-labelled
// `Field` from screens 05/07/08, and the navy-on-paper primary button. It
// should look like it came from the same deck, because every part of it did.
export default function Login() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hydrate = useSessionStore((s) => s.hydrate);

  const submit = async () => {
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    try {
      const session = await authRepository.signIn(email.trim(), password);
      // Route from the role read directly rather than waiting on the async
      // auth-state listener, whose timing is not guaranteed here. A player who
      // abandoned the profile wizard must land back on it, not on the tabs
      // with a blank profile.
      const profile = await profileRepository.getMyProfile(session.user.id);

      // Admin accounts have no players/scouts/clubs row and no UI in this app;
      // fetching either 406s. They use the separate web dashboard.
      //
      // Clubs are NOT in this bucket. This check previously read
      // `!== 'player' && !== 'scout'`, which signed every club account out at
      // the door and told them they were an admin.
      if (profile.role !== 'player' && profile.role !== 'scout' && profile.role !== 'club') {
        await authRepository.signOut();
        showAlert(
          'This account is not supported here',
          'Admin accounts use the Matobev web dashboard, not this app.'
        );
        return;
      }

      await hydrate(session);

      if (profile.role === 'scout') {
        router.replace('/(scout-tabs)/home');
      } else if (profile.role === 'club') {
        router.replace('/(club-tabs)/home');
      } else {
        const player = await profileRepository.getMyPlayer(session.user.id);
        router.replace(player.profile_completed ? '/(player-tabs)/home' : '/profile-complete');
      }
    } catch (err) {
      showAlert('Sign in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            style={styles.back}
          >
            <Feather name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>

          <Logo variant="navy" size={cx(24)} style={styles.mark} />
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Welcome back.
          </Text>
          <Text style={styles.subtitle}>Sign in to pick up where you left off.</Text>

          <View style={styles.fields}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
            />
            <View>
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={submit}
                returnKeyType="go"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={10}
                style={styles.reveal}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <LinkButton
            label="Forgot your password?"
            tone="onPaper"
            onPress={() => router.push('/forgot-password')}
            style={styles.forgot}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Sign in"
            variant="navy"
            loading={submitting}
            disabled={!email.trim() || !password}
            onPress={submit}
          />
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>New here? </Text>
            <LinkButton
              label="Create an account"
              tone="onPaper"
              onPress={() => router.replace('/role-select')}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: cx(24), paddingBottom: spacing.xl },
    back: { alignSelf: 'flex-start', marginBottom: spacing.lg },
    mark: { marginBottom: spacing.md },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      color: colors.textMuted,
      marginTop: 2,
    },
    fields: { gap: spacing.lg, marginTop: spacing.xxl },
    // Sits over the password Field's input box, which is 48 tall under a
    // ~16px label plus 4px gap.
    reveal: { position: 'absolute', right: spacing.lg, top: 34 },
    forgot: { alignSelf: 'flex-start', marginTop: spacing.sm },
    footer: { paddingHorizontal: cx(24), paddingTop: spacing.md },
    signupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    signupText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
    },
  });
}
