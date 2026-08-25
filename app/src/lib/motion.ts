import { useEffect } from 'react';
import {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// The design canvas's animations, ported.
//
// The canvas declares 16 @keyframes and uses them 60-odd times. They are
// implemented here once rather than at each call site, because they are the
// same handful of motions repeated -- a dot that pulses, a highlight that
// sweeps, a thing that floats -- and sixty inline copies is how half of them
// end up at different durations.
//
// Every timing below is the canvas's own. Where a hook takes a duration the
// default is the value the canvas uses.
//
// -- REDUCED MOTION --
//
// Every hook returns a static, neutral style when the OS asks for reduced
// motion, and never starts its loop at all. Relying on Reanimated's
// ReduceMotion.System alone would be *visually* correct -- all of these
// keyframes end where they began, so it would settle on the neutral frame --
// but the loop would still be scheduled and still cost battery. Several of
// these run infinitely on a screen a user may leave open, so not starting is
// the point, not a detail.
//
// Every loop is also explicitly cancelled on unmount. withRepeat(-1) outlives
// its component otherwise.

/** pulse: 0,100% scale 1 / opacity 1; 50% scale 1.08 / opacity .75. */
export function usePulse(duration = 1600) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(t);
  }, [reduced, duration, t]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.08 * t.value }],
    opacity: 1 - 0.25 * t.value,
  }));
}

/**
 * ping: scale 1 -> 2.3 while fading .5 -> 0.
 * Meant for a ring sitting *behind* the element, not the element itself.
 */
export function usePing(duration = 2400) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(t);
  }, [reduced, duration, t]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 1.3 * t.value }],
    opacity: reduced ? 0 : 0.5 * (1 - t.value),
  }));
}

/**
 * sheen: a skewed highlight sweeping across, translateX -140% -> 240%.
 *
 * Percentage translations are relative to the animated view's own width in
 * both CSS and React Native, so `width` here must be the sweeping band's
 * width, and the parent must clip (overflow: 'hidden').
 */
export function useSheen(duration = 3400) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, false);
    return () => cancelAnimation(t);
  }, [reduced, duration, t]);

  return useAnimatedStyle(() => ({
    opacity: reduced ? 0 : 1,
    transform: [{ translateX: `${-140 + 380 * t.value}%` }, { skewX: '-22deg' }],
  }));
}

/** float: translateY 0 -> -5 -> 0. */
export function useFloat(duration = 3200, distance = 5) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(t);
  }, [reduced, duration, t]);

  return useAnimatedStyle(() => ({ transform: [{ translateY: -distance * t.value }] }));
}

/** shake: translateX 0 / -4 / 0 / +4 / 0, once every cycle. */
export function useShake(duration = 2200, distance = 4) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    const quarter = duration / 4;
    x.value = withRepeat(
      withSequence(
        withTiming(-distance, { duration: quarter, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: quarter, easing: Easing.inOut(Easing.quad) }),
        withTiming(distance, { duration: quarter, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: quarter, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(x);
  }, [reduced, duration, distance, x]);

  return useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
}

/** ringSpin: a continuous 360deg rotation. */
export function useSpin(duration = 4000) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [reduced, duration, t]);

  return useAnimatedStyle(() => ({ transform: [{ rotate: `${360 * t.value}deg` }] }));
}

/**
 * countUp: a one-shot entrance -- fade in from 8px above.
 *
 * Despite the name this is not a numeric counter in the canvas either; it is
 * how a freshly computed number arrives on screen.
 *
 * `key` restarts it. Pass the value being revealed, so a rating that changes
 * animates in again rather than sitting still.
 */
export function useCountUp(key: unknown, duration = 600) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      t.value = 1;
      return;
    }
    t.value = 0;
    t.value = withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [key, reduced, duration, t]);

  return useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: -8 * (1 - t.value) }],
  }));
}

/**
 * toastIn: drops in from 14px above with a slight overshoot, then settles.
 * A one-shot entrance for anything that appears over the top of a screen.
 */
export function useToastIn(duration = 500, delay = 0) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      t.value = 1;
      return;
    }
    t.value = withDelay(
      delay,
      withSequence(
        withTiming(1.1, { duration: duration * 0.6, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: duration * 0.4, easing: Easing.inOut(Easing.quad) })
      )
    );
  }, [reduced, duration, delay, t]);

  return useAnimatedStyle(() => ({
    // Clamped so the overshoot past 1 does not push opacity above 1.
    opacity: Math.min(t.value, 1),
    transform: [
      { translateY: -14 * (1 - t.value) },
      { scale: 0.95 + 0.05 * Math.min(t.value, 1) },
    ],
  }));
}

/**
 * barGrow: a bar filling from 0 to `fraction` of its track.
 * `fraction` is 0-1; anything outside is clamped, since these are fed by
 * ratings and a value over the scale ceiling would overflow the track.
 */
