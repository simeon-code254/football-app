import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../src/theme';
import { Kicker } from '../src/components/Kicker';
import { Button } from '../src/components/Button';
import { NoticeBox } from '../src/components/NoticeBox';
import { useSpin } from '../src/lib/motion';
import { useSessionStore } from '../src/store/useSessionStore';
import * as videosRepository from '../src/repositories/videosRepository';

// Canvas screen 70 ANALYSIS IN PROGRESS.
//
//   "Analysing your clip"
//   "Usually takes about two minutes. You can close the app."
//   ✓ Upload complete
//   ✓ Player tracked in frame
//   ◌ Scoring attributes…
//   ○ Comparing to your position
//
// -- THESE FOUR STEPS ARE REAL, BUT ONLY TWO ARE OBSERVABLE --
//
// The canvas's four labels do map onto the pipeline: extract/upload, subject
// selection (detect_track + select_subject), scoring, then position weighting.
// But `video_analysis_jobs` records only `queued | processing | completed |
// failed`; the worker does not write sub-progress. So a running job genuinely
// cannot say whether it is currently tracking or currently scoring.
//
// Rather than animate four ticks on a timer -- which would be a progress bar
// that reports nothing and would lie confidently -- the steps are derived from
// the status that exists, and the middle ones read as "in progress" together.
// The labels stay because they tell the player what the machine is doing, which
// is the actual value of this screen.
//
// "About two minutes" is not reproduced: the worker polls on a 120s interval
// before it even claims the job, so two minutes is the floor.
const POLL_MS = 5000;

export default function AnalysisProgress() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { videoId } = useLocalSearchParams<{ videoId?: string }>();
  const userId = useSessionStore((s) => s.session?.user.id);
  const spin = useSpin(2400);

  const { data: job } = useQuery({
    queryKey: ['analysisJob', videoId, userId],
    enabled: !!userId,
    queryFn: () =>
      videoId
        ? videosRepository.getVideoAnalysisJob(videoId)
        : videosRepository.getLatestAnalysisJob(userId!),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'completed' || s === 'failed' ? false : POLL_MS;
    },
  });

  const status = job?.status ?? 'queued';
  const done = status === 'completed';
  const failed = status === 'failed';
  const running = status === 'processing';

  const steps = [
    { label: 'Upload complete', state: 'done' as const },
    {
      label: 'Player tracked in frame',
      state: done ? ('done' as const) : running ? ('running' as const) : ('waiting' as const),
    },
    {
      label: 'Scoring attributes',
      state: done ? ('done' as const) : running ? ('running' as const) : ('waiting' as const),
    },
    {
      label: 'Comparing to your position',
      state: done ? ('done' as const) : ('waiting' as const),
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          {failed ? 'Analysis could not finish' : done ? 'Analysis complete' : 'Analysing your clip'}
        </Text>
        <Text style={styles.lede}>
          {failed
            ? job?.error
              ? readableError(job.error)
              : 'Something went wrong reading this clip.'
            : done
              ? 'Your ratings are ready.'
              : 'This usually takes a few minutes. You can close the app — we will notify you.'}
        </Text>

        <View style={styles.steps}>
          {steps.map((s) => (
            <View key={s.label} style={styles.step}>
              {s.state === 'done' ? (
                <View style={styles.tickDone}>
                  <Feather name="check" size={12} color={colors.white} />
                </View>
              ) : s.state === 'running' && !failed ? (
                <Animated.View style={[styles.spinner, spin]} />
              ) : (
                <View style={styles.tickWaiting} />
              )}
              <Text
                style={[
                  styles.stepLabel,
                  s.state === 'done' && styles.stepLabelDone,
                  s.state === 'waiting' && styles.stepLabelWaiting,
                ]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {failed && (
          <NoticeBox tone="danger" icon="alert-circle" style={styles.notice}>
            Your clip is still on your profile. Only the rating failed — try a steadier clip where
            you stay in frame.
          </NoticeBox>
        )}

        <View style={{ flex: 1 }} />

        <Button
          label={done ? 'See your ratings' : 'Back to home'}
          variant="navy"
          onPress={() =>
            router.replace(done ? '/ai-ratings' : '/(player-tabs)/home')
          }
        />
      </View>
    </SafeAreaView>
  );
}

/**
 * The pipeline's failure codes are internal identifiers. A player should be
 * told what happened to their video, not shown `no_person_detected`.
 */
function readableError(code: string): string {
  switch (code) {
    case 'no_person_detected':
      return 'We could not find a player in this clip.';
    case 'calibration_failed':
      return 'We could not work out the scale of the pitch from this angle.';
    case 'no_valid_movement_intervals':
      return 'There was not enough continuous movement to measure.';
    default:
      return 'Something went wrong reading this clip.';
  }
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: cx(18) },
    body: { flex: 1, paddingHorizontal: cx(18), paddingBottom: spacing.md },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.5,
      color: colors.textMuted,
      marginTop: 6,
    },
    steps: {
      gap: spacing.lg,
      marginTop: spacing.xxl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    tickDone: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tickWaiting: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.borderDashed,
    },
    spinner: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      borderTopColor: colors.gold,
    },
    stepLabel: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      color: colors.textPrimary,
    },
    stepLabelDone: { fontFamily: fontFamily.semiBold },
    stepLabelWaiting: { color: colors.textMuted },
    notice: { marginTop: spacing.lg },
  });
}
