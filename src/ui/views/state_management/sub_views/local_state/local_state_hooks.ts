import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

/**
 * Local-state view logic — the BUILT-IN React primitives: useState, useReducer,
 * and Context for shared client state. These are the daily-driver tools; the
 * external libraries (Zustand/Redux/Query) live in sibling sub-views. No `any`;
 * strict + erasableSyntaxOnly-clean (const-object + literal unions).
 */

/* -------------------------------------------------------------------------- */
/* LOCAL state — useReducer + useState                                        */
/* -------------------------------------------------------------------------- */

/**
 * useReducer with a typed action union. This is the SAME const-object + literal
 * pattern this project uses for `FailureSeverity` / `ApiScenario` (see
 * `core/error-handling/failures.ts`): runtime values AND a literal type, with
 * no `enum` (so it stays erasable-syntax clean).
 */
export const CounterActionType = {
  Increment: 'increment',
  Decrement: 'decrement',
  Reset: 'reset',
  AddBy: 'addBy',
} as const;
export type CounterActionType = (typeof CounterActionType)[keyof typeof CounterActionType];

export type CounterAction =
  | { type: typeof CounterActionType.Increment }
  | { type: typeof CounterActionType.Decrement }
  | { type: typeof CounterActionType.Reset }
  | { type: typeof CounterActionType.AddBy; by: number };

export function counterReducer(state: number, action: CounterAction): number {
  switch (action.type) {
    case CounterActionType.Increment:
      return state + 1;
    case CounterActionType.Decrement:
      return state - 1;
    case CounterActionType.Reset:
      return 0;
    case CounterActionType.AddBy:
      return state + action.by;
  }
}

export interface CounterDemo {
  count: number;
  dispatch: Dispatch<CounterAction>;
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
}

/** Local-state demo: a useState `step` + a useReducer counter machine. */
export function useCounterDemo(): CounterDemo {
  // A trivial useState for contrast.
  const [step, setStep] = useState(1);
  // A useReducer for transitions with multiple action types.
  const [count, dispatch] = useReducer(counterReducer, 0);
  return { count, dispatch, step, setStep };
}

/* -------------------------------------------------------------------------- */
/* SHARED client state — Context                                              */
/* -------------------------------------------------------------------------- */

export interface FavoritesValue {
  ids: ReadonlyArray<number>;
  count: number;
  toggle: (id: number) => void;
}

export const FavoritesContext = createContext<FavoritesValue | null>(null);

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return ctx;
}

/** The provider's state — extracted so the provider component stays presentational. */
export function useFavoritesState(): FavoritesValue {
  const [ids, setIds] = useState<ReadonlyArray<number>>([]);
  const toggle = useCallback((id: number) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  return useMemo<FavoritesValue>(() => ({ ids, count: ids.length, toggle }), [ids, toggle]);
}

// Re-export so the view can build its provider subtree without referencing the
// context object directly.
export type { ReactNode };