export function useBarGrow(fraction: number, duration = 1100, delay = 0) {
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const w = useSharedValue(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      w.value = target;
      return;
    }
    w.value = withDelay(
      delay,
      withTiming(target, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, [target, reduced, duration, delay, w]);

  return useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
}

/**
 * glow: the canvas pulses a gold box-shadow from `0 0 0` to `0 0 20px`.
 *
 * That is not portable. React Native can animate iOS shadow properties, but
 * Android's only shadow is `elevation`, which cannot take a colour -- so an
 * animated gold shadow would simply not exist on the majority platform here.
 *
 * This returns the style for a HALO VIEW placed behind the element instead:
 * a gold, blurred-looking ring that fades and expands in time with the
 * canvas's shadow. Same read, both platforms.
 */
export function useGlow(duration = 2400) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(t);
  }, [reduced, duration, t]);

  return useAnimatedStyle(() => ({
    opacity: reduced ? 0 : 0.4 + 0.15 * t.value,
    transform: [{ scale: 1 + 0.18 * t.value }],
  }));
}

/**
 * fadeUp: a one-shot entrance -- fade in from 8px *below*.
 *
 * The mirror of useCountUp, which arrives from above. The canvas uses this one
 * for content rising into place and countUp for a number landing on it; they
 * are not interchangeable even though the distance matches.
 */
export function useFadeUp(duration = 500, delay = 0) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      t.value = 1;
      return;
    }
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }));
  }, [reduced, duration, delay, t]);

  return useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: 8 * (1 - t.value) }],
  }));
}

/**
 * badgePop: scale .4 -> 1.14 (at 55%) -> 1, fading in over the first 55%.
 *
 * The canvas drives this with cubic-bezier(.16,1.2,.6,1) -- a curve whose
 * control point above 1 means the *easing* already overshoots. Reproducing
 * both that curve and the 1.14 keyframe would overshoot twice, so the
 * overshoot is expressed once, as the explicit scale sequence the canvas
 * draws, on a plain out-cubic.
 *
 * `key` restarts it, so a badge that changes tier pops again.
 */
export function useBadgePop(key: unknown, duration = 700) {
  const reduced = useReducedMotion();
  // The shared value IS the scale, so the keyframes read straight off it.
  const scale = useSharedValue(reduced ? 1 : 0.4);

  useEffect(() => {
    if (reduced) {
      scale.value = 1;
      return;
    }
    scale.value = 0.4;
    scale.value = withSequence(
      withTiming(1.14, { duration: duration * 0.55, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: duration * 0.45, easing: Easing.inOut(Easing.quad) })
    );
  }, [key, reduced, duration, scale]);

  return useAnimatedStyle(() => ({
    // Full opacity by the 1.14 peak, which is the keyframe's 55% stop.
    opacity: Math.min((scale.value - 0.4) / 0.74, 1),
    transform: [{ scale: scale.value }],
  }));
}

/** flame: scale 1 -> 1.15 while rocking rotate -3deg -> 3deg. The streak icon. */
export function useFlame(duration = 1400) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(t);
  }, [reduced, duration, t]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.15 * t.value }, { rotate: `${-3 + 6 * t.value}deg` }],
  }));
}

/**
 * confetti: one particle falling 85px while rotating 280deg and fading out.
 *
 * The canvas scatters nine of these over a success screen, each with its own
 * delay (.1s to 1s) so they do not fall in lockstep -- so this hook takes the
 * delay per particle rather than owning the whole burst. Give each particle its
 * own start offset; identical delays produce a single visual clump.
 *
 * Purely decorative, so under reduced motion it renders nothing at all rather
 * than settling on a frame.
 */
export function useConfetti(delay = 0, duration = 2200) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.in(Easing.quad) }), -1, false)
    );
    return () => cancelAnimation(t);
  }, [reduced, delay, duration, t]);

  return useAnimatedStyle(() => ({
    opacity: reduced ? 0 : 1 - t.value,
    transform: [{ translateY: 85 * t.value }, { rotate: `${280 * t.value}deg` }],
  }));
}

// -- SVG STROKE ANIMATIONS --
//
// The two below animate `strokeDashoffset`, which is an SVG *attribute*, not a
// style. They return `animatedProps`, so the target must be a react-native-svg
// primitive wrapped with Reanimated.createAnimatedComponent -- a plain
// <Circle> or <Path> will silently ignore them.
//
// Both are `forwards` in the canvas: they hold their end state. Under reduced
// motion they jump straight to it rather than rendering nothing, because in
// both cases the end state carries the meaning -- a rating arc's length *is*
// the rating, and an undrawn tick reads as "not finished".

/**
 * progressRing: sweeps a circular stroke from empty to `fraction`.
 *
 * `circumference` must be the circle's own 2*pi*r, and the same <Circle> needs
 * strokeDasharray set to it, so the dash is one full lap and the offset is what
 * hides the remainder.
 */
export function useProgressRing(fraction: number, circumference: number, duration = 1400) {
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const t = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      t.value = 1;
      return;
    }
    t.value = 0;
    t.value = withTiming(1, { duration, easing: Easing.inOut(Easing.ease) });
  }, [target, reduced, duration, t]);

  return useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - target * t.value),
  }));
}

/**
 * checkDraw: draws a tick on, from nothing to whole.
 *
 * `length` is the path's own getTotalLength(); the same <Path> needs
 * strokeDasharray set to it. The canvas delays this ~.35s so the tick lands
 * after the circle behind it has popped.
 */
export function useCheckDraw(key: unknown, length: number, duration = 500, delay = 350) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      t.value = 1;
      return;
    }
    t.value = 0;
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }));
  }, [key, reduced, duration, delay, t]);

  return useAnimatedProps(() => ({ strokeDashoffset: length * (1 - t.value) }));
}
