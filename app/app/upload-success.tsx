import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
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
import { SuccessCheck, Confetti } from '../src/components/SuccessCheck';
import { Button, LinkButton } from '../src/components/Button';
import { Kicker } from '../src/components/Kicker';
import { usePulse } from '../src/lib/motion';
import * as videosRepository from '../src/repositories/videosRepository';

// Canvas screen 15 UPLOAD · SUCCESS.
//
//   navy + radial success glow at 50% 30%, rgba(30,132,73,.25), transparent 60%
//   confetti, a 74px green disc with a tick that draws itself
//   "Highlight published"
//   a clip card carrying the analysis progress
//   [Back to home] gold  /  "Upload another"
//
// This replaces a plain OS alert. The upload is the single action the whole
// product is built around, and confirming it with a system dialog threw away
// the one moment the design actually celebrates.
//
// -- THREE THINGS THE CANVAS ASSERTS THAT THIS DOES NOT --
//
// "ANALYSING · STEP 2 OF 4" and a bar at 34%. There are no four steps: the
// job row carries `queued | processing | completed | failed` and nothing
// reports sub-progress. A fixed 34% bar is a progress indicator that does not
// indicate progress, so this shows the real status instead and animates only
// to say "still working".
//
// "lands in about two minutes". The worker polls on a 120s interval before it
// even picks the job up, and the pipeline is CPU-only, so two minutes is the
// floor rather than the estimate. "A few minutes" is the honest version.
//
// The streak card ("Streak extended to 5 weeks"). Nothing counts streaks --
// same reason it is absent from the home header.
export default function UploadSuccess() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { videoId, title, mode } = useLocalSearchParams<{
    videoId?: string;
    title?: string;
    mode?: string;
  }>();

  const analysing = mode === 'ai';

  // Poll the real job while this screen is open, so the status line is the
  // database's answer rather than an assumption.
  const { data: job } = useQuery({
    queryKey: ['uploadSuccessJob', videoId],
    enabled: analysing && !!videoId,
    queryFn: () => videosRepository.getVideoAnalysisJob(videoId!),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'completed' || s === 'failed' ? false : 5000;
    },
  });

  const status = job?.status ?? 'queued';
  const statusLabel =
    status === 'completed'
      ? 'Analysis complete'
      : status === 'failed'
        ? 'Analysis could not finish'
        : status === 'processing'
          ? 'Analysing'
          : 'Queued for analysis';

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="successGlow" cx="50%" cy="30%" r="60%">
            <Stop offset="0" stopColor="#1E8449" stopOpacity={0.25} />
            <Stop offset="1" stopColor="#1E8449" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#successGlow)" />
      </Svg>

      <Confetti />

      <SafeAreaView style={styles.body} edges={['top', 'bottom']}>
        <View style={styles.hero}>
          <SuccessCheck replayKey={videoId} size={74} />
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Highlight published
          </Text>
          <Text style={styles.lede}>
            {analysing
              ? 'Analysis has started. Your new rating usually lands within a few minutes.'
              : 'It is live on your profile and in Reels.'}
          </Text>
        </View>

        <View style={styles.clipCard}>
          <View style={styles.clipRow}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.thumb}
            >
              <Feather name="play" size={14} color={colors.gold} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.clipTitle} numberOfLines={1}>
                {title || 'Your highlight'}
              </Text>
              <Text style={styles.clipMeta}>Published just now</Text>
            </View>
            {analysing && status !== 'completed' && status !== 'failed' && <WorkingDots />}
          </View>

          {analysing && (
            <>
              {/*
                Deliberately not a percentage. An indeterminate bar says "still
                working" without claiming to know how much is left, which is
                the truth here.
              */}
              <View style={styles.track}>
                <View
                  style={[
                    styles.trackFill,
                    {
                      width: status === 'completed' ? '100%' : status === 'processing' ? '60%' : '20%',
                      backgroundColor: status === 'failed' ? colors.error : colors.gold,
                    },
                  ]}
                />
              </View>
              <Kicker size={fontSize.caption} tone="inherit" style={styles.statusLine}>
                {statusLabel}
              </Kicker>
            </>
          )}
        </View>

        <View style={{ flex: 1 }} />

        <Button
          label="Back to home"
          variant="gold"
          onPress={() => router.replace('/(player-tabs)/home')}
        />
        <LinkButton
          label="Upload another"
          onPress={() => router.replace('/(player-tabs)/upload')}
        />
      </SafeAreaView>
    </View>
  );
}

// The canvas's three gold dots, each pulsing a fifth of a second behind the
// last so they read as a wave rather than a single blink.
function WorkingDots() {
  const a = usePulse(1200);
  const b = usePulse(1300);
  const c = usePulse(1400);
  const colors = useThemeColors();
  const dot = { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gold };
  return (
    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
      <Animated.View style={[dot, a]} />
      <Animated.View style={[dot, b]} />
      <Animated.View style={[dot, c]} />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.primaryDark },
    body: { flex: 1, paddingHorizontal: cx(18), paddingBottom: cx(20) },
    hero: { alignItems: 'center', marginTop: cx(34) },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.headingLg,
      color: colors.white,
      marginTop: spacing.lg,
    },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.45,
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      marginTop: 6,
    },
    clipCard: {
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginTop: spacing.xl,
    },
    clipRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    thumb: {
      width: 44,
      height: 36,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clipTitle: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodySm,
      color: colors.white,
    },
    clipMeta: { ...kicker, fontSize: fontSize.caption, color: colors.accentOnNavy, marginTop: 2 },
    track: {
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 2,
      marginTop: spacing.md,
      overflow: 'hidden',
    },
    trackFill: { height: '100%' },
    statusLine: { color: 'rgba(255,255,255,0.45)', marginTop: 6 },
  });
}
