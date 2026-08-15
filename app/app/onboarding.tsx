import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, spacing, useThemeColors } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { SecondaryButton } from '../src/components/SecondaryButton';
import { images } from '../src/constants/images';

const SLIDES = [
  {
    image: images.onboardSlide1,
    title: 'Discover Football Talent',
    sub: 'Every talented player deserves the chance to be seen, wherever they play.',
  },
  {
    image: images.onboardSlide2,
    title: 'AI-Powered Analysis',
    sub: 'Upload highlights and get objective, data-driven performance ratings.',
  },
  {
    image: images.onboardSlide3,
    title: 'Connect With Scouts',
    sub: 'Get discovered by verified scouts and clubs across Africa.',
  },
];

// Matches Matobev v4.dc.html's ONBOARDING block: 58% hero image, rounded
// bottom mask, title/sub, pagination dots, Skip+Next -> Login+CreateAccount
// on the final slide.
export default function Onboarding() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.hero}>
        <Image source={{ uri: current.image }} style={styles.heroImage} contentFit="cover" />
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
          <View>
            <View style={styles.authRow}>
              <SecondaryButton label="Login" style={styles.authBtn} onPress={() => router.push('/login')} />
              <PrimaryButton label="Create Account" style={styles.authBtn} onPress={() => router.push('/welcome')} />
            </View>
            {/* The whole point of activation work: let someone see real
                players before being asked for anything. */}
            <Pressable onPress={() => router.push('/browse')} hitSlop={10} style={styles.browseWrap}>
              <Text style={styles.browseText}>Just looking? Browse players first</Text>
            </Pressable>
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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  // NOTE: siblings in a flex:1 column are relative WEIGHTS, not percentages —
  // `flex: 0.58` next to `flex: 1` gave the hero only 0.58/1.58 (~37%) of the
  // height instead of the intended 58%, which is what made the image look
  // cropped and left the content pane oversized. 3:2 (60/40) fixes that.
  hero: { flex: 3, overflow: 'hidden' },
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
    flex: 2,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-evenly',
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
  browseWrap: { alignItems: 'center', marginTop: spacing.lg },
  browseText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted },
  authBtn: { flex: 1 },
  });
}
