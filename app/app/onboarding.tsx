import { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, spacing } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { SecondaryButton } from '../src/components/SecondaryButton';

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80',
    title: 'Discover Football Talent',
    sub: 'Every talented player deserves the chance to be seen, wherever they play.',
  },
  {
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    title: 'AI-Powered Analysis',
    sub: 'Upload highlights and get objective, data-driven performance ratings.',
  },
  {
    image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80',
    title: 'Connect With Scouts',
    sub: 'Get discovered by verified scouts and clubs from around the world.',
  },
];

// Matches Matobev v4.dc.html's ONBOARDING block: 58% hero image, rounded
// bottom mask, title/sub, pagination dots, Skip+Next -> Login+CreateAccount
// on the final slide.
export default function Onboarding() {
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.hero}>
        <Image source={{ uri: current.image }} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroMask} />
      </View>

      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.sub}>{current.sub}</Text>
        </View>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { width: i === slide ? 24 : 8, backgroundColor: i === slide ? colors.primary : '#E0E0E0' },
              ]}
            />
          ))}
        </View>

        {isLast ? (
          <View style={styles.authRow}>
            <SecondaryButton label="Login" style={styles.authBtn} onPress={() => router.push('/login')} />
            <PrimaryButton label="Create Account" style={styles.authBtn} onPress={() => router.push('/welcome')} />
          </View>
        ) : (
          <View style={styles.navRow}>
            <Pressable onPress={() => router.replace('/welcome')} hitSlop={12}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
            <Pressable
              onPress={() => setSlide((s) => Math.min(s + 1, SLIDES.length - 1))}
              style={({ pressed }) => [styles.nextBtn, pressed && { transform: [{ scale: 0.95 }] }]}
            >
              <Feather name="arrow-right" size={22} color={colors.white} />
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { flex: 0.58, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroMask: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textBlock: { alignItems: 'center', maxWidth: 300 },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.headingLg,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 28,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  dots: { flexDirection: 'row', gap: 8, marginVertical: spacing.md },
  dot: { height: 6, borderRadius: 3 },
  navRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skip: { fontSize: fontSize.body, color: colors.textMuted, fontFamily: fontFamily.medium, paddingVertical: 8 },
  nextBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authRow: { width: '100%', flexDirection: 'row', gap: spacing.sm },
  authBtn: { flex: 1 },
});
