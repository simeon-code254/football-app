import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { fontFamily, fontSize, useThemeColors } from '../src/theme';
import { localImages } from '../src/constants/images';
import { Logo } from '../src/components/Logo';
import { useSessionStore } from '../src/store/useSessionStore';

const SPLASH_DURATION_MS = 3000;

// Matches Matobev v4.dc.html's SPLASH block: full-bleed photo, dark gradient
// wash, gold badge + football icon, wordmark, tagline, filling progress bar.
export default function SplashScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const progress = useRef(new Animated.Value(0)).current;
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.role);
  const player = useSessionStore((s) => s.player);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_DURATION_MS,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      // A persisted session should resume straight into the app, not force
      // an already-signed-in user back through onboarding/welcome/login —
      // that previously meant the only way back in was re-entering
      // credentials on Login, which happened to be the one place that
      // checked profile completion correctly.
      if (status === 'signed-in') {
        if (role === 'scout') {
          router.replace('/(scout-tabs)/home');
        } else if (role === 'player') {
          router.replace(player?.profile_completed ? '/(player-tabs)/home' : '/profile-complete');
        } else {
          router.replace('/onboarding');
        }
      } else {
        router.replace('/onboarding');
      }
    }, SPLASH_DURATION_MS + 300);

    return () => clearTimeout(timer);
  }, [status, role, player]);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.root}>
      <ImageBackground source={localImages.splashHero} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={['rgba(10,22,40,0.15)', 'rgba(10,22,40,0.4)', 'rgba(10,22,40,0.85)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.badgeWrap}>
            <Logo variant="white" size={72} />
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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
}
