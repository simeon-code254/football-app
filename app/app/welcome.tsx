import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { fontFamily, fontSize, spacing, useThemeColors } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { SecondaryButton } from '../src/components/SecondaryButton';
import { localImages } from '../src/constants/images';
import { Logo } from '../src/components/Logo';

// Matches Matobev v4.dc.html's WELCOME block.
export default function Welcome() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.hero}>
        <Image source={localImages.welcomeHero} style={styles.heroImage} contentFit="cover" />
        <LinearGradient
          colors={['rgba(26,109,255,0.1)', 'rgba(255,255,255,0.7)', '#ffffff']}
          locations={[0, 0.85, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.badge}>
          <View style={styles.badgeCard}>
            <Logo size={38} />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Matobev</Text>
        <Text style={styles.sub}>Discover. Analyze. Connect.{'\n'}Where football talent meets opportunity.</Text>

        <View style={styles.actions}>
          <PrimaryButton label="Create Account" onPress={() => router.push('/role-select')} />
          <SecondaryButton label="Login" onPress={() => router.push('/login')} />
        </View>

        {/* This screen -- not onboarding -- is where signed-out users
            actually land: every sign-out path routes here
            (settings.tsx, security-settings.tsx, suspended.tsx), and
            onboarding's own Skip lands here too. Onboarding is only ever
            reached on a cold start from the splash screen, so the
            browse-first entry point has to exist here or most people never
            see it. */}
        <Pressable onPress={() => router.push('/browse')} hitSlop={10} style={styles.browseWrap}>
          <Text style={styles.browseText}>Just looking? Browse players first</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  // Same relative-weight fix as onboarding.tsx: 9:11 = 45:55, matching the
  // mockup's intended split instead of the ~31:69 the old 0.45-vs-1 gave.
  hero: { flex: 9, overflow: 'visible' },
  heroImage: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    bottom: -28,
    left: '50%',
    marginLeft: -28,
    zIndex: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  badgeCard: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 11,
    paddingTop: 40,
    paddingHorizontal: 28,
    paddingBottom: 28,
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
    marginBottom: 32,
  },
  actions: { width: '100%', gap: spacing.sm, marginTop: 'auto' },
  browseWrap: { alignItems: 'center', marginTop: spacing.lg },
  browseText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted },
  });
}
