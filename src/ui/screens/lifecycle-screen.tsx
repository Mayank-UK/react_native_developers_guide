import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenScaffold } from '../components/screen-scaffold';
import { Box, Button, Card, Text, useTheme } from '../design-system';
import { Section, Code, Pill } from '../components';

/**
 * Lifecycle screen — a teaching artifact. The key idea, stated up front:
 * modern React (and React Native) components are FUNCTIONS, and function
 * components have NO class lifecycle methods. The modern equivalent is HOOKS —
 * primarily `useEffect`. Every concept below ships with a LIVE, interactive
 * demo rendered in-screen so the user can watch the lifecycle fire as they
 * toggle, change deps, and mount/unmount.
 *
 * Style note: single-file helpers (`Section`, `Code`, `Pill`, `useEventLog`,
 * `LogPanel`, and the small demo sub-components) stay as local functions per
 * project convention; only multi-file pieces graduate to `ui/components`.
 */

export function LifecycleScreen() {
  return (
    <ScreenScaffold
      title="Component Lifecycle"
      subtitle="There are no class lifecycle methods in function components — only hooks"
    >
      <IntroCard />
      <PhasesCard />
      <DependencyArrayPlaygroundCard />
      <CleanupCard />
      <LayoutEffectCard />
      <TimingAndStrictModeCard />
      <MemoAndCallbackCard />
      <RefAcrossRendersCard />
      <ClassMappingCard />
      <FocusEffectCard />
      <AppStateCard />
    </ScreenScaffold>
  );
}
type LogTone = 'default' | 'muted' | 'primary' | 'danger';
type LogEntry = { id: number; text: string; tone: LogTone };

/**
 * A small hook that timestamps lifecycle events into a capped list so the user
 * can SEE mount/update/cleanup sequencing live. The id is read OUTSIDE the
 * setState updater so the updater stays pure (StrictMode double-invokes
 * updaters in dev — mutating a ref inside would be a forbidden side-effect).
 */
function useEventLog(max = 7) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const idRef = useRef(0);
  const log = useCallback(
    (text: string, tone: LogTone = 'default') => {
      const id = idRef.current;
      idRef.current += 1;
      setEntries((prev) => [{ id, text, tone }, ...prev].slice(0, max));
    },
    [max],
  );
  const clear = useCallback(() => setEntries([]), []);
  return [entries, log, clear] as const;
}

