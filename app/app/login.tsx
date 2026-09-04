import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  spacing,
  useThemeColors,
  useIsDark,
  elevation,
} from '../src/theme';
import { Button } from '../src/components/Button';
import { Logo } from '../src/components/Logo';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';
import * as profileRepository from '../src/repositories/profileRepository';
import { showAlert } from '../src/lib/alert';
import { useFadeUp, useSheen } from '../src/lib/motion';
import { images } from '../src/constants/images';

// -- SCREEN 05B: LOG IN --
//
// The design draws this as a full-bleed hero photograph with a four-stop
// gradient overlay, glassmorphism inputs (frosted glass), and a gold CTA
// with an animated sheen sweep. This is the cinematic counterpart to the
// paper-ground sign-up form.
//
// Glassmorphism: React Native has no `backdrop-filter`, so the frosted look
// is achieved with a semi-transparent background on the input and the photo
// behind it doing the blurring implicitly. On iOS this works well; on
// Android the effect is subtler because the blur is not applied per-view.
// The design's intent (dark, translucent inputs floating on photography)
// still reads correctly on both platforms.
const { height: SCREEN_H } = Dimensions.get('window');

export default function Login() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const fadeUp = useFadeUp(500);
  const sheenStyle = useSheen(2600);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const hydrate = useSessionStore((s) => s.hydrate);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    try {
      const session = await authRepository.signIn(email.trim(), password);
      const profile = await profileRepository.getMyProfile(session.user.id);

      // Admin accounts have no players/scouts/clubs row and no UI in this app.
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

  const inert = submitting;
  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <View style={styles.root}>
      {/* Full-bleed hero photograph */}
      <Image
        source={images.authHero}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />

      {/* Four-stop gradient overlay per design */}
      <LinearGradient
        colors={[
          'rgba(29,45,61,0.55)',
          'rgba(29,45,61,0.35)',
          'rgba(29,45,61,0.88)',
          '#1d2d3d',
        ]}
        locations={[0, 0.32, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            style={styles.back}
          >
            <Feather name="chevron-left" size={22} color="#fff" />
          </Pressable>

          {/* Brand mark + heading (animated entry) */}
          <Animated.View style={fadeUp}>
            <Logo variant="gold" size={cx(24)} style={styles.mark} />
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              Welcome back.
            </Text>
            <Text style={styles.subtitle}>Sign in to pick up where you left off.</Text>
          </Animated.View>

          {/* Glassmorphism form fields */}
          <Animated.View style={[styles.fields, fadeUp]}>
            {/* Email input */}
            <View>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View
                style={[
                  styles.glassInput,
                  emailFocused && styles.glassInputActive,
                ]}
              >
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.inputText}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password input */}
            <View>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View
                style={[
                  styles.glassInput,
                  passwordFocused && styles.glassInputActive,
                ]}
              >
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  onSubmitEditing={submit}
                  returnKeyType="go"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={[styles.inputText, { flex: 1 }]}
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
                    color="rgba(255,255,255,0.5)"
                  />
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Forgot password link */}
          <Pressable
            onPress={() => router.push('/forgot-password')}
            accessibilityRole="link"
            style={({ pressed }) => [styles.forgot, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </Pressable>
        </ScrollView>

        {/* Bottom CTAs */}
        <Animated.View style={[styles.footer, fadeUp]}>
          {/* Gold CTA with animated sheen */}
          <Pressable
            onPress={inert || !canSubmit ? undefined : submit}
            accessibilityRole="button"
            accessibilityState={{ disabled: inert || !canSubmit, busy: submitting }}
            style={({ pressed }) => [
              styles.goldButton,
              { opacity: inert || !canSubmit ? 0.55 : pressed ? 0.85 : 1 },
            ]}
          >
            {/* Sheen sweep overlay */}
            <View style={StyleSheet.absoluteFill}>
              <View style={{ overflow: 'hidden', flex: 1, borderRadius: 4 }}>
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      width: '30%',
                      backgroundColor: 'rgba(255,255,255,0.18)',
                    },
                    sheenStyle,
                  ]}
                />
              </View>
            </View>
            <Text style={styles.goldButtonLabel}>Sign in</Text>
          </Pressable>

          {/* Google social login */}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.googleButton, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.googleIcon}>
              <Text style={{ fontSize: 16 }}>G</Text>
            </View>
            <Text style={styles.googleLabel}>Continue with Google</Text>
          </Pressable>

          {/* Sign up row */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>New here? </Text>
            <Pressable
              onPress={() => router.replace('/role-select')}
              accessibilityRole="link"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={styles.signupLink}>Create an account</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1d2d3d',
  },
  scroll: {
    paddingHorizontal: cx(24),
    paddingBottom: spacing.lg,
    flexGrow: 1,
    justifyContent: 'flex-end',
    // Push content to the bottom half where the gradient is darker,
    // so the white text and glass inputs are most legible.
    paddingTop: SCREEN_H * 0.15,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xxl,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  mark: { marginBottom: spacing.md },
  title: {
    fontFamily: fontFamilyDisplay.extraBold,
    fontSize: fontSize.display,
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    lineHeight: 20,
  },
  fields: {
    gap: spacing.lg,
    marginTop: spacing.xxl,
  },
  inputLabel: {
    fontFamily: fontFamilyDisplay.semiBold,
    fontSize: fontSize.caption,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  // Glassmorphism input — dark translucent container on the hero photo.
  // The design draws: background: rgba(255,255,255,0.06); backdrop-filter:
  // blur(6px); border: 1px solid rgba(255,255,255,0.16).
  glassInput: {
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Active/focused: gold border with glow ring per design.
  glassInputActive: {
    borderWidth: 1.5,
    borderColor: '#1B66C4',
    // The design draws box-shadow: 0 0 0 3px rgba(27,102,196,.16) — a focus
    // ring. On iOS this reads as a subtle glow; on Android, elevation cannot
    // carry colour, so the border alone does the work.
    ...Platform.select({
      ios: {
        shadowColor: '#1B66C4',
        shadowOpacity: 0.16,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  inputText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: '#fff',
    height: '100%',
  },
  reveal: {
    padding: 8,
    marginRight: -8,
  },
  forgot: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodySm,
    color: '#b5d9fd',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: cx(24),
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  // Gold CTA — the design draws: background: var(--gold); color: var(--navy);
  // height: 50px; border-radius: 4; font-weight: 800; with a sheen sweep
  // and a heavy gold shadow.
  goldButton: {
    height: 50,
    borderRadius: 4,
    backgroundColor: '#1B66C4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1B66C4',
        shadowOpacity: 0.55,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 7 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  goldButtonLabel: {
    fontFamily: fontFamilyDisplay.extraBold,
    fontSize: fontSize.body,
    color: '#1d2d3d',
  },
  // Google social button — white pill on the dark ground.
  googleButton: {
    height: 48,
    borderRadius: 4,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.bodySm,
    color: '#1d1f20',
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  signupText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodySm,
    color: 'rgba(255,255,255,0.6)',
  },
  signupLink: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.bodySm,
    color: '#b5d9fd',
    textDecorationLine: 'underline',
  },
});
