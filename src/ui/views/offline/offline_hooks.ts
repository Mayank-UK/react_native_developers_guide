import { useEffect, useRef, useState } from 'react';
import NetInfo, {
  type NetInfoState,
  type NetInfoSubscription,
} from '@react-native-community/netinfo';

/**
 * Offline Support view logic — owns every interactive demo's state + behaviour
 * so the view stays a dumb structure. The screen's SUBJECT is the RN-standard
 * offline pattern set (network detection, cache strategies, optimistic UI,
 * background sync), so the hooks here deliberately embody the same React-19-safe
 * patterns documented in the Bug History of agentic_development.md and mirrored
 * in `app_state_hooks.ts` / `lifecycle_hooks.ts`:
 *
 *  (a) `useNetInfoDemo` reads the listener's state OUTSIDE any setState updater
 *      — the `setNet` call is in the NetInfo callback, NOT inside another
 *      updater. The updater passed to `setNet` is `() => latest` (pure). This
 *      mirrors `useAppStateLog` (idRef read outside the updater; setState in
 *      the event callback, not nested in another updater).
 *  (b) `useOptimisticListDemo` uses a pure updater (returns the next list from
 *      prev + args captured outside) — no setState inside an updater.
 *
 * Do NOT "simplify" any guarded effect back into an unsafe form.
 */

/* -------------------------------------------------------------------------- */
/* Cache strategies + sync state (no enum — const-object + literal union)     */
/* -------------------------------------------------------------------------- */

/** The five canonical cache strategies for an offline-aware read. */
export const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  CACHE_ONLY: 'cache-only',
  NETWORK_ONLY: 'network-only',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
} as const;

export type CacheStrategy =
  (typeof CACHE_STRATEGIES)[keyof typeof CACHE_STRATEGIES];

/** The lifecycle of a queued / in-flight mutation. */
export const SYNC_STATE = {
  IDLE: 'idle',
  PENDING: 'pending',
  SYNCED: 'synced',
  ERROR: 'error',
} as const;

export type SyncState = (typeof SYNC_STATE)[keyof typeof SYNC_STATE];

export interface CacheStrategyRow {
  strategy: CacheStrategy;
  /** One-line summary of when to pick this strategy. */
  when: string;
  /** What it optimises for. */
  optimises: 'latency' | 'freshness' | 'offline' | 'bandwidth';
}

/**
 * Pure comparison matrix for the cache-strategy section. Same input → same
 * output; the view renders it verbatim.
 */
export function cacheStrategyMatrix(): readonly CacheStrategyRow[] {
  return [
    {
      strategy: CACHE_STRATEGIES.CACHE_FIRST,
      when: 'Read-only content where stale data is fine (catalogue, feed).',
      optimises: 'latency',
    },
    {
      strategy: CACHE_STRATEGIES.NETWORK_FIRST,
      when: 'Fresh data preferred, cache is the fallback (inbox, dashboard).',
      optimises: 'freshness',
    },
    {
      strategy: CACHE_STRATEGIES.CACHE_ONLY,
      when: 'Pre-hydrated reference data that never changes at runtime.',
      optimises: 'bandwidth',
    },
    {
      strategy: CACHE_STRATEGIES.NETWORK_ONLY,
      when: 'Strictly fresh mutations / writes; never serve stale.',
      optimises: 'freshness',
    },
    {
      strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
      when: 'Show cached instantly, refresh in the background (avatars, lists).',
      optimises: 'latency',
    },
  ];
}

/** Friendly label for a cache strategy value. Pure. */
export function cacheStrategyLabel(strategy: CacheStrategy): string {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return 'Cache-first (fastest, may be stale)';
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return 'Network-first (freshest, falls back to cache)';
    case CACHE_STRATEGIES.CACHE_ONLY:
      return 'Cache-only (offline, never hits network)';
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return 'Network-only (no cache, fails offline)';
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return 'Stale-while-revalidate (instant + background refresh)';
    default:
      return strategy;
  }
}

