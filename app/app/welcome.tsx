import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, spacing } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { SecondaryButton } from '../src/components/SecondaryButton';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80';

// Matches Matobev v4.dc.html's WELCOME block.
export default function Welcome() {
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.hero}>
        <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(26,109,255,0.1)', 'rgba(255,255,255,0.7)', '#ffffff']}
          locations={[0, 0.85, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.badge}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.badgeGradient}>
            <Feather name="target" size={26} color={colors.white} />
          </LinearGradient>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Matobev</Text>
        <Text style={styles.sub}>Discover. Analyze. Connect.{'\n'}Where football talent meets opportunity.</Text>

        <View style={styles.actions}>
          <PrimaryButton label="Create Account" onPress={() => router.push('/role-select')} />
          <SecondaryButton label="Login" onPress={() => router.push('/login')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { flex: 0.45, overflow: 'visible' },
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
  badgeGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
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
});
