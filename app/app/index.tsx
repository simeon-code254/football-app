import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { cx, fontFamilyDisplay, fontSize, kicker, useThemeColors } from '../src/theme';
import { useFloat, usePing } from '../src/lib/motion';
import { Logo } from '../src/components/Logo';
import { useSessionStore } from '../src/store/useSessionStore';

const SPLASH_DURATION_MS = 3000;

// Canvas screen 01 SPLASH.
//
//   <div class="di" style="background:radial-gradient(circle at 50% 45%,
//                          #416180,#1d2d3d 60%,#050D1D)">
//     <div style="position:absolute;inset:-14px;border-radius:50%;
//                 border:1px solid rgba(181,217,253,.25);animation:ping 2.4s"/>
//     <div class="logoG" style="width:110px;height:110px;animation:float 3.2s"/>
//     MATOBEV        .h 32px w800 #fff letter-spacing:5px
//     GET SEEN · GET RATED   .mono 9px var(--gold)
//
// This replaced a splash built from the superseded `Matobev v4.dc.html`, which
// drew a full-bleed photo behind a dark wash, the tagline "DISCOVER · ANALYZE ·
// CONNECT", and a filling progress bar -- none of which the current canvas has.
//
// The progress bar going is the one change worth justifying: a 3s hold with no
// indicator normally reads as a frozen app. It does not here because the mark
// floats and the ring pings the whole time, which is what those two animations
// are for. Motion is the progress indicator.
export default function SplashScreen() {
  const colors = useThemeColors();
  const logoFloat = useFloat(); // canvas: float 3.2s
  const ringPing = usePing(2400); // canvas: ping 2.4s
  const styles = makeStyles(colors);

  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.role);
  const player = useSessionStore((s) => s.player);

  useEffect(() => {
    const timer = setTimeout(() => {
      // A persisted session resumes straight into the app rather than being
      // sent back through onboarding/welcome/login -- unchanged from before,
      // and the reason this screen is not purely presentational.
      if (status === 'signed-in') {
        if (role === 'scout') {
          router.replace('/(scout-tabs)/home');
        } else if (role === 'club') {
          router.replace('/(club-tabs)/home');
        } else if (role === 'player') {
          router.replace(player?.profile_completed ? '/(player-tabs)/home' : '/profile-complete');
        } else {
          router.replace('/onboarding');
        }
      } else {
        router.replace('/onboarding');
      }
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [status, role, player]);

  return (
    <View style={styles.root}>
      {/*
        A true radial gradient, which expo-linear-gradient cannot draw. The
        canvas centres it at 50% 45% with the mid stop at 60%, so the navy
        lifts behind the mark and falls away to near-black at the corners.
      */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="splash" cx="50%" cy="45%" r="75%">
            <Stop offset="0" stopColor="#416180" />
            <Stop offset="0.6" stopColor="#1d2d3d" />
            <Stop offset="1" stopColor="#050D1D" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#splash)" />
      </Svg>

      <View style={styles.content}>
        <View style={styles.markWrap}>
          <Animated.View style={[styles.pingRing, ringPing]} pointerEvents="none" />
          <Animated.View style={logoFloat}>
            <Logo variant="gold" size={cx(110)} />
          </Animated.View>
        </View>

        <View style={styles.wordmarkBlock}>
          <Text style={styles.wordmark} maxFontSizeMultiplier={1.2}>
            MATOBEV
          </Text>
          <Text style={styles.tagline}>GET SEEN · GET RATED</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  const MARK = cx(110);
  // The canvas insets the ring -14px on every side of the 110px mark.
  const RING = MARK + cx(14) * 2;

  return StyleSheet.create({
    // Canvas navy, and the same value app.json paints behind the native splash
    // -- so the handoff from the OS splash to this screen is seamless rather
    // than a visible colour jump. Change these together.
    root: { flex: 1, backgroundColor: '#1d2d3d' },
    content: {
      flex: 1,
      alignItems: 'center',
      // The canvas centres this block rather than dropping it to the bottom.
      justifyContent: 'center',
      gap: cx(20),
    },
    markWrap: {
      width: MARK,
      height: MARK,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pingRing: {
      position: 'absolute',
      width: RING,
      height: RING,
      borderRadius: RING / 2,
      borderWidth: 1,
      borderColor: 'rgba(181,217,253,0.25)',
    },
    wordmarkBlock: { alignItems: 'center' },
    wordmark: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.splash,
      color: colors.white,
      letterSpacing: 6,
    },
    tagline: {
      ...kicker,
      fontSize: fontSize.caption,
      color: colors.gold,
      marginTop: 6,
    },
  });
}
