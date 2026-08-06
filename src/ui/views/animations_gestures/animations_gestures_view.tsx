import { type ReactNode } from 'react';
import { Animated } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Text } from '../../components';
import { useTheme } from '../../design-system';
import { Section, Code, Pill } from '../../components';
import {
  useAnimatedApiDemo,
  useReanimatedDemo,
  usePanCardDemo,
  // Re-exported by the hooks module so the view can render <GestureDetector>
  // without a second import line into react-native-gesture-handler.
  GestureDetector,
} from './animations_gestures_hooks';

/** One-off illustration dimensions: the LIVE animated demo tiles. */
const ANIMATED_API_TILE = 96;
const REANIMATED_TILE = 110;
const PAN_CARD_TILE = 96;

/**
 * AnimationsGesturesView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (`animations_gestures_hooks.ts`); this file only renders.
 *
 * Teaches animation & gesture handling in React Native across three LIVE demos
 * — built-in `Animated`, Reanimated v3 worklets, and a gesture-driven draggable
 * card — plus performance and common-pattern sections. Each `<Code>` cites a
 * REAL artefact from the hooks file.
 *
 * Single-file helpers stay local per convention. No `any`; strict + erasure-clean.
 */
export function AnimationsGesturesView() {
  return (
    <ScreenScaffold
      title="Animations & Gestures"
    >
      <TwoSystemsCard />
      <BuiltInAnimatedCard />
      <ReanimatedCard />
      <GesturesCard />
      <PerformanceCard />
      <CommonPatternsCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* Local presentational helpers                                        */
/* ------------------------------------------------------------------ */

/** A labelled do/don't row used by the performance section. */
interface PerfRowProps {
  kind: 'do' | 'avoid';
  title: string;
  children: ReactNode;
}

function PerfRow({ kind, title, children }: PerfRowProps) {
  const tone = kind === 'do' ? 'success' : 'danger';
  return (
    <Box p="sm" radius="sm" bg="surfaceVariant">
      <Box row gap="sm" center style={{ flexWrap: 'wrap' }}>
        <Pill tone={tone}>{kind === 'do' ? 'DO' : 'AVOID'}</Pill>
        <Text variant="small" style={{ fontWeight: '600' }}>
          {title}
        </Text>
      </Box>
      <Text variant="caption" tone="muted" mt="xxs">
        {children}
      </Text>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Two animation systems                                            */
/* ------------------------------------------------------------------ */

function TwoSystemsCard() {
  return (
    <Section
      title="Two animation systems"
      explanation="RN ships a built-in Animated API; Reanimated v3 is the modern, worklet-based successor. Pick based on what you are animating and how smooth it must be."
    >
      <Box gap="xs">
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Box row gap="sm" center style={{ flexWrap: 'wrap' }}>
            <Text variant="small" style={{ fontWeight: '600' }}>
              Built-in Animated
            </Text>
            <Pill tone="default">JS-thread or native</Pill>
          </Box>
          <Text variant="caption" tone="muted" mt="xxs">
            Imperative: create an <Text style={{ fontFamily: 'monospace' }}>Animated.Value</Text>,
            drive it with <Text style={{ fontFamily: 'monospace' }}>Animated.timing</Text> /
            spring / sequence, and spread it into an
            <Text style={{ fontFamily: 'monospace' }}> Animated.View</Text>. With
            <Text style={{ fontFamily: 'monospace' }}> useNativeDriver: true</Text> the
            transform/opacity animation runs on the native UI thread; otherwise JS.
            No extra deps. Good for simple one-off motion.
          </Text>
        </Box>
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Box row gap="sm" center style={{ flexWrap: 'wrap' }}>
            <Text variant="small" style={{ fontWeight: '600' }}>
              Reanimated v3 (worklets)
            </Text>
            <Pill tone="primary">UI-thread</Pill>
          </Box>
          <Text variant="caption" tone="muted" mt="xxs">
            Declare worklets (<Text style={{ fontFamily: 'monospace' }}>useAnimatedStyle</Text>)
            that read <Text style={{ fontFamily: 'monospace' }}>useSharedValue</Text>s and
            run on the UI thread, driven by <Text style={{ fontFamily: 'monospace' }}>withSpring</Text> /
            <Text style={{ fontFamily: 'monospace' }}> withTiming</Text>. Animates ANY prop
            (incl. layout), integrates with gesture-handler, and stays 60/120fps even when
            the JS thread is busy. The standard for anything non-trivial.
          </Text>
        </Box>
      </Box>
      <Box p="sm" radius="md" bg="background">
        <Text variant="small" style={{ fontWeight: '600' }}>When to pick which</Text>
        <Text variant="caption" tone="muted" mt="xxs">
          Reach for built-in <Text style={{ fontFamily: 'monospace' }}>Animated</Text> for a
          quick fade/scale on mount or a single transition where the JS thread is idle. Reach
          for Reanimated for gesture-driven motion, layout animations, anything that must stay
          smooth under load, and anything that animates non-transform props. This app already
          ships Reanimated (the Drawer depends on it), so there is no install cost to using it.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Built-in Animated API — LIVE                                     */
/* ------------------------------------------------------------------ */

function BuiltInAnimatedCard() {
  const demo = useAnimatedApiDemo();
  const { theme } = useTheme();
  return (
    <Section
      title="LIVE — built-in Animated API"
      explanation="An Animated.Value driven by Animated.spring. Press Toggle; the scale runs on the native UI thread because the animated prop is a transform (useNativeDriver works)."
    >
      <Box gap="sm">
        <Box p="md" radius="md" bg="surfaceVariant" center>
          {/* Animated.View spreads the animated node into a transform. */}
          <Animated.View
            testID="animated-api-box"
            style={{
              width: ANIMATED_API_TILE,
              height: ANIMATED_API_TILE,
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.primary,
              transform: [{ scale: demo.scale }],
            }}
          />
        </Box>
        <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            testID="animated-api-toggle"
            title={demo.expanded ? 'Collapse' : 'Expand'}
            onPress={demo.toggle}
          />
          <Button title="Reset" variant="outline" onPress={demo.reset} />
          <Pill tone={demo.expanded ? 'primary' : 'muted'}>
            {demo.expanded ? 'expanded' : 'resting'}
          </Pill>
        </Box>
        <Text variant="caption" tone="muted">
          The square scales between 0 and 1 via <Text style={{ fontFamily: 'monospace' }}>Animated.spring</Text>.
          Because we animate <Text style={{ fontFamily: 'monospace' }}>transform: scale</Text>,
          <Text style={{ fontFamily: 'monospace' }}> useNativeDriver: true</Text> is valid and the
          motion never waits on the JS thread.
        </Text>
      </Box>

      <Code language="useAnimatedApiDemo (excerpt)" caption="src/ui/views/animations_gestures/animations_gestures_hooks.ts">{`import { Animated } from 'react-native';

export function useAnimatedApiDemo() {
  // useRef keeps the Animated.Value stable across renders.
  const scale = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    const next = !expanded;
    Animated.spring(scale, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,   // OK: animating transform/scale, NOT layout
      friction: 6,
      tension: 80,
    }).start();
    setExpanded(next);
  };

  return { scale, expanded, toggle };
}

// The view spreads it into a transform:
//   <Animated.View style={{ transform: [{ scale }] }} />`}</Code>
      <Box p="sm" radius="sm" bg="surfaceVariant">
        <Text variant="small" style={{ fontWeight: '600' }}>
          The useNativeDriver caveat
        </Text>
        <Text variant="caption" tone="muted" mt="xxs">
          <Text style={{ fontFamily: 'monospace' }}>useNativeDriver: true</Text> ONLY works for
          transform/opacity-style props (translate, scale, rotate, opacity). It CANNOT animate
          layout props like <Text style={{ fontFamily: 'monospace' }}>width</Text>,
          <Text style={{ fontFamily: 'monospace' }}> height</Text>,
          <Text style={{ fontFamily: 'monospace' }}> backgroundColor</Text>, or
          <Text style={{ fontFamily: 'monospace' }}> borderRadius</Text> — those fall back to the
          JS driver and drop frames under load. For native layout animation, use Reanimated v3.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Reanimated v3 — worklets — LIVE                                  */
/* ------------------------------------------------------------------ */

function ReanimatedCard() {
  const demo = useReanimatedDemo();
  const { theme } = useTheme();
  return (
    <Section
      title="LIVE — Reanimated v3 (worklets)"
      explanation="A useSharedValue driven by withSpring, consumed by a useAnimatedStyle that runs on the UI thread. Press Toggle to see the spring; press Timing to swap to an eased withTiming."
    >
      <Box gap="sm">
        <Box p="md" radius="md" bg="surfaceVariant" center>
          <Animated.View
            testID="reanimated-box"
            style={[
              {
                width: REANIMATED_TILE,
                height: REANIMATED_TILE,
                borderRadius: theme.radii.lg,
                backgroundColor: theme.colors.primary,
              },
              // useAnimatedStyle returns a plain object under jest (the mock);
              // on device this is a worklet-driven style that recomputes on the
              // UI thread whenever \`progress\` changes.
              demo.cardStyle as Record<string, unknown>,
            ]}
          />
        </Box>
        <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            testID="reanimated-toggle"
            title={demo.expanded ? 'Collapse' : 'Expand'}
            onPress={demo.press}
          />
          <Button title="Timing to 0.5" variant="outline" onPress={() => demo.timingTo(0.5)} />
          <Pill tone={demo.expanded ? 'primary' : 'muted'}>
            {demo.expanded ? 'expanded' : 'resting'}
          </Pill>
        </Box>
        <Text variant="caption" tone="muted">
          The card scales and fades by reading a <Text style={{ fontFamily: 'monospace' }}>useSharedValue</Text> inside
          a <Text style={{ fontFamily: 'monospace' }}>useAnimatedStyle</Text> worklet. The worklet
          body runs on the UI thread — the JS thread is never asked to recompute the style per frame.
        </Text>
      </Box>

      <Code language="useReanimatedDemo (excerpt)" caption="the real hook the demo uses">{`import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export function useReanimatedDemo() {
  const progress = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => {
    'worklet';                       // runs on the UI thread
    return {
      transform: [{ scale: 0.75 + progress.value * 0.5 }],
      opacity: 0.4 + progress.value * 0.6,
    };
  });

  const press = () => {
    // Writing a shared value from JS schedules a UI-thread animation.
    progress.value = withSpring(progress.value === 0 ? 1 : 0, SPRING_BACK_CONFIG);
  };

  const timingTo = (v) => {
    progress.value = withTiming(v, { duration: 320, easing: TIMING_EASE });
  };

  return { progress, cardStyle, press, timingTo };
}

// SPRING_BACK_CONFIG + TIMING_EASE are pure consts exported from the hooks file.
export const SPRING_BACK_CONFIG = { damping: 14, stiffness: 160, mass: 0.8 };
export const TIMING_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Gestures — react-native-gesture-handler — LIVE                   */
/* ------------------------------------------------------------------ */

function GesturesCard() {
  const demo = usePanCardDemo();
  const { theme } = useTheme();
  return (
    <Section
      title="LIVE — gestures (react-native-gesture-handler)"
      explanation="A Gesture.Pan() updates Reanimated shared values on the UI thread; the card follows your finger and springs back on release. Drag the card."
    >
      <Box gap="sm">
        <Box p="md" radius="md" bg="surfaceVariant" style={{ overflow: 'hidden' }}>
          {/* GestureDetector wraps the animated target. The app is already
              wrapped in GestureHandlerRootView by app/_layout.tsx, so this
              view does NOT add its own (double-wrapping is harmless but noisy). */}
          <GestureDetector gesture={demo.gesture}>
            <Animated.View
              testID="pan-card"
              style={[
                {
                  width: PAN_CARD_TILE,
                  height: PAN_CARD_TILE,
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.primary,
                },
                demo.cardStyle as Record<string, unknown>,
              ]}
            />
          </GestureDetector>
        </Box>
        <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button title="Snap back" variant="outline" onPress={demo.reset} />
          <Pill tone={demo.dragging ? 'primary' : 'muted'}>
            {demo.dragging ? 'dragging' : 'idle'}
          </Pill>
        </Box>
        <Text variant="caption" tone="muted">
          The <Text style={{ fontFamily: 'monospace' }}>'worklet'</Text> handlers write the
          gesture delta into <Text style={{ fontFamily: 'monospace' }}>offsetX</Text> /
          <Text style={{ fontFamily: 'monospace' }}> offsetY</Text> shared values; the card's
          animated style translates by them. On release,
          <Text style={{ fontFamily: 'monospace' }}> withSpring</Text> returns it to origin.
        </Text>
      </Box>

      <Code language="usePanCardDemo (excerpt)" caption="Gesture.Pan() + runOnJS">{`import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue, useAnimatedStyle,
  withSpring, runOnJS,
} from 'react-native-reanimated';

export function usePanCardDemo() {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);   // snapshot at gesture start
  const startY = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value },
      ],
    };
  });

  const gesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      startX.value = offsetX.value;     // remember where the card was
      startY.value = offsetY.value;
      runOnJS(setDraggingTrue)();       // cross to JS for the boolean mirror
    })
    .onUpdate((e) => {
      'worklet';
      offsetX.value = startX.value + e.translationX;
      offsetY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      // Spring back to origin. To let a fling keep momentum, use:
      //   offsetX.value = withDecay({ velocity: e.velocityX, deceleration: 0.998 });
      offsetX.value = withSpring(0, SPRING_BACK_CONFIG);
      offsetY.value = withSpring(0, SPRING_BACK_CONFIG);
      runOnJS(setDraggingFalse)();
    });

  return { offsetX, offsetY, cardStyle, gesture };
}`}</Code>
      <Box p="sm" radius="sm" bg="surfaceVariant">
        <Text variant="small" style={{ fontWeight: '600' }}>
          Why runOnJS here?
        </Text>
        <Text variant="caption" tone="muted" mt="xxs">
          Worklets run on the UI thread and cannot call React&apos;s
          <Text style={{ fontFamily: 'monospace' }}> setState</Text> directly —
          <Text style={{ fontFamily: 'monospace' }}> setState</Text> lives on the JS thread.
          <Text style={{ fontFamily: 'monospace' }}> runOnJS</Text> posts the call back to JS.
          Use it only for occasional bookkeeping (a boolean flag, a haptic trigger) — never for
          per-frame values, which stay in shared values to avoid the bridge round-trip.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Performance — JS thread vs UI thread                             */
/* ------------------------------------------------------------------ */

function PerformanceCard() {
  return (
    <Section
      title="Performance — JS thread vs UI thread"
      explanation="Animation smoothness is decided by WHICH thread recomputes the style each frame. The JS thread is shared with your React work; the native UI thread is not."
    >
      <Box gap="xs">
        <PerfRow kind="do" title="useNativeDriver / Reanimated worklets">
          Keep the per-frame style work on the native UI thread. With built-in
          <Text style={{ fontFamily: 'monospace' }}> Animated</Text> that means
          <Text style={{ fontFamily: 'monospace' }}> useNativeDriver: true</Text> (transform/
          opacity only); with Reanimated it is the default — worklets run on the UI thread.
        </PerfRow>
        <PerfRow kind="avoid" title="Animating layout props on the JS driver">
          <Text style={{ fontFamily: 'monospace' }}>width</Text>,
          <Text style={{ fontFamily: 'monospace' }}> height</Text>,
          <Text style={{ fontFamily: 'monospace' }}> backgroundColor</Text> animated with
          <Text style={{ fontFamily: 'monospace' }}> useNativeDriver: false</Text> recompute on
          the JS thread and drop frames the moment the thread is busy (a fetch, a heavy render,
          a re-render storm).
        </PerfRow>
        <PerfRow kind="do" title="setNativeProps for continuous drag (legacy escape hatch)">
          <Text style={{ fontFamily: 'monospace' }}>setNativeProps</Text> writes a prop straight
          to the native node without a React re-render — useful on the built-in
          <Text style={{ fontFamily: 'monospace' }}> Animated</Text> path for high-frequency
          updates. With Reanimated + shared values you do not need it; prefer worklets.
        </PerfRow>
        <PerfRow kind="avoid" title="setState on every animation frame">
          Driving an animation through React state (re-rendering every frame) puts the JS thread
          on the hot path and ruins smoothness. Hold animated values in
          <Text style={{ fontFamily: 'monospace' }}> Animated.Value</Text> /
          <Text style={{ fontFamily: 'monospace' }}> useSharedValue</Text> and let the style
          update bypass React entirely.
        </PerfRow>
        <PerfRow kind="do" title="Memoise components around animated regions">
          Animated subtrees still re-render if their parent does. Wrap stable siblings in
          <Text style={{ fontFamily: 'monospace' }}> React.memo</Text> and pass stable callbacks
          (<Text style={{ fontFamily: 'monospace' }}>useCallback</Text>) so an unrelated state
          change does not invalidate the animated subtree.
        </PerfRow>
      </Box>
      <Box p="sm" radius="md" bg="background">
        <Text variant="small" style={{ fontWeight: '600' }}>
          Why Reanimated avoids the bridge
        </Text>
        <Text variant="caption" tone="muted" mt="xxs">
          A shared value lives in native memory; a worklet is compiled to a UI-thread function
          that reads/writes it directly. No JS↔native bridge call per frame, no React re-render,
          no serialization. That is why gesture-driven motion stays smooth even while the JS
          thread is parsing JSON or running a reducer.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Common patterns                                                  */
/* ------------------------------------------------------------------ */

function CommonPatternsCard() {
  return (
    <Section
      title="Common patterns"
      explanation="Composition helpers (parallel/sequence/stagger), interpolation, layout animations, and haptics-on-gesture — the building blocks most animation features compose from."
    >
      <Box gap="xs">
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            parallel / sequence / stagger
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            Built-in <Text style={{ fontFamily: 'monospace' }}>Animated.parallel</Text> /
            <Text style={{ fontFamily: 'monospace' }}> sequence</Text> /
            <Text style={{ fontFamily: 'monospace' }}> stagger</Text> compose multiple animations
            into one; Reanimated mirrors them with
            <Text style={{ fontFamily: 'monospace' }}> withSequence</Text> /
            <Text style={{ fontFamily: 'monospace' }}> withRepeat</Text> /
            <Text style={{ fontFamily: 'monospace' }}> withDelay</Text>.
          </Text>
        </Box>
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>interpolate</Text>
          <Text variant="caption" tone="muted" mt="xxs">
            Map a source value (a scroll offset, a drag distance, a 0..1 progress) onto a different
            output range — opacity, colour, rotation. Both libraries ship
            <Text style={{ fontFamily: 'monospace' }}> interpolate</Text>; Reanimated&apos;s runs
            in a worklet.
          </Text>
        </Box>
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>Layout animations</Text>
          <Text variant="caption" tone="muted" mt="xxs">
            Built-in: <Text style={{ fontFamily: 'monospace' }}>LayoutAnimation</Text> (a JS-thread
            hint to animate the next layout pass — simple but coarse). Reanimated:
            <Text style={{ fontFamily: 'monospace' }}> entering</Text> /
            <Text style={{ fontFamily: 'monospace' }}> exiting</Text> /
            <Text style={{ fontFamily: 'monospace' }}> layout</Text> props (e.g.
            <Text style={{ fontFamily: 'monospace' }}> &lt;Animated.View entering={curlyOpen()}FadeIn{curlyClose()}&gt;</Text>)
            for per-item mount/unmount/reorder animations on the UI thread.
          </Text>
        </Box>
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>Haptics on gesture</Text>
          <Text variant="caption" tone="muted" mt="xxs">
            Pair a gesture with tactile feedback — call
            <Text style={{ fontFamily: 'monospace' }}> Haptics.impactAsync</Text> from
            <Text style={{ fontFamily: 'monospace' }}> expo-haptics</Text> (NOT installed in this
            app — mentioned illustratively) inside an
            <Text style={{ fontFamily: 'monospace' }}> onEnd</Text> /
            <Text style={{ fontFamily: 'monospace' }}> onActive</Text> worklet via
            <Text style={{ fontFamily: 'monospace' }}> runOnJS</Text>. Always gate haptics behind
            a setting; some users disable them system-wide.
          </Text>
        </Box>
      </Box>

      <Code language="common patterns">{`import { Animated } from 'react-native';
import {
  withSequence, withRepeat, withDelay,
  interpolate, FadeIn, useAnimatedStyle,
} from 'react-native-reanimated';

// Built-in: run animations in parallel / sequence / stagger
Animated.parallel([
  Animated.timing(fade, { toValue: 1, useNativeDriver: true }),
  Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
]).start();

// Reanimated: compose drivers
progress.value = withSequence(
  withDelay(100, withSpring(1, SPRING_BACK_CONFIG)),
  withRepeat(withTiming(0.5, { duration: 200 }), 3, true),
);

// interpolate maps a value to a range (worklet-safe)
const opacity = useAnimatedStyle(() => {
  'worklet';
  return { opacity: interpolate(progress.value, [0, 1], [0.3, 1]) };
});

// Reanimated layout animation: per-item mount transition
//   <Animated.View entering={FadeIn} exiting={FadeOut} />

// Haptics on gesture end (expo-haptics NOT installed here — illustrative):
//   .onEnd(() => { runOnJS(Haptics.impactAsync)(ImpactFeedbackStyle.Light); });`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Local helpers                                                        */
/* ------------------------------------------------------------------ */

/** Returns '{' / '}' as plain strings so the layout-animations snippet can
 *  show <Animated.View entering={FadeIn}> without using a real JSX expression
 *  or a nested template literal that would need dollar-brace escaping. */
function curlyOpen(): string {
  return '{';
}
function curlyClose(): string {
  return '}';
}