function LogPanel({
  entries,
  onClear,
  emptyHint = 'Waiting for events…',
}: {
  entries: readonly LogEntry[];
  onClear?: () => void;
  emptyHint?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radii.sm,
        padding: theme.spacing.sm,
        minHeight: 120,
      }}
    >
      {entries.length === 0 ? (
        <Text variant="caption" tone="muted">
          {emptyHint}
        </Text>
      ) : (
        <Box gap="xxs">
          {entries.map((e) => (
            <Box key={e.id} row gap="xs" style={{ alignItems: 'baseline' }}>
              <Text
                variant="caption"
                tone={e.tone === 'danger' ? 'danger' : e.tone === 'primary' ? 'primary' : 'muted'}
                style={{ fontFamily: 'monospace' }}
              >
                •
              </Text>
              <Text
                variant="caption"
                tone={e.tone === 'danger' ? 'danger' : e.tone === 'primary' ? 'primary' : e.tone === 'muted' ? 'muted' : 'default'}
                style={{ fontFamily: 'monospace' }}
              >
                {e.text}
              </Text>
            </Box>
          ))}
        </Box>
      )}
      {onClear ? (
        <Box mt="sm">
          <Button title="Clear log" variant="ghost" onPress={onClear} />
        </Box>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Intro — the mental model                                         */
/* ------------------------------------------------------------------ */

function IntroCard() {
  return (
    <Section title="The component lifecycle">
      <Text variant="body">
        A component goes through three phases: it{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          mounts
        </Text>{' '}
        (first appears), it{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          updates
        </Text>{' '}
        (re-renders when state/props change), and it{' '}
        <Text variant="body" tone="danger" style={{ fontWeight: '600' }}>
          unmounts
        </Text>{' '}
        (is removed). In old class components these were three separate methods.
        In modern function components they collapse into ONE hook:{' '}
        <Text variant="body" tone="primary" style={{ fontFamily: 'monospace' }}>
          useEffect
        </Text>
        .
      </Text>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          Class components and their lifecycle methods (componentDidMount,
          componentDidUpdate, componentWillUnmount, shouldComponentUpdate, …)
          are legacy. React still ships them for back-compat, but the standard
          — and the only style used anywhere in this app — is function
          components + hooks. This screen teaches hooks as the standard and
          shows the class→hook mapping at the end so you can read old code.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The three phases → useEffect mapping                             */
/* ------------------------------------------------------------------ */

const PHASE_ROWS: ReadonlyArray<{
  phase: string;
  deps: string;
  meaning: string;
}> = [
  {
    phase: 'mount',
    deps: '[]',
    meaning: 'Empty dependency array — effect runs ONCE after first render.',
  },
  {
    phase: 'update',
    deps: '[a, b]',
    meaning: 'Effect re-runs whenever one of the listed deps changes.',
  },
  {
    phase: 'every render',
    deps: '(none)',
    meaning: 'No array — effect runs after EVERY render. Rare and usually wrong.',
  },
  {
    phase: 'unmount / cleanup',
    deps: 'return () => {}',
    meaning: 'The function you RETURN runs before the next effect and on unmount.',
  },
];

function PhasesCard() {
  return (
    <Section
      title="The three phases, mapped to useEffect"
      explanation="useEffect(fn, deps) takes a function and an optional dependency array. The array is what selects which phase you are reacting to. Returning a cleanup function is how you handle the unmount/teardown phase."
    >
      <Box gap="xs">
        {PHASE_ROWS.map((r) => (
          <Box key={r.phase} gap="xxs">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Pill tone="primary">{r.phase}</Pill>
              <Code>{`useEffect(fn, ${r.deps})`}</Code>
            </Box>
            <Text variant="caption" tone="muted">
              {r.meaning}
            </Text>
          </Box>
        ))}
        <Code>{`useEffect(() => {
  // setup: subscribe, start a timer, fetch…
  return () => {
    // cleanup: unsubscribe, clear the timer, abort fetch…
  };
}, [deps]); // ← the array controls WHEN this re-runs`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Dependency-array playground (LIVE)                               */
/* ------------------------------------------------------------------ */

type DepMode = 'mount' | 'dep' | 'every';

const DEP_MODES: ReadonlyArray<DepMode> = ['mount', 'dep', 'every'];

/** Mount-only variant: empty dependency array. */
function MountOnlyChild({ log }: { log: (text: string, tone?: LogTone) => void }) {
  useEffect(() => {
    log('[] effect ran — mount only', 'primary');
    return () => log('[] cleanup — unmount', 'danger');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Dep variant: depends on `dep`. */
function DepChild({
  dep,
  log,
}: {
  dep: number;
  log: (text: string, tone?: LogTone) => void;
}) {
  useEffect(() => {
    log(`[dep] effect ran — dep=${dep}`, 'primary');
    return () => log(`[dep] cleanup — before re-run / unmount`, 'danger');
  }, [dep, log]);
  return null;
}

/** Every-render variant: no dependency array. */
function EveryChild({
  renderId,
  log,
}: {
  renderId: number;
  log: (text: string, tone?: LogTone) => void;
}) {
  useEffect(() => {
    log(`effect ran — render #${renderId} (NO array)`, 'primary');
    return () => log(`cleanup — render #${renderId}`, 'danger');
  });
  return null;
}

function DependencyArrayPlaygroundCard() {
  const [mode, setMode] = useState<DepMode>('mount');
  const [dep, setDep] = useState(0);
  const [entries, log, clear] = useEventLog();

  // A render id, bumped by "force render" so the no-array variant can show
  // it fires on EVERY render.
  const [renderId, setRenderId] = useState(1);

  return (
    <Section
      title="Dependency-array playground"
      explanation="Switch the variant and change the dep, then watch the log show exactly when the effect fires and when its cleanup runs. Each variant is a separate child keyed by mode, so switching variant remounts it (cleanup → mount)."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {DEP_MODES.map((m) => (
            <Button
              key={m}
              title={`useEffect(fn, ${m === 'mount' ? '[]' : m === 'dep' ? '[dep]' : '—'})`}
              variant={mode === m ? 'filled' : 'outline'}
              onPress={() => {
                log(`switch → ${m}`, 'muted');
                setMode(m);
              }}
            />
          ))}
        </Box>

        <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button title="dep +1 (change dep)" variant="outline" onPress={() => setDep((d) => d + 1)} />
          <Button
            title="force render"
            variant="ghost"
            onPress={() => setRenderId((r) => r + 1)}
          />
          <Text variant="caption" tone="muted">
            mode={mode} · dep={dep} · render#{renderId}
          </Text>
        </Box>

        {/* key forces a clean remount whenever the variant or render id changes */}
        {mode === 'mount' ? (
          <MountOnlyChild key={`mount-${renderId}`} log={log} />
        ) : mode === 'dep' ? (
          <DepChild key={`dep-${renderId}`} dep={dep} log={log} />
        ) : (
          <EveryChild key={`every-${renderId}`} renderId={renderId} log={log} />
        )}

        <LogPanel entries={entries} onClear={clear} />
        <Text variant="caption" tone="muted">
          Observe: in <Text style={{ fontWeight: '600' }}>[]</Text> the effect
          runs once per mount and the cleanup only on unmount. In{' '}
          <Text style={{ fontWeight: '600' }}>[dep]</Text> the effect re-runs
          only when dep changes (cleanup runs first). With{' '}
          <Text style={{ fontWeight: '600' }}>no array</Text> it runs after every
          render — note how even “force render” (unrelated state) triggers it.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Cleanup — mount/unmount a child with a live timer (LIVE)         */
/* ------------------------------------------------------------------ */

/** A child that starts an interval on mount and clears it on unmount. */
function TimerChild({ log }: { log: (text: string, tone?: LogTone) => void }) {
  const [ticks, setTicks] = useState(0);
  // Ref mirrors `ticks` so the interval callback can read the latest value
  // WITHOUT calling `log` (which setState's the parent) from inside the
  // `setTicks` updater — that is a React-19 anti-pattern (setState of another
  // component during an updater). The interval is a normal async context, so
  // calling `log` here is fine.
  const ticksRef = useRef(0);
  useEffect(() => {
    log('TimerChild mounted — starting interval', 'primary');
    const id = setInterval(() => {
      ticksRef.current += 1;
      setTicks(ticksRef.current);
      log(`tick → ${ticksRef.current}`);
    }, 1000);
    return () => {
      clearInterval(id);
      log('TimerChild cleanup — interval cleared', 'danger');
    };
  }, [log]);
  return (
    <Box p="sm" radius="md" bg="surfaceVariant" center>
      <Text variant="h2" tone="primary">
        {ticks}s
      </Text>
      <Text variant="caption" tone="muted">
        interval running — unmount me to see cleanup
      </Text>
    </Box>
  );
}

function CleanupCard() {
  const [mounted, setMounted] = useState(true);
  const [entries, log, clear] = useEventLog(8);
  return (
    <Section
      title="Cleanup — teardown on unmount"
      explanation="Whatever you start in an effect, you must tear down in the cleanup function. This is how you avoid leaked timers, orphan subscriptions, and stale listeners. Toggle the child: starting it runs the effect; removing it runs the cleanup (watch the log turn red)."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center' }}>
          <Button
            title={mounted ? 'Unmount child' : 'Mount child'}
            variant={mounted ? 'outline' : 'filled'}
            onPress={() => setMounted((m) => !m)}
          />
          <Pill tone={mounted ? 'primary' : 'muted'}>{mounted ? 'mounted' : 'unmounted'}</Pill>
        </Box>
        {mounted ? <TimerChild log={log} /> : null}
        <LogPanel entries={entries} onClear={clear} />
        <Text variant="caption" tone="muted">
          The cleanup also runs before every re-run of the effect (not just on
          unmount). That is why the cleanup is the right place to invalidate the
          previous setup before doing it again.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. useLayoutEffect vs useEffect (LIVE)                              */
/* ------------------------------------------------------------------ */

function LayoutEffectChild() {
  const [big, setBig] = useState(false);
  const [entries, log, clear] = useEventLog(6);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  // useLayoutEffect runs SYNCHRONOUSLY after native-tree mutations but BEFORE
  // the screen is painted — so reading/setting layout here avoids a visible
  // flicker. Deps = [big] so it fires on mount + each size toggle (not every
  // render, which would thrash layout passes on the New Architecture).
  useLayoutEffect(() => {
    log('useLayoutEffect — before paint', 'primary');
  }, [big]);

  // useEffect runs AFTER paint — the user has already seen one frame.
  useEffect(() => {
    log('useEffect — after paint');
  }, [big]);

  return (
    <Box gap="sm">
      <Box row gap="sm" style={{ alignItems: 'center' }}>
        <Button title="toggle box size" variant="outline" onPress={() => setBig((b) => !b)} />
        <Text variant="caption" tone="muted">
          measured width ={' '}
          <Text style={{ fontWeight: '600' }}>
            {measuredWidth === null ? '…' : `${measuredWidth}px`}
          </Text>
        </Text>
      </Box>
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setMeasuredWidth(Math.round(w));
        }}
        style={{
          height: 44,
          width: big ? '100%' : 120,
          backgroundColor: '#2b6cb0',
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="small" tone="onPrimary">
          {big ? 'wide' : 'narrow'}
        </Text>
      </View>
      <LogPanel entries={entries} onClear={clear} />
      <Text variant="caption" tone="muted">
        On every size change the log shows the order: useLayoutEffect fires
        first (synchronously, before paint) so the measured value is already
        correct when the frame is drawn — no flicker. Prefer useEffect for
        anything that does not need to read layout (subscriptions, fetching,
        logging); reach for useLayoutEffect only for visual measurement / scroll
        / size sync where a one-frame mismatch would be visible.
      </Text>
    </Box>
  );
}

function LayoutEffectCard() {
  return (
    <Section
      title="useLayoutEffect vs useEffect"
      explanation="Both have the same signature and dependency model. The only difference is timing. useLayoutEffect runs synchronously after React updates the DOM/native tree but BEFORE the screen is painted; useEffect runs asynchronously after paint. Use the layout variant only when you must read or set geometry (measuring a box, repositioning) to avoid a visible flicker."
    >
      <LayoutEffectChild />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Effect timing & Strict Mode double-invoke                        */
/* ------------------------------------------------------------------ */

function TimingAndStrictModeCard() {
  return (
    <Section
      title="Effect timing & Strict Mode"
      explanation="After every commit (a render whose result React actually applies to the screen) React runs effects top-to-bottom, in declaration order. In development with <React.StrictMode>, React deliberately mounts, unmounts, and re-mounts each component once — so every effect runs setup→cleanup→setup. This surfaces buggy cleanups (the whole point). It does NOT happen in production."
    >
      <Box gap="xs">
        <Code>{`render (function body runs)
  → React commits the new tree (applies to native views)
     → Browser paints the frame
        → effects run, in order, top-to-bottom
           → on the NEXT commit: previous cleanups run, then new effects`}</Code>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" tone="muted">
            StrictMode dev double-invoke: setup → cleanup → setup. If your demo
            logs look doubled in dev (two “mount” lines), that is why — not a
            bug in your code. This app runs under StrictMode in dev, so the live
            logs above may show that doubling. Production builds run effects
            exactly once.
          </Text>
        </Box>
        <Text variant="caption" tone="muted">
          Rule of thumb: write every effect as if it could be mounted, unmounted
          and remounted at any time. If setup and cleanup are symmetric, Strict
          Mode is a non-issue.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. useMemo / useCallback — during-render optimizations              */
/* ------------------------------------------------------------------ */

/** Deliberately heavy pure calc so memoization is observable. */
function expensiveSum(n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      total += (i * j) % 7;
    }
  }
  return total;
}

function MemoAndCallbackCard() {
  const [size, setSize] = useState(150);
  const [unrelated, setUnrelated] = useState(0);
  const [lastComputedAt, setLastComputedAt] = useState(0);

  const sum = useMemo(() => expensiveSum(size), [size]);
  // The "last computed" timestamp is a side effect of recomputation, so it
  // belongs in an effect keyed on the memoized value — NOT inside `useMemo`
  // (calling setState during render is a React-19 anti-pattern).
  useEffect(() => {
    setLastComputedAt(Date.now());
  }, [sum]);

  // A stable callback identity — handy when passing handlers to memoized children.
  const grow = useCallback(() => setSize((s) => s + 50), []);

  return (
    <Section
      title="useMemo & useCallback — during-render lifecycle"
      explanation="These run DURING render (not after, like useEffect). They cache a value or a function across renders until a dep changes. They are optimizations tied to the update phase: skip recomputing expensive work, and keep function identity stable so memoized children don't re-render."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            sum(size={size})
          </Text>
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            {sum}
          </Text>
        </Box>
        <Box row gap="sm">
          <Button title="size +50" variant="outline" onPress={grow} />
          <Button title="size −50" variant="outline" onPress={() => setSize((s) => Math.max(50, s - 50))} />
        </Box>
        <Box row gap="sm" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            unrelated state: {unrelated}
          </Text>
          <Button title="bump unrelated" variant="ghost" onPress={() => setUnrelated((u) => u + 1)} />
        </Box>
        <Text variant="caption" tone="muted">
          Recomputed at:{' '}
          <Text style={{ fontFamily: 'monospace' }}>
            {new Date(lastComputedAt).toISOString().slice(11, 23)}
          </Text>
          . Bump “unrelated” — the render happens but the timestamp does NOT move
          (sum is reused from cache). Only changing size recomputes it.
        </Text>
        <Code>{`const sum = useMemo(() => expensive(size), [size]);
const handle = useCallback(() => doThing(x), [x]); // stable identity`}</Code>
        <Text variant="caption" tone="muted">
          Don't memoize everything — measure first. useMemo/useCallback cost
          memory + a deps check; they pay off only for genuinely expensive calcs
          or for props passed to memoized children.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. useRef — values that persist across renders without re-rendering */
/* ------------------------------------------------------------------ */

function RefAcrossRendersCard() {
  const [renderCount, setRenderCount] = useState(0);
  const renderRef = useRef(0);
  const [, setTick] = useState(0);

  renderRef.current += 1;

  return (
    <Section
      title="useRef — survives renders, never triggers them"
      explanation="A ref is a mutable box ({ current }) whose value persists for the full lifetime of the component — across every render and every update. Mutating it does NOT re-render. In lifecycle terms: it's how you keep state that you want to read inside effects/handlers without participating in the render cycle."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            useRef render counter:
          </Text>
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            {renderRef.current}
          </Text>
        </Box>
        <Box row gap="sm" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            useState-driven counter:
          </Text>
          <Text variant="body" style={{ fontWeight: '600' }}>{renderCount}</Text>
        </Box>
        <Box row gap="sm">
          <Button
            title="setState bump (re-render)"
            variant="outline"
            onPress={() => setRenderCount((c) => c + 1)}
          />
          <Button
            title="silent ref bump (no re-render)"
            variant="ghost"
            onPress={() => {
              renderRef.current += 1;
              // Prove the ref changed without using state — force a render to read it:
              setTick((n) => n + 1);
            }}
          />
        </Box>
        <Text variant="caption" tone="muted">
          Common lifecycle uses: storing interval/subscription IDs to clear in
          cleanup, holding a “latest value” for a stable callback, counting
          renders for debugging, and accessing imperative handles (refs to
          Views) for measurement.
        </Text>
        <Code>{`const idRef = useRef<number>();
useEffect(() => {
  idRef.current = setInterval(tick, 1000);
  return () => clearInterval(idRef.current); // cleanup reads it
}, []);`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Class lifecycle → hooks mapping table                            */
/* ------------------------------------------------------------------ */

const CLASS_HOOK_ROWS: ReadonlyArray<{ cls: string; hook: string; note: string }> = [
  {
    cls: 'constructor / this.state',
    hook: 'useState / useReducer',
    note: 'Initial state lives in the hook call, not a constructor.',
  },
  {
    cls: 'componentDidMount',
    hook: 'useEffect(fn, [])',
    note: 'Empty deps → runs once after mount.',
  },
  {
    cls: 'componentDidUpdate',
    hook: 'useEffect(fn, [deps])',
    note: 'Runs after the listed deps change.',
  },
  {
    cls: 'componentWillUnmount',
    hook: 'return () => {} from useEffect',
    note: 'The cleanup function IS your teardown.',
  },
  {
    cls: 'shouldComponentUpdate',
    hook: 'React.memo + useMemo/useCallback',
    note: 'Opt out of re-renders at the component boundary, not inside it.',
  },
  {
    cls: 'getDerivedStateFromProps',
    hook: 'derive during render',
    note: 'Compute derived values in the body; do not mirror props into state.',
  },
  {
    cls: 'getSnapshotBeforeUpdate',
    hook: 'useLayoutEffect',
    note: 'Read layout synchronously before the browser paints.',
  },
  {
    cls: 'forceUpdate',
    hook: 'useReducer x => x + 1',
    note: 'Force a render by toggling a throwaway state/reducer.',
  },
  {
    cls: 'this.refs / createRef',
    hook: 'useRef',
    note: 'Same idea: a mutable handle that persists across renders.',
  },
];

function ClassMappingCard() {
  return (
    <Section
      title="Class lifecycle → hooks (recognize-the-legacy map)"
      explanation="You will still meet class components in older codebases. Here is the whole table so you can translate. Notice how hooks collapse three separate methods (mount/update/unmount) into one useEffect with a dependency array and a cleanup return."
    >
      <Box gap="xs">
        {CLASS_HOOK_ROWS.map((r) => (
          <Box key={r.cls} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                {r.cls}
              </Text>
              <Text variant="caption" tone="muted">
                →
              </Text>
              <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                {r.hook}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.note}
            </Text>
          </Box>
        ))}
        <Text variant="caption" tone="muted" mt="xxs">
          No constructor, no `this`, no binding, no lifecycle order to memorize.
          Hooks compose: write multiple `useEffect`s and they run in order.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 10. useFocusEffect — navigation lifecycle (react-navigation)        */
/* ------------------------------------------------------------------ */

function FocusEffectCard() {
  const [entries, log, clear] = useEventLog(5);
  // useFocusEffect re-runs whenever this screen gains focus (navigation
  // lifecycle, NOT React mount). Cleanup runs on blur. Distinct from useEffect.
  useFocusEffect(
    useCallback(() => {
      log('useFocusEffect — screen gained focus', 'primary');
      return () => log('useFocusEffect cleanup — screen blurred', 'danger');
    }, [log]),
  );
  return (
    <Section
      title="useFocusEffect — navigation lifecycle"
      explanation="Beyond React's own lifecycle, RN apps have a NAVIGATION lifecycle: a screen is focused (visible) or blurred (covered/navigated away). expo-router / react-navigation expose useFocusEffect for work that must happen on focus (refresh data, start a video, reset scroll) and be torn down on blur."
    >
      <Box gap="sm">
        <LogPanel
          entries={entries}
          onClear={clear}
          emptyHint="Navigate away and come back to see focus/blur lines."
        />
        <Code>{`import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    refresh();            // runs on focus
    return () => stop();  // runs on blur
  }, []),
);`}</Code>
        <Text variant="caption" tone="muted">
          You should see at least one “gained focus” line from when you opened
          this screen. Navigate to another screen in the hub and return — you'll
          see the blur cleanup and a fresh focus line. This is independent of
          mount/unmount: the component often stays mounted while blurred.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 11. AppState — active / background / inactive (LIVE)                */
/* ------------------------------------------------------------------ */

function AppStateCard() {
  const [entries, log, clear] = useEventLog(6);
  const [current, setCurrent] = useState<string>('unknown');

  useEffect(() => {
    // AppState works on iOS, Android, and web (react-native-web maps it to the
    // document visibility API). It is a classic effect: subscribe on mount,
    // unsubscribe in cleanup.
    const sub = AppState.addEventListener('change', (nextState) => {
      setCurrent(nextState);
      log(`AppState → ${nextState}`, 'primary');
    });
    setCurrent(AppState.currentState);
    log(`subscribed (initial=${AppState.currentState})`, 'muted');
    return () => {
      sub.remove();
      log('AppState subscription removed', 'danger');
    };
  }, [log]);

  return (
    <Section
      title="AppState — the OS-level lifecycle"
      explanation="A second RN-specific lifecycle layer: the whole app can be active, inactive, or background. Use AppState (or expo's lifecycle helpers) to pause a video, stop polling, or upload analytics when the user backgrounds the app. The demo below is LIVE — background the app (or on web, switch browser tabs) and return."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            current app state:
          </Text>
          <Pill tone="primary">{current}</Pill>
        </Box>
        <LogPanel entries={entries} onClear={clear} />
        <Text variant="caption" tone="muted">
          On {Platform.OS === 'web' ? 'web' : 'native'} this maps to{' '}
          {Platform.OS === 'web'
            ? 'document visibility changes (switch this browser tab away and back).'
            : 'the native active/inactive/background transitions.'}{' '}
          Always pair the subscription with a cleanup — a leaked listener keeps
          firing even after the component is gone.
        </Text>
      </Box>
    </Section>
  );
}
