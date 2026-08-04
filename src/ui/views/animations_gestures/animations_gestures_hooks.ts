import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
  type WithSpringConfig,
  type WithDecayConfig,
} from 'react-native-reanimated';

/**
 * Animations & gestures view logic — owns the state/animation nodes for the
 * three LIVE demos cards (built-in Animated, Reanimated v3, gesture-driven pan)
 * so the view stays a dumb structure. The pure worklet config consts
 * (`SPRING_BACK_CONFIG`, `decayFromVelocity`) are the artefacts the view cites
 * via `<Code>` excerpts.
 *
 * Three concerns, three hooks:
 *  - `useAnimatedApiDemo` — RN's built-in `Animated` (imperative; JS or native
 *    driver). Animates `scale` (a transform) so `useNativeDriver: true` works.
 *  - `useReanimatedDemo` — Reanimated v3 worklets. `useSharedValue` +
 *    `useAnimatedStyle` + `withSpring`/`withTiming`, driven on the UI thread.
 *  - `usePanCardDemo` — react-native-gesture-handler `Gesture.Pan()` driving a
 *    Reanimated shared value; springs back on release. Crosses back to JS for
 *    the "dragging" flag via `runOnJS` to demonstrate the boundary.
 *
 * No `any`; strict + erasure-clean.
 */

/* -------------------------------------------------------------------------- */
/* 0. Pure worklet config consts (the artefacts the <Code> blocks cite)       */
/* -------------------------------------------------------------------------- */

/**
 * Spring config used by the pan-card release. Pure data — referenced verbatim
 * in the "Gestures" `<Code>` block. A snappy spring with mild overshoot reads
 * as physical/tactile, which is the whole reason to reach for Reanimated here.
 */
export const SPRING_BACK_CONFIG: WithSpringConfig = {
  damping: 14,
  stiffness: 160,
  mass: 0.8,
  overshootClamping: false,
  restSpeedThreshold: 0.5,
  restDisplacementThreshold: 0.5,
};

/**
 * Build a `withDecay` config from the gesture's release velocity so a flung
 * card keeps its momentum and eases to a stop. Pure function — no React, no
 * side-effects; safe to call from a worklet. Cited by the `<Code>` block.
 */
export function decayFromVelocity(
  velocity: number,
  deceleration = 0.998,
): WithDecayConfig & { velocity: number } {
  return { velocity, deceleration };
}

/**
 * A sample easing curve for the `withTiming` excerpt — exported so the view can
 * cite it as the real value the demo passes (not a string illustration).
 */
export const TIMING_EASE = Easing.bezierFn(0.25, 0.1, 0.25, 1);

/* -------------------------------------------------------------------------- */
/* 1. Built-in Animated API                                                   */
/* -------------------------------------------------------------------------- */

export interface AnimatedApiDemo {
  /** The Animated node — spread into an `Animated.View`'s `transform`. */
  scale: Animated.Value;
  /** 0 = resting, 1 = expanded (mirrored in the Animated.Value for test reads). */
  expanded: boolean;
  /** Flip between the spring-open and spring-close animation. */
  toggle: () => void;
  /** Reset to the resting state. */
  reset: () => void;
}

/**
 * Built-in `Animated` demo. An `Animated.Value` (created once via `useRef`)
 * driven by `Animated.spring`. The animated prop is a `transform: scale`, so we
 * can use `useNativeDriver: true` — the animation runs on the native UI thread
 * without bridging through JS on every frame.
 *
 * NOTE on `useNativeDriver` (cited in the view): it ONLY works for
 * transform/opacity-style props (translate/scale/rotate/opacity). It CANNOT
 * animate layout props like `width`, `height`, `backgroundColor`, or
 * `borderRadius` — those have no native-thread counterpart and fall back to the
 * JS driver (`useNativeDriver: false`), which competes for JS-thread time and
 * drops frames when the JS thread is busy. For layout animations on the native
 * thread, use Reanimated v3 worklets (see the next hook) instead.
 */
export function useAnimatedApiDemo(): AnimatedApiDemo {
  // useRef keeps the Animated.Value stable across renders (creating a new one
  // each render would orphan the running animation).
  const scale = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      // Animated.spring returns a handle we can start with .start(); the
      // callback fires on completion (here we only need the state mirror).
      Animated.spring(scale, {
        toValue: next ? 1 : 0,
        useNativeDriver: true, // OK: animating transform/scale, not layout.
        friction: 6,
        tension: 80,
      }).start();
      return next;
    });
  }, [scale]);

  const reset = useCallback(() => {
    Animated.timing(scale, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
    setExpanded(false);
  }, [scale]);

  return { scale, expanded, toggle, reset };
}

/* -------------------------------------------------------------------------- */
/* 2. Reanimated v3 — worklets                                                */
/* -------------------------------------------------------------------------- */