/** Friendly label for a sync state value. Pure. */
export function syncStateLabel(state: SyncState): string {
  switch (state) {
    case SYNC_STATE.IDLE:
      return 'Idle — nothing queued';
    case SYNC_STATE.PENDING:
      return 'Pending — queued / in-flight';
    case SYNC_STATE.SYNCED:
      return 'Synced — confirmed by the server';
    case SYNC_STATE.ERROR:
      return 'Error — rolled back / needs retry';
    default:
      return state;
  }
}

/**
 * Reduce a raw NetInfoState to a simple online boolean. The NetInfoState union
 * has `isConnected: boolean | null` so we coerce null → false (treat unknown
 * as offline, the conservative choice for an offline-aware app). Pure.
 */
export function isOnline(state: NetInfoState | null | undefined): boolean {
  if (!state) return false;
  return state.isConnected === true && state.isInternetReachable !== false;
}

/* -------------------------------------------------------------------------- */
/* useNetInfoDemo — LIVE network readout                                      */
/* -------------------------------------------------------------------------- */

export interface NetInfoSnapshot {
  /** Reduced online flag (see `isOnline`). */
  online: boolean;
  /** Raw `isConnected` reported by the bridge (null until first event). */
  isConnected: boolean | null;
  /** Raw `isInternetReachable` reported by the bridge (null until probed). */
  isInternetReachable: boolean | null;
  /** Connection type, e.g. 'wifi' | 'cellular' | 'unknown' | 'none'. */
  type: string;
  /** Whether the snapshot has been populated by at least one event/fetch. */
  ready: boolean;
}

function toSnapshot(state: NetInfoState | null): NetInfoSnapshot {
  if (!state) {
    return {
      online: false,
      isConnected: null,
      isInternetReachable: null,
      type: 'unknown',
      ready: false,
    };
  }
  return {
    online: isOnline(state),
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
    ready: true,
  };
}

/**
 * Subscribe to NetInfo and keep a live readout of the connection state.
 *
 * React-19-safe: `setNet(toSnapshot(next))` is called in the listener callback
 * (an external, async context — NOT inside another setState updater). The
 * updater passed to setNet is `() => toSnapshot(next)` which is pure: the only
 * side-effect (`toSnapshot` of an immutable snapshot) happens before the
 * updater is constructed, so StrictMode's double-invocation of the updater is
 * harmless. The subscription is torn down in the effect's cleanup return.
 *
 * We also seed state via `NetInfo.fetch()` on mount so the readout is populated
 * even before the first change event fires (NetInfo only emits on transitions).
 */
