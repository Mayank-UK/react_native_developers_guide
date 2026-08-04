import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Lifecycle view logic — owns every interactive demo's state + behaviour so the
 * view stays a dumb structure. The screen's SUBJECT is React-19-safe hook
 * usage, so these hooks deliberately embody the safety patterns documented in
 * the Bug History of agentic_development.md:
 *
 *  (a) `useEventLog` reads the id OUTSIDE the setState updater — the updater
 *      stays pure (StrictMode double-invokes updaters in dev; mutating a ref
 *      inside an updater is a forbidden side-effect).
 *  (b) `useTimerDemo` mirrors `ticks` into a ref so the interval callback can
 *      call the parent's `log` (a setState of another component) from the
 *      async interval context — NOT from inside the `setTicks` updater.
 *  (c) `useMemoCallbackDemo` keeps the `setLastComputedAt(Date.now())` side
 *      effect in a `useEffect` keyed on the memo result — NOT inside `useMemo`
 *      (setState during render is a React-19 anti-pattern).
 *  (d) `useLayoutEffectDemo` uses a `[big]` dependency array (mount + each size
 *      toggle) and reads geometry via `onLayout` — NOT a dep-less
 *      `useLayoutEffect` + imperative `ref.measure` (which thrashes layout on
 *      Fabric).
 *
 * Do NOT "simplify" any guarded effect back into an unsafe form. The migration
 * is behaviour-identical, including these guards.
 */

export type LogTone = 'default' | 'muted' | 'primary' | 'danger';
export interface LogEntry {
  id: number;
  text: string;
  tone: LogTone;
}

type DepMode = 'mount' | 'dep' | 'every';
export const DEP_MODES: ReadonlyArray<DepMode> = ['mount', 'dep', 'every'];

/* -------------------------------------------------------------------------- */
/* Shared event log                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A small hook that timestamps lifecycle events into a capped list so the user
 * can SEE mount/update/cleanup sequencing live. The id is read OUTSIDE the
 * setState updater so the updater stays pure (StrictMode double-invokes
 * updaters in dev — mutating a ref inside would be a forbidden side-effect).
 */
export function useEventLog(max = 7) {
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

/* -------------------------------------------------------------------------- */
/* 3. Dependency-array playground                                             */
/* -------------------------------------------------------------------------- */

export interface DependencyPlayground {
  mode: DepMode;
  selectMode: (m: DepMode) => void;
  dep: number;
  bumpDep: () => void;
  renderId: number;
  forceRender: () => void;
  entries: readonly LogEntry[];
  log: (text: string, tone?: LogTone) => void;
  clear: () => void;
}

export function useDependencyPlayground(): DependencyPlayground {
  const [mode, setMode] = useState<DepMode>('mount');
  const [dep, setDep] = useState(0);
  const [entries, log, clear] = useEventLog();
  // A render id, bumped by "force render" so the no-array variant can show
  // it fires on EVERY render.
  const [renderId, setRenderId] = useState(1);

  const selectMode = useCallback(
    (m: DepMode) => {
      log(`switch → ${m}`, 'muted');
      setMode(m);
    },
    [log],
  );
  const bumpDep = useCallback(() => setDep((d) => d + 1), []);
  const forceRender = useCallback(() => setRenderId((r) => r + 1), []);

  return { mode, selectMode, dep, bumpDep, renderId, forceRender, entries, log, clear };
}

/** Mount-only variant: empty dependency array. */
export function useMountOnlyDemo(log: (text: string, tone?: LogTone) => void) {
  useEffect(() => {
    log('[] effect ran — mount only', 'primary');
    return () => log('[] cleanup — unmount', 'danger');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Dep variant: depends on `dep`. */
export function useDepDemo(
  dep: number,
  log: (text: string, tone?: LogTone) => void,
) {
  useEffect(() => {
    log(`[dep] effect ran — dep=${dep}`, 'primary');
    return () => log(`[dep] cleanup — before re-run / unmount`, 'danger');
  }, [dep, log]);
}

/** Every-render variant: no dependency array. */
export function useEveryDemo(
  renderId: number,
  log: (text: string, tone?: LogTone) => void,
) {
  useEffect(() => {
    log(`effect ran — render #${renderId} (NO array)`, 'primary');
    return () => log(`cleanup — render #${renderId}`, 'danger');
  });
}

/* -------------------------------------------------------------------------- */
/* 4. Cleanup — timer child                                                   */
/* -------------------------------------------------------------------------- */

export interface TimerDemo {
  ticks: number;
}

/**
 * A child that starts an interval on mount and clears it on unmount.
 *
 * React-19-safe (BUG-FIX PRESERVED): the `ticksRef` mirrors `ticks` so the
 * interval callback can read the latest value WITHOUT calling `log` (which
 * setState's the parent) from inside the `setTicks` updater — that is a
 * React-19 anti-pattern (setState of another component during an updater). The
 * interval is a normal async context, so calling `log` here is fine.
 */
export function useTimerDemo(log: (text: string, tone?: LogTone) => void): TimerDemo {
  const [ticks, setTicks] = useState(0);
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
  return { ticks };
}

export interface CleanupDemo {
  mounted: boolean;
  toggleMounted: () => void;
  entries: readonly LogEntry[];
  log: (text: string, tone?: LogTone) => void;
  clear: () => void;
}

export function useCleanupDemo(): CleanupDemo {
  const [mounted, setMounted] = useState(true);
  const [entries, log, clear] = useEventLog(8);
  const toggleMounted = useCallback(() => setMounted((m) => !m), []);
  return { mounted, toggleMounted, entries, log, clear };
}

/* -------------------------------------------------------------------------- */
/* 5. useLayoutEffect vs useEffect                                            */
/* -------------------------------------------------------------------------- */

export interface LayoutEffectDemo {
  big: boolean;
  toggleBig: () => void;
  entries: readonly LogEntry[];
  clear: () => void;
  measuredWidth: number | null;
  setMeasuredWidth: (w: number) => void;
}

/**
 * useLayoutEffect runs SYNCHRONOUSLY after native-tree mutations but BEFORE
 * the screen is painted — so reading/setting layout here avoids a visible
 * flicker.
 *
 * React-19-safe (BUG-FIX PRESERVED): deps = `[big]` so it fires on mount + each
 * size toggle (NOT every render, which would thrash layout passes on the New
 * Architecture). Geometry is read via `onLayout`, NOT a dep-less
 * `useLayoutEffect` + imperative `ref.measure`.
 */
export function useLayoutEffectDemo(): LayoutEffectDemo {
  const [big, setBig] = useState(false);
  const [entries, log, clear] = useEventLog(6);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    log('useLayoutEffect — before paint', 'primary');
  }, [big]);

  // useEffect runs AFTER paint — the user has already seen one frame.
  useEffect(() => {
    log('useEffect — after paint');
  }, [big]);

  const toggleBig = useCallback(() => setBig((b) => !b), []);
  const commitWidth = useCallback(
    (w: number) => {
      if (w > 0) setMeasuredWidth(Math.round(w));
    },
    [],
  );
  return { big, toggleBig, entries, clear, measuredWidth, setMeasuredWidth: commitWidth };
}

/* -------------------------------------------------------------------------- */
/* 7. useMemo / useCallback                                                   */
/* -------------------------------------------------------------------------- */

/** Deliberately heavy pure calc so memoization is observable. */
export function expensiveSum(n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      total += (i * j) % 7;
    }
  }
  return total;
}

