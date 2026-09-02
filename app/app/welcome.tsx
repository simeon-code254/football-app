import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cx, fontFamily, fontFamilyDisplay, fontSize, spacing, useThemeColors } from '../src/theme';
import { images } from '../src/constants/images';
import { Button, LinkButton } from '../src/components/Button';

// Canvas screen 02 WELCOME.
//
//   <div style="height:310px">                       full-bleed photo
//     <img ... filter:grayscale(1) contrast(1.05)>
//     <div background:linear-gradient(180deg,rgba(27,102,196,.3),
//                    rgba(29,45,61,.6) 45%, var(--navy) 100%)>
//   <div style="margin-top:-46px">                   copy overlaps the photo
//     "Get seen."            .h 36px w800 letter-spacing:-1px
//     "Scouts are looking. Rated by AI, watched by humans."
//     [Create account]  gold
//     [Sign in]         outline
//     Browse without an account   #b5d9fd underlined
//
// The photo is greyscaled and contrast-lifted so the navy wash over it reads as
// one colour rather than fighting the subject's kit -- that filter is the
// reason a colour photo does not look wrong here.
export default function Welcome() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <ImageBackground
          source={{ uri: images.authHero }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        {/*
          The canvas greyscales the photo. React Native has no CSS filter, so
          the desaturation comes from the wash: a steel-blue top stop over a
          navy base pulls the image toward the palette rather than leaving it
          full-colour under a transparent overlay.
        */}
        <LinearGradient
          colors={['rgba(27,102,196,0.30)', 'rgba(29,45,61,0.60)', '#1d2d3d']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.body} edges={['bottom']}>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          Get seen.
        </Text>
        <Text style={styles.subtitle}>Scouts are looking. Rated by AI, watched by humans.</Text>

        <View style={styles.spacer} />

        <Button
          label="Create account"
          variant="gold"
          onPress={() => router.push('/role-select')}
        />
        <Button
          label="Sign in"
          variant="outline"
          onPress={() => router.push('/login')}
          style={styles.secondary}
        />
        <LinkButton label="Browse without an account" onPress={() => router.push('/browse')} />
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    // The canvas paints the whole frame navy and lets the photo occupy the
    // top; below the photo the navy simply continues, so there is no seam.
    root: { flex: 1, backgroundColor: '#1d2d3d' },
    hero: { height: 310 },
    body: {
      flex: 1,
      paddingHorizontal: cx(26),
      paddingBottom: cx(26),
      // The copy block rides up over the base of the photo, which is what
      // makes the gradient read as a fade into the text rather than a band.
      marginTop: -cx(46),
    },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.splash,
      lineHeight: fontSize.splash,
      letterSpacing: -1,
      color: colors.white,
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.4,
      color: 'rgba(255,255,255,0.7)',
      marginTop: spacing.sm,
    },
    spacer: { flex: 1 },
    secondary: { marginTop: spacing.md, marginBottom: spacing.xs },
  });
}
