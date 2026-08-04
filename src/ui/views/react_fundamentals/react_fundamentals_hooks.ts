import { useEffect, useMemo, useReducer, useRef, useState } from 'react';

/**
 * React Fundamentals view logic — each interactive teaching demo's state +
 * behaviour, extracted so the view stays a dumb structure. One hook per card
 * that owns state; pure helpers alongside.
 *
 * No `any`; strict + erasure-clean. Built only from the built-in React hooks.
 */

/* ------------------------------------------------------------------ */
/* 5. useState — counter                                               */
/* ------------------------------------------------------------------ */

export function useCounterState() {
  const [count, setCount] = useState(0);
  const decrement = () => setCount((c) => c - 1);
  const increment = () => setCount((c) => c + 1);
  const reset = () => setCount(0);
  return { count, decrement, increment, reset };
}

/* ------------------------------------------------------------------ */
/* 6. Controlled input                                                 */
/* ------------------------------------------------------------------ */

export const CONTROLLED_INPUT_MAX = 20;

export function useControlledInput() {
  const [text, setText] = useState('');
  const over = text.length > CONTROLLED_INPUT_MAX;
  return { text, setText, over };
}

/* ------------------------------------------------------------------ */
/* 7. Conditional rendering                                            */
/* ------------------------------------------------------------------ */

export function useConditionalToggle() {
  const [on, setOn] = useState(false);
  const toggle = () => setOn((v) => !v);
  return { on, toggle };
}

/* ------------------------------------------------------------------ */
/* 8. Lists — .map + key                                               */
/* ------------------------------------------------------------------ */

export type Task = { id: number; label: string };

export function useTaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, label: 'Learn JSX' },
    { id: 2, label: 'Learn state' },
  ]);
  const [next, setNext] = useState(3);

  const add = () => {
    setTasks((list) => [...list, { id: next, label: `Task #${next}` }]);
    setNext((n) => n + 1);
  };

  const remove = (id: number) =>
    setTasks((list) => list.filter((t) => t.id !== id));

  return { tasks, add, remove };
}

/* ------------------------------------------------------------------ */
/* 9. useEffect with cleanup                                           */
/* ------------------------------------------------------------------ */

export function useEffectTimer() {
  const [running, setRunning] = useState(false);
  const [ticks, setTicks] = useState(0);

  // Start/stop an interval. The cleanup function clears the timer when the
  // effect re-runs or the component unmounts — this is how you avoid leaks.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTicks((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const toggle = () => setRunning((r) => !r);
  const reset = () => {
    setRunning(false);
    setTicks(0);
  };

  return { running, ticks, toggle, reset };
}

/* ------------------------------------------------------------------ */
/* 10. useMemo + useRef                                                */
/* ------------------------------------------------------------------ */

/** A deliberately expensive pure calc so the memoization is observable. */
export function expensiveSum(n: number): number {
  // Busy work — quadratic in n so the difference is visible at large n.
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      total += (i * j) % 7;
    }
  }
  return total;
}

export function useMemoUseRefDemo() {
  const [size, setSize] = useState(200);
  const [unrelated, setUnrelated] = useState(0);
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Memoized: recomputed only when `size` changes, not on every render.
  const sum = useMemo(() => expensiveSum(size), [size]);

  const decrementSize = () => setSize((s) => Math.max(50, s - 50));
  const incrementSize = () => setSize((s) => s + 50);
  const bumpUnrelated = () => setUnrelated((u) => u + 1);

  return {
    size,
    unrelated,
    renderCount: renderCount.current,
    sum,
    decrementSize,
    incrementSize,
    bumpUnrelated,
  };
}

/* ------------------------------------------------------------------ */
/* 11. useReducer (brief)                                              */
/* ------------------------------------------------------------------ */

export type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' };

export function counterReducer(state: number, action: CounterAction): number {
  switch (action.type) {
    case 'increment':
      return state + 1;
    case 'decrement':
      return state - 1;
    case 'reset':
      return 0;
  }
}

export function useReducerCounter() {
  const [count, dispatch] = useReducer(counterReducer, 0);
  const decrement = () => dispatch({ type: 'decrement' });
  const reset = () => dispatch({ type: 'reset' });
  const increment = () => dispatch({ type: 'increment' });
  return { count, decrement, reset, increment };
}

/* ------------------------------------------------------------------ */
/* 12. Custom hook                                                     */
/* ------------------------------------------------------------------ */

/** A tiny custom hook — encapsulates reusable stateful logic. */
export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = () => setValue((v) => !v);
  return [value, toggle] as const;
}