export interface MemoCallbackDemo {
  size: number;
  grow: () => void;
  shrink: () => void;
  unrelated: number;
  bumpUnrelated: () => void;
  sum: number;
  lastComputedAt: number;
}

/**
 * React-19-safe (BUG-FIX PRESERVED): the "last computed" timestamp is a side
 * effect of recomputation, so it belongs in an effect keyed on the memoized
 * value — NOT inside `useMemo` (calling setState during render is a React-19
 * anti-pattern).
 */
export function useMemoCallbackDemo(): MemoCallbackDemo {
  const [size, setSize] = useState(150);
  const [unrelated, setUnrelated] = useState(0);
  const [lastComputedAt, setLastComputedAt] = useState(0);

  const sum = useMemo(() => expensiveSum(size), [size]);
  useEffect(() => {
    setLastComputedAt(Date.now());
  }, [sum]);

  // A stable callback identity — handy when passing handlers to memoized children.
  const grow = useCallback(() => setSize((s) => s + 50), []);
  const shrink = useCallback(() => setSize((s) => Math.max(50, s - 50)), []);
  const bumpUnrelated = useCallback(() => setUnrelated((u) => u + 1), []);

  return { size, grow, shrink, unrelated, bumpUnrelated, sum, lastComputedAt };
}

/* -------------------------------------------------------------------------- */
/* 8. useRef — survives renders, never triggers them                          */
/* -------------------------------------------------------------------------- */

export interface RefAcrossRenders {
  renderCount: number;
  bumpRenderCount: () => void;
  renderRef: { current: number };
  silentBumpAndForceRender: () => void;
}

export function useRefAcrossRenders(): RefAcrossRenders {
  const [renderCount, setRenderCount] = useState(0);
  const renderRef = useRef(0);
  const [, setTick] = useState(0);

  renderRef.current += 1;

  const bumpRenderCount = useCallback(() => setRenderCount((c) => c + 1), []);
  const silentBumpAndForceRender = useCallback(() => {
    renderRef.current += 1;
    // Prove the ref changed without using state — force a render to read it:
    setTick((n) => n + 1);
  }, []);

  return { renderCount, bumpRenderCount, renderRef, silentBumpAndForceRender };
}

/* -------------------------------------------------------------------------- */
/* 10. useFocusEffect — navigation lifecycle                                  */
/* -------------------------------------------------------------------------- */

export interface FocusDemo {
  entries: readonly LogEntry[];
  clear: () => void;
}

/**
 * useFocusEffect re-runs whenever this screen gains focus (navigation
 * lifecycle, NOT React mount). Cleanup runs on blur. Distinct from useEffect.
 */
export function useFocusDemo(): FocusDemo {
  const [entries, log, clear] = useEventLog(5);
  useFocusEffect(
    useCallback(() => {
      log('useFocusEffect — screen gained focus', 'primary');
      return () => log('useFocusEffect cleanup — screen blurred', 'danger');
    }, [log]),
  );
  return { entries, clear };
}

/* -------------------------------------------------------------------------- */
/* 11. AppState — active / background / inactive                              */
/* -------------------------------------------------------------------------- */

export interface AppStateDemo {
  current: string;
  entries: readonly LogEntry[];
  clear: () => void;
}

export function useAppStateDemo(): AppStateDemo {
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

  return { current, entries, clear };
}

/* -------------------------------------------------------------------------- */
/* pure helpers consumed by the view                                          */
/* -------------------------------------------------------------------------- */

export const PHASE_ROWS: ReadonlyArray<{ phase: string; deps: string; meaning: string }> = [
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

export const CLASS_HOOK_ROWS: ReadonlyArray<{ cls: string; hook: string; note: string }> = [
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

export function platformLabel(): string {
  return Platform.OS === 'web' ? 'web' : 'native';
}

export function platformVisibilityNote(): string {
  return Platform.OS === 'web'
    ? 'document visibility changes (switch this browser tab away and back).'
    : 'the native active/inactive/background transitions.';
}
