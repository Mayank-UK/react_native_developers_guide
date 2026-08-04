import { useRef } from 'react';
import { create } from 'zustand';

/**
 * Zustand view logic — a single create() call returns a hook; components
 * subscribe with a SELECTOR and re-render ONLY when the selected slice
 * changes — no provider needed. No `any`; strict + erasableSyntaxOnly-clean.
 */

export interface CounterStore {
  count: number;
  note: string;
  increment: () => void;
  setNote: (n: string) => void;
}

/**
 * Zustand: a single create() call returns a hook. Components subscribe with a
 * SELECTOR and re-render ONLY when the selected slice changes — no provider
 * needed.
 */
export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  note: 'hello',
  increment: () => set((s) => ({ count: s.count + 1 })),
  setNote: (n) => set({ note: n }),
}));

/** A ref bumped on every render — used by the zustand display components. */
export function useRenderCounter(): number {
  const renders = useRef(0);
  renders.current += 1;
  return renders.current;
}

export interface ZustandCountDisplay {
  count: number;
  renders: number;
}

/** Subscribes to count (whole-slice change re-renders it). */
export function useZustandCountDisplay(): ZustandCountDisplay {
  const count = useCounterStore((s) => s.count);
  const renders = useRenderCounter();
  return { count, renders };
}

export interface ZustandParityBadge {
  parity: 'even' | 'odd';
  renders: number;
}

/**
 * Subscribes via a selector to count % 2 — re-renders ONLY when parity flips.
 * Bumping count 1→2 re-renders it; 2→3 re-renders it; but a note change never
 * does.
 */
export function useZustandParityBadge(): ZustandParityBadge {
  const parity = useCounterStore((s) => (s.count % 2 === 0 ? 'even' : 'odd'));
  const renders = useRenderCounter();
  return { parity, renders };
}

export interface ZustandControls {
  increment: () => void;
  setNote: (n: string) => void;
  note: string;
}

export function useZustandControls(): ZustandControls {
  const increment = useCounterStore((s) => s.increment);
  const setNote = useCounterStore((s) => s.setNote);
  const note = useCounterStore((s) => s.note);
  return { increment, setNote, note };
}
