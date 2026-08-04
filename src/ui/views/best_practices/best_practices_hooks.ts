import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Best-practices view logic — owns the three LIVE labs' state + behaviour so
 * the view stays a dumb structure.
 *
 * Hooks:
 *  - useVirtualizationLab: mode/count + the live row-MOUNT counter (a
 *    module-level number incremented by every mounted Row via useMountCounter)
 *    + a render-time readout measured across two RAFs.
 *  - useMountCounter: a row hook that bumps the shared mount counter on mount.
 *  - useMemoizationLab: parent state + a stable `useCallback` handler vs an
 *    unstable inline handler, so React.memo's effect is observable.
 *  - useRenderCounter: the child's live render counter (useRef that persists).
 *  - useAccessibilityLab: the a11y prop toggles + the derived screen-reader
 *    announcement.
 *
 * Pure helpers: performanceNow, round1.
 */

export const ITEM_COUNTS = [100, 1000, 3000] as const;
export type ItemCount = (typeof ITEM_COUNTS)[number];
export const RENDER_MODES = ['naive', 'flatlist'] as const;
export type RenderMode = (typeof RENDER_MODES)[number];

/* -------------------------------------------------------------------------- */
/* 3. Virtualization lab                                                      */
/* -------------------------------------------------------------------------- */

/** Module-level mount counter so every mounted Row increments the same number. */
let virtualLabMounts = 0;

/** A row hook that bumps the shared mount counter exactly once on mount. */
export function useMountCounter(): void {
  useEffect(() => {
    virtualLabMounts += 1;
  }, []);
}

export interface VirtualizationLab {
  mode: RenderMode;
  count: ItemCount;
  setCount: (n: ItemCount) => void;
  run: (nextMode: RenderMode, nextCount: ItemCount) => void;
  mounts: number | null;
  elapsedMs: number | null;
  data: number[];
}

export function useVirtualizationLab(): VirtualizationLab {
  const [mode, setMode] = useState<RenderMode>('flatlist');
  const [count, setCount] = useState<ItemCount>(1000);
  const [runToken, setRunToken] = useState(0); // bump to force a fresh render
  const [mounts, setMounts] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const data = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count, runToken],
  );

  const run = useCallback((nextMode: RenderMode, nextCount: ItemCount) => {
    virtualLabMounts = 0;
    setMounts(null);
    setElapsedMs(null);
    setMode(nextMode);
    setCount(nextCount);
    setRunToken((t) => t + 1);
    const start = performanceNow();
    // Measure after the render flushes. Two RAFs bracket the commit + layout.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMounts(virtualLabMounts);
        setElapsedMs(round1(performanceNow() - start));
      });
    });
  }, []);

  return { mode, count, setCount, run, mounts, elapsedMs, data };
}

/* -------------------------------------------------------------------------- */
/* 4. Memoization lab                                                         */
/* -------------------------------------------------------------------------- */

export interface MemoizationLab {
  parentTick: number;
  bumpParent: () => void;
  memoized: boolean;
  toggleMemoized: () => void;
  pokeCount: number;
  stablePoke: () => void;
  unstablePoke: () => void;
}

export function useMemoizationLab(): MemoizationLab {
  const [parentTick, setParentTick] = useState(0);
  const [memoized, setMemoized] = useState(true);
  const [pokeCount, setPokeCount] = useState(0);

  // useCallback: stable identity across parent renders when memoized is on.
  const stablePoke = useCallback(() => {
    setPokeCount((c) => c + 1);
  }, []);

  // Unstable: a brand-new function every render.
  const unstablePoke = () => {
    setPokeCount((c) => c + 1);
  };

  return {
    parentTick,
    bumpParent: () => setParentTick((t) => t + 1),
    memoized,
    toggleMemoized: () => setMemoized((m) => !m),
    pokeCount,
    stablePoke,
    unstablePoke,
  };
}

/** The child's live render counter — a ref that persists across renders. */
export function useRenderCounter(): number {
  const renders = useRef(0);
  renders.current += 1;
  return renders.current;
}

/* -------------------------------------------------------------------------- */
/* 6. Accessibility lab                                                       */
/* -------------------------------------------------------------------------- */

export interface AccessibilityLab {
  role: boolean;
  toggleRole: () => void;
  label: boolean;
  toggleLabel: () => void;
  hint: boolean;
  toggleHint: () => void;
  hitSlop: boolean;
  toggleHitSlop: () => void;
  presses: number;
  press: () => void;
  announced: string;
  selected: boolean;
}

export function useAccessibilityLab(): AccessibilityLab {
  const [role, setRole] = useState(true);
  const [label, setLabel] = useState(true);
  const [hint, setHint] = useState(false);
  const [hitSlop, setHitSlop] = useState(false);
  const [presses, setPresses] = useState(0);

  const selected = presses > 0 && presses % 2 !== 0;
  const announced = [
    label ? 'Bookmark' : '★',
    role ? ', button' : '',
    hint ? '. Saves this post to your list' : '',
    presses > 0 ? (presses % 2 === 0 ? ', selected' : '') : '',
  ].join('');

  return {
    role,
    toggleRole: () => setRole((v) => !v),
    label,
    toggleLabel: () => setLabel((v) => !v),
    hint,
    toggleHint: () => setHint((v) => !v),
    hitSlop,
    toggleHitSlop: () => setHitSlop((v) => !v),
    presses,
    press: () => setPresses((p) => p + 1),
    announced,
    selected,
  };
}

/* -------------------------------------------------------------------------- */
/* tiny perf timer (RN + web compatible)                                      */
/* -------------------------------------------------------------------------- */

export function performanceNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
