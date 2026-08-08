import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize } from '../src/theme';
import { images } from '../src/constants/images';

const SPLASH_DURATION_MS = 3000;

// Matches Matobev v4.dc.html's SPLASH block: full-bleed photo, dark gradient
// wash, gold badge + football icon, wordmark, tagline, filling progress bar.
export default function SplashScreen() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_DURATION_MS,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, SPLASH_DURATION_MS + 300);

    return () => clearTimeout(timer);
  }, []);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: images.splashHero }} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={['rgba(10,22,40,0.15)', 'rgba(10,22,40,0.4)', 'rgba(10,22,40,0.85)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.badgeWrap}>
            <LinearGradient colors={[colors.gold, colors.goldDark]} style={styles.badge}>
              <Feather name="target" size={28} color={colors.white} />
            </LinearGradient>
          </View>
          <Text style={styles.wordmark}>MATOBEV</Text>
          <Text style={styles.tagline}>DISCOVER · ANALYZE · CONNECT</Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: barWidth }]}>
              <LinearGradient colors={[colors.gold, colors.goldDark]} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A1628' },
  bg: { flex: 1, width: '100%', height: '100%' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  badgeWrap: { marginBottom: 16 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.hero,
    color: colors.white,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  tagline: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    marginTop: 4,
  },
  progressTrack: {
    width: 120,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
    overflow: 'hidden',
    marginTop: 32,
  },
  progressFill: { height: '100%', borderRadius: 1 },
});
