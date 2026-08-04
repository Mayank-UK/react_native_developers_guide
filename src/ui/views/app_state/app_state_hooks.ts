import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/**
 * App State & Backgrounding view logic — owns every interactive demo's state +
 * behaviour so the view stays a dumb structure. The screen's SUBJECT is the
 * OS-level app lifecycle (the counterpart to the React component lifecycle
 * taught on the Lifecycle screen), so the hooks here deliberately embody the
 * same React-19-safe patterns documented in the Bug History of
 * agentic_development.md and mirrored in `lifecycle_hooks.ts`:
 *
 *  (a) `useAppStateLog` reads the id OUTSIDE the setState updater — the
 *      updater stays pure (StrictMode double-invokes updaters in dev;
 *      mutating a ref inside an updater is a forbidden side-effect). The
 *      `setCurrent` call is in the `AppState.addEventListener` callback, NOT
 *      inside the `setLog` updater — the same rule that keeps `useEventLog`
 *      safe.
 *  (b) `useActivePulse` mirrors the `useTimerDemo` interval-with-cleanup
 *      pattern; the interval is cleared in the effect's return so unmount is
 *      clean.
 *
 * Do NOT "simplify" any guarded effect back into an unsafe form.
 */

/* -------------------------------------------------------------------------- */
/* AppState values + labels (no enum — const-object + literal union)          */
/* -------------------------------------------------------------------------- */

/** The three `AppState` values RN's native bridge reports. */
export const APP_STATE_VALUES = {
  active: 'active',
  inactive: 'inactive',
  background: 'background',
} as const;

export type AppStateValue = (typeof APP_STATE_VALUES)[keyof typeof APP_STATE_VALUES];

export interface AppStateLogEntry {
  /** Monotonic id (idRef-assigned OUTSIDE the setState updater). */
  id: number;
  /** ISO timestamp — when the transition fired. */
  at: string;
  /** The new AppState value. */
  state: AppStateValue;
}

/**
 * Map a raw AppState value to a friendly word. Pure: same input → same output.
 * `'inactive'` only exists on iOS (control-center/notification pull-down) and
 * is a transient state; we surface that distinction in the label.
 */
export function appStateLabel(state: AppStateValue): string {
  switch (state) {
    case 'active':
      return 'Foreground (running, visible)';
    case 'inactive':
      return 'Transitioning (iOS-only transient)';
    case 'background':
      return 'Backgrounded (suspended or hidden)';
    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* useAppStateLog — LIVE AppState transition log                              */
/* -------------------------------------------------------------------------- */

export interface AppStateLog {
  /** The most recent AppState value observed, or null before the first event. */
  current: AppStateValue | null;
  /** Capped, most-recent-first list of transitions. */
  log: readonly AppStateLogEntry[];
}

/**
 * Subscribe to `AppState` and keep a capped transition log.
 *
 * React-19-safe: setState happens in the event callback (an async, external
 * context — the AppState listener), NOT inside a setState updater. The id is
 * read from a ref OUTSIDE the updater so the updater itself stays pure.
 */
export function useAppStateLog(max = 8): AppStateLog {
  const [current, setCurrent] = useState<AppStateValue | null>(
    () => (AppState.currentState as AppStateValue) ?? null,
  );
  const [log, setLog] = useState<AppStateLogEntry[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    // AppState.addEventListener returns a subscription object whose `.remove()`
    // tears down the listener — we do that in the effect's cleanup return.
    const sub = AppState.addEventListener('change', (next) => {
      const value = next as AppStateValue;
      const id = idRef.current;
      idRef.current += 1;
      const entry: AppStateLogEntry = { id, at: new Date().toISOString(), state: value };
      setCurrent(value);
      setLog((prev) => [entry, ...prev].slice(0, max));
    });
    return () => sub.remove();
  }, [max]);

  return { current, log };
}

/* -------------------------------------------------------------------------- */
/* backgroundExecutionMatrix — presentational per-platform data               */
/* -------------------------------------------------------------------------- */

export type BackgroundPlatform = 'ios' | 'android';

export interface BackgroundExecutionRow {
  /** Short label, e.g. "Suspend budget". */
  aspect: string;
  /** iOS behaviour (presentational summary, not a runtime guarantee). */
  ios: string;
  /** Android behaviour. */
  android: string;
}

/**
 * Per-platform background-execution limits. Pure presentational data keyed by
 * platform — mirrors the matrix in the RN docs + Apple/Android developer
 * guides. The point: background execution is NOT a Node.js-style daemon — the
 * OS aggressively suspends/kills your JS to save battery, and the escape
 * hatches are platform-specific and time-limited.
 */
export function backgroundExecutionMatrix(): readonly BackgroundExecutionRow[] {
  return [
    {
      aspect: 'Default on background',
      ios: 'App is suspended within ~5s; the JS thread freezes (timers/network callbacks stop firing).',
      android: 'App is hidden; the OS may stop the process under memory pressure or Doze.',
    },
    {
      aspect: 'Suspend budget',
      ios: '~30s of background time granted for a begun task, then the OS kills it.',
      android: 'No fixed JS budget; Doze defers all work to maintenance windows.',
    },
    {
      aspect: 'Primary escape hatch',
      ios: 'BGTaskScheduler (BGAppRefreshTask / BGProcessingTask) via UIBackgroundModes.',
      android: 'WorkManager (deferrable, guaranteed) or a Foreground Service (long-running, user-visible).',
    },
    {
      aspect: 'Time-sensitive delivery',
      ios: 'Time-Sensitive / Critical alerts (push) can break through Focus.',
      android: 'High-priority FCM data messages wake the app briefly (~10s).',
    },
    {
      aspect: 'Doze / App Standby',
      ios: 'No equivalent; background refresh is per-app and user-controllable.',
      android: 'Doze batches deferred work into maintenance windows; App Standby idle-charges idle apps.',
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* useActivePulse — proves the JS thread freezes when backgrounded            */
/* -------------------------------------------------------------------------- */

export interface ActivePulse {
  /** Counter incremented while the app is 'active'. */
  ticks: number;
  /** Whether the pulse is currently advancing. */
  active: boolean;
}

/**
 * A small live hook proving the JS thread pauses when backgrounded: an
 * interval increments a counter while 'active'. On native, when the app is
 * backgrounded the OS suspends the JS thread, so React's renderer + timers
 * FREEZE — this counter visibly stops advancing until you foreground again.
 *
 * The interval is created in an effect and cleared in its cleanup return,
 * mirroring `useTimerDemo` — `unmount()` of the host view clears it (documented
 * jest gotcha: views mounting intervals must unmount in their smoke tests).
 */
export function useActivePulse(intervalMs = 1000): ActivePulse {
  const [ticks, setTicks] = useState(0);
  const [active, setActive] = useState<AppStateValue | null>(
    () => (AppState.currentState as AppStateValue) ?? null,
  );

  useEffect(() => {
    // Subscribe so we know whether we SHOULD be ticking. We still keep the
    // interval running across background/foreground — that is the PROOF: the
    // JS thread freezing is what stops the ticks, not our own gating.
    const sub = AppState.addEventListener('change', (next) => {
      setActive(next as AppStateValue);
    });
    const id = setInterval(() => {
      setTicks((t) => t + 1);
    }, intervalMs);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [intervalMs]);

  const isActive = active === 'active' || active === 'inactive';
  return { ticks, active: isActive };
}
