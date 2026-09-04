import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Animated from 'react-native-reanimated';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  kicker,
  radii,
  spacing,
  useThemeColors,
} from '../src/theme';
import { usePing } from '../src/lib/motion';

// Canvas screen 09 ONBOARDING.
//
//   346px navy hero, centred:
//     88x88 tile on rgba(181,217,253,.12), radius 20, gold glyph 38px
//     ping ring inset -6px, radius 24, 1px rgba(181,217,253,.35)
//     "Upload one clip."       .h 24px w800
//     sub 12px rgba(255,255,255,.6), max-width 200, centred
//   paper below:
//     dots -- active 24x4 gold, rest 6x4 #D5DEE9
//     SKIP (mono, muted)            52px navy circle, gold chevron
//
// The canvas draws only the first of three slides. The other two follow its
// pattern exactly -- same hero, same dots, same footer -- and carry the three
// promises the product actually makes, in the order a player meets them:
// upload, get analysed, get seen. The previous copy ("Discover Football
// Talent") described the app to an investor rather than to a 16-year-old.
const SLIDES = [
  {
    icon: 'video' as const,
    title: 'Upload one clip.',
    body: 'We analyse how you move. You see what to work on next.',
  },
  {
    icon: 'bar-chart-2' as const,
    title: 'Get your rating.',
    body: 'FIFA-style attributes from your own footage, with how sure we are of each.',
  },
  {
    icon: 'search' as const,
    title: 'Get found.',
    body: 'ID-checked scouts and clubs search by position, age and region. No agents needed.',
  },
];

export default function Onboarding() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [slide, setSlide] = useState(0);
  const ping = usePing(2500);

  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  const advance = () => {
    if (isLast) router.replace('/welcome');
    else setSlide((s) => s + 1);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <View style={styles.tile}>
          <Animated.View style={[styles.pingRing, ping]} pointerEvents="none" />
          <Feather name={current.icon} size={38} color={colors.gold} />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          {current.title}
        </Text>
        <Text style={styles.body}>{current.body}</Text>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === slide && styles.dotOn]} />
          ))}
        </View>

        <View style={styles.footerRow}>
          <Pressable
            onPress={() => router.replace('/welcome')}
            accessibilityRole="button"
            // The label is four characters; the target must not be.
            hitSlop={16}
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>

          <Pressable
            onPress={advance}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Get started' : 'Next'}
            style={styles.next}
          >
            <Feather name="chevron-right" size={18} color={colors.gold} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  const TILE = cx(88);
  const RING = TILE + cx(6) * 2;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    hero: {
      height: 346 + cx(24),
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: cx(26),
    },
    tile: {
      width: TILE,
      height: TILE,
      borderRadius: 4,
      backgroundColor: 'rgba(181,217,253,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    pingRing: {
      position: 'absolute',
      width: RING,
      height: RING,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: 'rgba(181,217,253,0.35)',
    },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.white,
      textAlign: 'center',
    },
    body: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.5,
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      marginTop: spacing.sm,
      maxWidth: cx(200),
    },
    footer: { flex: 1, paddingHorizontal: cx(26), paddingTop: cx(22) },
    dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' },
    dot: { width: 6, height: 6, borderRadius: 9999, backgroundColor: '#D5DEE9' },
    // The active dot stretches rather than changing colour alone, so the
    // position in the sequence is legible without relying on hue.
    dotOn: { width: 24, height: 4, borderRadius: 4, backgroundColor: colors.gold },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 'auto',
      marginBottom: spacing.xl,
    },
    skip: { ...kicker, fontSize: fontSize.bodySm, color: colors.textMuted },
    next: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
