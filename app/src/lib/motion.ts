import { useEffect } from 'react';
import {
  Easing,
  ReduceMotion,
  cancelAnimation,
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