export function useNetInfoDemo(): NetInfoSnapshot {
  const [net, setNet] = useState<NetInfoSnapshot>(() => toSnapshot(null));
  // Latest-state ref so a future extension can read it inside an effect without
  // re-subscribing; mirrors the idRef-outside-updater guard in useAppStateLog.
  const latestRef = useRef<NetInfoState | null>(null);

  useEffect(() => {
    let unsub: NetInfoSubscription | null = null;
    // Seed the readout with a one-shot fetch so it is populated immediately.
    NetInfo.fetch()
      .then((state) => {
        latestRef.current = state;
        setNet(toSnapshot(state));
      })
      .catch(() => {
        // fetch rejecting is itself an offline signal; leave the default snapshot.
      });
    // Subscribe to live transitions. addEventListener returns an unsubscribe
    // function (NetInfo's `NetInfoSubscription = () => void`).
    unsub = NetInfo.addEventListener((next) => {
      latestRef.current = next;
      setNet(toSnapshot(next));
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  return net;
}

/* -------------------------------------------------------------------------- */
/* useOptimisticListDemo — pending-state + rollback pattern                   */
/* -------------------------------------------------------------------------- */

export interface OptimisticItem {
  /** Stable client id (so rollback / confirm can target the right row). */
  id: number;
  /** The task text. */
  label: string;
  /** Lifecycle of this row — drives the pending Pill. */
  syncState: SyncState;
}

export interface OptimisticListDemo {
  items: readonly OptimisticItem[];
  /** When true, the next commit will fail (rollback demo). */
  forceFail: boolean;
  /** Toggle the force-fail knob. */
  toggleForceFail: () => void;
  /** Append a new task optimistically; a simulated async commit then confirms/rolls back. */
  addTask: (label: string) => void;
  /** Reset to the empty list (also clears any in-flight timer). */
  reset: () => void;
  /** Current draft text for the add-task input (owned here so the view stays dumb). */
  draft: string;
  /** Update the draft text from the TextInput. */
  setDraft: (text: string) => void;
  /** Convenience: append the current draft, then clear it. */
  submitDraft: () => void;
}

const COMMIT_DELAY_MS = 1200;

/**
 * A SELF-CONTAINED optimistic-UI demo (NOT wired to the real repo). "add"
 * appends a row in the `pending` sync state immediately; a simulated async
 * commit then either confirms the row (`synced`) or rolls it back (`error` +
 * removed after a beat), driven by the `forceFail` knob.
 *
 * React-19-safe: every setItems updater is pure (returns the next list from
 * `prev` + values captured OUTSIDE the updater — id, label, etc. are read
 * before the setState call, never inside). The setTimeout callback calls
 * setItems directly (it is an external async context, not another updater).
 *
 * The pending-state marker on each item IS the optimistic-UI primitive: render
 * it as a Pill so the user can see "this row is not yet confirmed by the
 * server."
 */
export function useOptimisticListDemo(): OptimisticListDemo {
  const [items, setItems] = useState<OptimisticItem[]>([]);
  const [forceFail, setForceFail] = useState(false);
  const [draft, setDraftState] = useState('');
  // forceFail ref so the deferred commit reads the knob value at commit time,
  // not at schedule time (toggling between add + commit is observable).
  const forceFailRef = useRef(false);
  // Monotonic id source — read OUTSIDE any setItems updater (StrictMode-safe).
  const idRef = useRef(0);
  // Track pending timers so reset/unmount can clear them.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function toggleForceFail() {
    const next = !forceFail;
    forceFailRef.current = next;
    setForceFail(next);
  }

  function addTask(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = idRef.current;
    idRef.current += 1;
    const willFail = forceFailRef.current;
    // Pure updater: the next list is built from prev + the new row; the id and
    // syncState are captured OUTSIDE the updater.
    setItems((prev) => [
      ...prev,
      { id, label: trimmed, syncState: SYNC_STATE.PENDING },
    ]);
    const timer = setTimeout(() => {
      if (willFail) {
        // Rollback: mark error, then drop the row after a brief beat so the
        // user can see the red "error" Pill flash before it disappears.
        setItems((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, syncState: SYNC_STATE.ERROR } : it,
          ),
        );
        const cleanup = setTimeout(() => {
          setItems((prev) => prev.filter((it) => it.id !== id));
          timersRef.current = timersRef.current.filter((t) => t !== cleanup);
        }, 700);
        timersRef.current.push(cleanup);
      } else {
        // Confirm: promote to synced.
        setItems((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, syncState: SYNC_STATE.SYNCED } : it,
          ),
        );
      }
      timersRef.current = timersRef.current.filter((t) => t !== timer);
    }, COMMIT_DELAY_MS);
    timersRef.current.push(timer);
  }

  function reset() {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    setItems([]);
    setDraftState('');
  }

  function setDraft(text: string) {
    setDraftState(text);
  }

  function submitDraft() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addTask(trimmed);
    setDraftState('');
  }

  // Clear any pending timers on unmount so the jest worker is not held alive.
  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
    };
  }, []);

  return {
    items,
    forceFail,
    toggleForceFail,
    addTask,
    reset,
    draft,
    setDraft,
    submitDraft,
  };
}