export interface ReanimatedDemo {
  /** 0..1 progress driven by Reanimated's withSpring/withTiming. */
  progress: ReturnType<typeof useSharedValue<number>>;
  /** The animated style for the demo <Animated.View>. */
  cardStyle: ReturnType<typeof useAnimatedStyle>;
  /** 0 = collapsed, 1 = expanded (JS mirror; only updated on tap, not per-frame). */
  expanded: boolean;
  /** Toggle between expanded/collapsed; runs a worklet on the UI thread. */
  press: () => void;
  /** Animate to a specific value with withTiming (the easing excerpt). */
  timingTo: (v: number) => void;
}

/**
 * Reanimated v3 demo. `useSharedValue` is a UI-thread box that worklets write
 * to without crossing the JS bridge; `useAnimatedStyle` produces a style
 * object that Reanimated recomputes on the UI thread when the shared value
 * changes — so animations stay at 60/120fps even while the JS thread is busy.
 *
 * The worklet body lives inline in the hook — that's the idiomatic place
 * (Reanimated's babel plugin turns `useAnimatedStyle`'s callback into a
 * worklet automatically). Under jest, the reanimated mock makes these plain
 * JS calls (see `jest.mocks.ts`).
 */
export function useReanimatedDemo(): ReanimatedDemo {
  const progress = useSharedValue(0);
  const [expanded, setExpanded] = useState(false);

  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: 0.75 + progress.value * 0.5 }],
      opacity: 0.4 + progress.value * 0.6,
    };
  });

  const press = useCallback(() => {
    setExpanded((prev) => {
      const next = prev ? 0 : 1;
      progress.value = withSpring(next, SPRING_BACK_CONFIG);
      return !prev;
    });
  }, [progress]);

  const timingTo = useCallback(
    (v: number) => {
      progress.value = withTiming(v, { duration: 320, easing: TIMING_EASE });
    },
    [progress],
  );

  return { progress, cardStyle, expanded, press, timingTo };
}

/* -------------------------------------------------------------------------- */
/* 3. Gesture-driven pan card                                                 */
/* -------------------------------------------------------------------------- */

export interface PanCardDemo {
  /** Shared x/y translation consumed by the card's animated style. */
  offsetX: ReturnType<typeof useSharedValue<number>>;
  offsetY: ReturnType<typeof useSharedValue<number>>;
  /** Animated style translating the card. */
  cardStyle: ReturnType<typeof useAnimatedStyle>;
  /** The composed Gesture object — pass to <GestureDetector gesture={...}>. */
  gesture: ReturnType<typeof Gesture.Pan>;
  /** True while a drag is in progress (JS mirror, updated via runOnJS). */
  dragging: boolean;
  /** Snap back to origin immediately. */
  reset: () => void;
}

/**
 * Gesture-driven draggable card. `Gesture.Pan()` from react-native-gesture-
 * handler reports touch movement; its `.onUpdate` writes the delta into
 * Reanimated shared values (no JS round-trip per frame), and `.onEnd` springs
 * the card back to origin.
 *
 * `runOnJS` is used ONLY to flip a boolean mirror (`dragging`) — worklets
 * cannot call React's setState directly because setState lives on the JS
 * thread. The actual per-frame translation never crosses the bridge. This is
 * the textbook reason to pair gesture-handler with Reanimated: the gesture
 * event and the style update both run on the UI thread.
 */
export function usePanCardDemo(): PanCardDemo {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const [dragging, setDragging] = useState(false);

  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value },
      ],
    };
  });

  // start/drag mirrors for relative movement (gesture.translationX is absolute
  // from the gesture start; we add it to wherever the card was when it began).
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const setDraggingTrue = useCallback(() => setDragging(true), []);
  const setDraggingFalse = useCallback(() => setDragging(false), []);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      startX.value = offsetX.value;
      startY.value = offsetY.value;
      runOnJS(setDraggingTrue)();
    })
    .onUpdate((e) => {
      'worklet';
      offsetX.value = startX.value + e.translationX;
      offsetY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      // Spring back to origin on release. To let a fling keep momentum instead,
      // swap withSpring for withDecay(decayFromVelocity(e.velocityX)) — the
      // helper exported above builds that config from the gesture velocity.
      offsetX.value = withSpring(0, SPRING_BACK_CONFIG);
      offsetY.value = withSpring(0, SPRING_BACK_CONFIG);
      runOnJS(setDraggingFalse)();
    });

  const reset = useCallback(() => {
    offsetX.value = withSpring(0, SPRING_BACK_CONFIG);
    offsetY.value = withSpring(0, SPRING_BACK_CONFIG);
    setDragging(false);
  }, [offsetX, offsetY]);

  return { offsetX, offsetY, cardStyle, gesture, dragging, reset };
}

/* ------------------------------------------------------------------ */
/* Re-exports the view needs so it imports everything from the hook.  */
/* ------------------------------------------------------------------ */

export { Gesture, GestureDetector };
