import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * TypeScript & JavaScript Fundamentals view logic — each interactive teaching
 * demo's state + behaviour, extracted so the view stays a dumb structure.
 * Pure domain helpers (BigInt-safe stringify, value parser, shape area, …) are
 * co-located here too.
 *
 * Convention (per project rules): compiles with `erasableSyntaxOnly`, so
 * const-object + literal unions are used INSTEAD of enums everywhere. No `any`;
 * `unknown` + narrowing is preferred.
 */

/* ------------------------------------------------------------------ */
/* Pure helpers — shared across multiple cards                          */
/* ------------------------------------------------------------------ */

/**
 * `JSON.stringify` throws on `bigint` ("Do not know how to serialize a BigInt")
 * and returns `undefined` for `symbol` / `function`. This demo renders sample
 * values of every primitive kind — including bigint — so we need a serializer
 * that never throws. Mirrors how a REPL would display these values.
 */
export function safeStringify(value: unknown): string {
  if (typeof value === 'bigint') return `${value.toString()}n`;
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return '[Function]';
  const out = JSON.stringify(value);
  return out === undefined ? String(value) : out;
}

/** Coerce a raw text input into a typed JS value for the equality/truthy demos. */
export function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed === 'null') return null;
  if (trimmed === 'undefined') return undefined;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed; // anything else stays a string
}

export function describe(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string' && v === '') return '"" (empty string)';
  return `${typeof v}: ${safeStringify(v)}`;
}

/* ------------------------------------------------------------------ */
/* var / let / const                                                   */
/* ------------------------------------------------------------------ */

export function useVarLetConstDemo() {
  const [letValue, setLetValue] = useState(0);
  const [constValue] = useState(0); // we mutate via setState, not rebinding
  const [items, setItems] = useState<number[]>([1, 2]);
  const constObjectAttempt = useRef<string>('');

  const tryReassignConst = () => {
    // Simulating what `constValue = constValue + 1` would do. We can't actually
    // write that (TS would reject it), so we record the message it would raise.
    constObjectAttempt.current =
      'Cannot assign to "constValue" because it is a constant. (ts(2588))';
  };

  const bumpLet = () => setLetValue((v) => v + 1);
  const push = () => setItems((list) => [...list, list.length + 1]);
  const resetItems = () => setItems([1, 2]);

  return {
    letValue,
    constValue,
    items,
    constObjectAttempt,
    bumpLet,
    tryReassignConst,
    push,
    resetItems,
  };
}

/* ------------------------------------------------------------------ */
/* == vs ===                                                           */
/* ------------------------------------------------------------------ */

export function useEqualityDemo() {
  const [aRaw, setARaw] = useState('0');
  const [bRaw, setBRaw] = useState('"  "');
  const a = parseValue(aRaw);
  const b = parseValue(bRaw);

  const loose = a == b; // eslint-disable-line eqeqeq
  const strict = a === b;

  return { aRaw, setARaw, bRaw, setBRaw, a, b, loose, strict };
}

/* ------------------------------------------------------------------ */
/* Truthy / falsy                                                      */
/* ------------------------------------------------------------------ */

export function useTruthyFalsyDemo() {
  const [raw, setRaw] = useState('"hello"');
  const value = parseValue(raw);
  const truthy = !!value;
  return { raw, setRaw, value, truthy };
}

/* ------------------------------------------------------------------ */
/* Template literals                                                   */
/* ------------------------------------------------------------------ */

export function useTemplateLiteralsDemo() {
  const [name, setName] = useState('Mak');
  const [count, setCount] = useState(3);
  const buy = () => setCount((c) => c + 1);
  const sell = () => setCount((c) => Math.max(0, c - 1));
  return { name, setName, count, buy, sell };
}

/* ------------------------------------------------------------------ */
/* Destructuring                                                       */
/* ------------------------------------------------------------------ */

export interface DestructureUser {
  name: string;
  age: number;
  city: string;
  company: string;
  role?: string;
}

export function useDestructuringDemo() {
  const [user, setUser] = useState<DestructureUser>({
    name: 'Ada',
    age: 36,
    city: 'London',
    company: 'Lovelace Labs',
  });

  const randomize = () =>
    setUser({
      name: ['Ada', 'Linus', 'Grace', 'Guido'][Math.floor(Math.random() * 4)] ?? 'Ada',
      age: Math.floor(Math.random() * 50) + 18,
      city: ['London', 'NYC', 'Berlin', 'Tokyo'][Math.floor(Math.random() * 4)] ?? 'London',
      company: 'Lovelace Labs',
    });

  return { user, randomize };
}

/* ------------------------------------------------------------------ */
/* Spread / rest                                                       */
/* ------------------------------------------------------------------ */

export function useSpreadRestDemo() {
  const [base, setBase] = useState({ theme: 'dark', lang: 'ts' });
  const [overrides, setOverrides] = useState({ theme: 'light' });

  // Object spread merges right-wins; array spread concatenates.
  const merged = useMemo(() => ({ ...base, ...overrides }), [base, overrides]);
  const combined = useMemo(() => {
    const a = [1, 2, 3];
    const b = [4, 5];
    return [...a, ...b];
  }, []);

  // rest params: gather args into an array
  const sum = (...nums: number[]) => nums.reduce((acc, n) => acc + n, 0);

  const flipBase = () =>
    setBase((b) => ({ ...b, theme: b.theme === 'dark' ? 'light' : 'dark' }));
  const flipOverride = () =>
    setOverrides((o) => ({ ...o, theme: o.theme === 'light' ? 'dark' : 'light' }));

  return { base, overrides, merged, combined, sum, flipBase, flipOverride };
}

/* ------------------------------------------------------------------ */
/* Optional chaining & nullish coalescing                              */
/* ------------------------------------------------------------------ */

export interface OptChainProfile {
  name: string;
  address?: {
    city?: string;
    zip?: string;
  } | null;
}

export function useOptionalChainingDemo() {
  const [profile, setProfile] = useState<OptChainProfile>({
    name: 'Mak',
    address: { city: 'Sydney', zip: '2000' },
  });

  const toggleAddress = () =>
    setProfile((p) => ({
      ...p,
      address: p.address ? null : { city: 'Sydney', zip: '2000' },
    }));
  const clearCity = () =>
    setProfile((p) => ({
      ...p,
      address: p.address ? { ...p.address, city: undefined } : p.address,
    }));

  // ?. short-circuits to undefined; ?? only falls back for null/undefined
  // (NOT for 0 or '' — that's the difference from ||).
  const city = profile.address?.city ?? 'city missing';
  const zip = profile.address?.zip ?? '—';
  const display = profile.address?.city?.toUpperCase() ?? 'NO CITY';

  return { profile, toggleAddress, clearCity, city, zip, display };
}

/* ------------------------------------------------------------------ */
/* Array methods sandbox                                               */
/* ------------------------------------------------------------------ */

export const ARRAY_DATASET: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const ARRAY_METHODS = {
  map: 'x2 → double every element',
  filter: 'even → keep the even numbers',
  reduce: 'sum → one accumulated value',
  find: 'first > 5 → first match (or undefined)',
  some: 'any > 8 → true if any passes',
  every: 'all > 0 → true if all pass',
} as const;
export type ArrayMethodName = keyof typeof ARRAY_METHODS;

export function useArrayMethodsDemo() {
  const [method, setMethod] = useState<ArrayMethodName>('map');

  const result = useMemo<unknown>(() => {
    switch (method) {
      case 'map':
        return ARRAY_DATASET.map((x) => x * 2);
      case 'filter':
        return ARRAY_DATASET.filter((x) => x % 2 === 0);
      case 'reduce':
        return ARRAY_DATASET.reduce((acc, x) => acc + x, 0);
      case 'find':
        return ARRAY_DATASET.find((x) => x > 5);
      case 'some':
        return ARRAY_DATASET.some((x) => x > 8);
      case 'every':
        return ARRAY_DATASET.every((x) => x > 0);
    }
  }, [method]);

  return { method, setMethod, result };
}

/* ------------------------------------------------------------------ */
/* Control flow                                                        */
/* ------------------------------------------------------------------ */

export type ControlFlowMode = 'if' | 'switch' | 'ternary' | 'forOf' | 'while';

export function useControlFlowDemo() {
  const [mode, setMode] = useState<ControlFlowMode>('if');

  // each branch computes a small runtime value to display
  const value = useMemo(() => {
    const nums = [3, 1, 4, 1, 5];
    if (mode === 'if') {
      const n = nums[0] ?? 0;
      if (n > 2) return `n (${n}) > 2 → "big"`;
      return `n (${n}) ≤ 2 → "small"`;
    }
    if (mode === 'switch') {
      const day: string = 'Wed';
      switch (day) {
        case 'Sat':
        case 'Sun':
          return `${day} → weekend`;
        default:
          return `${day} → weekday`;
      }
    }
    if (mode === 'ternary') {
      const active = true;
      return active ? 'active → "Online"' : 'inactive → "Offline"';
    }
    if (mode === 'forOf') {
      let sum = 0;
      for (const n of nums) sum += n;
      return `sum of [${nums.join(',')}] = ${sum}`;
    }
    // while
    let countdown = 3;
    let steps = 0;
    while (countdown > 0) {
      countdown -= 1;
      steps += 1;
    }
    return `while countdown > 0: ${steps} iterations`;
  }, [mode]);

  return { mode, setMode, value };
}

/* ------------------------------------------------------------------ */
/* Functions (declarations vs arrow)                                   */
/* ------------------------------------------------------------------ */

export type FunctionPick = 'decl' | 'arrow';

export function useFunctionsDemo() {
  const [picked, setPicked] = useState<FunctionPick>('decl');
  return { picked, setPicked };
}

/* ------------------------------------------------------------------ */
/* Closures                                                            */
/* ------------------------------------------------------------------ */

export interface Counter {
  next: () => number;
  reset: () => void;
  peek: () => number;
}

/** A factory that builds a counter whose `count` is private (captured by closure). */
export function makeCounter(start: number): Counter {
  let count = start;
  return {
    next: () => (count += 1),
    reset: () => {
      count = start;
    },
    peek: () => count,
  };
}

export function useClosuresDemo() {
  const counterRef = useRef(makeCounter(10));
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const next = () => {
    counterRef.current.next();
    rerender();
  };
  const reset = () => {
    counterRef.current.reset();
    rerender();
  };
  const peek = counterRef.current.peek();

  return { peek, next, reset };
}

/* ------------------------------------------------------------------ */
/* Objects & classes, `this`                                           */
/* ------------------------------------------------------------------ */

export type ObjectMethodPick = 'arrow' | 'regular';

export function useObjectsAndClassesDemo() {
  const [viaArrow, setViaArrow] = useState(true);

  // Demonstrate the `this` nuance: a regular method loses `this` when torn
  // off (passed as a callback); an arrow field keeps it.
  type Logger = { who: () => string };
  const makeLogger = (arrow: boolean): Logger => {
    const owner = 'widget';
    if (arrow) {
      return {
        who: () => owner, // arrow closes over `owner`
      };
    }
    return {
      who() {
        return owner; // regular method; `this` would be lost if passed around
      },
    };
  };
  const logger = makeLogger(viaArrow);
  const detached = logger.who; // tear off — pass as callback

  return {
    viaArrow,
    setArrow: () => setViaArrow(true),
    setRegular: () => setViaArrow(false),
    who: logger.who(),
    detached: detached(),
  };
}

/* ------------------------------------------------------------------ */
/* Promises & async/await, try/catch                                  */
/* ------------------------------------------------------------------ */

export type AsyncState =
  | { status: 'idle' }
  | { status: 'loading'; startedAt: number }
  | { status: 'success'; value: string; ms: number }
  | { status: 'error'; message: string; ms: number };

export function useAsyncAwaitDemo() {
  const [state, setState] = useState<AsyncState>({ status: 'idle' });

  // A simulated async operation that resolves or rejects after a delay.
  const fakeFetch = (ok: boolean, delayMs: number): Promise<string> =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (ok) resolve(`OK @ ${new Date().toLocaleTimeString()}`);
        else reject(new Error('Network blew up'));
      }, delayMs);
    });

  const run = async (ok: boolean) => {
    const startedAt = Date.now();
    setState({ status: 'loading', startedAt });
    try {
      const value = await fakeFetch(ok, 900);
      setState({ status: 'success', value, ms: Date.now() - startedAt });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({
        status: 'error',
        message,
        ms: Date.now() - startedAt,
      });
    }
  };

  const reset = () => setState({ status: 'idle' });

  return { state, runSuccess: () => run(true), runFailure: () => run(false), reset };
}

/* ------------------------------------------------------------------ */
/* setTimeout / setInterval                                            */
/* ------------------------------------------------------------------ */

export function useTimersDemo() {
  const [ticks, setTicks] = useState(0);
  const [running, setRunning] = useState(false);
  const [ping, setPing] = useState<string>('—');

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTicks((t) => t + 1), 500);
    return () => clearInterval(id); // cleanup avoids leaks
  }, [running]);

  const fireOnce = () => {
    setPing('waiting…');
    setTimeout(() => setPing(`fired @ ${new Date().toLocaleTimeString()}`), 600);
  };

  const toggle = () => setRunning((r) => !r);
  const reset = () => {
    setRunning(false);
    setTicks(0);
  };

  return { ticks, running, ping, toggle, reset, fireOnce };
}

/* ------------------------------------------------------------------ */
/* Union / intersection, literals, as const                            */
/* ------------------------------------------------------------------ */

export type Role = 'admin' | 'editor' | 'viewer';

export function useUnionIntersectionDemo() {
  const [role, setRole] = useState<Role>('viewer');
  return { role, setRole };
}

/* ------------------------------------------------------------------ */
/* Generics                                                            */
/* ------------------------------------------------------------------ */

export function useGenericsDemo() {
  const [box, setBox] = useState<{ value: number }>({ value: 7 });
  // generic identity fn (just to show the shape in code)
  const identity = <T,>(x: T): T => x;
  const bump = () => setBox((b) => ({ value: b.value + 10 }));
  const reset = () => setBox({ value: 0 });
  return { box, bump, reset, identity };
}

/* ------------------------------------------------------------------ */
/* Narrowing (typeof / in / instanceof, discriminated unions)          */
/* ------------------------------------------------------------------ */

export type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect'; w: number; h: number };

export function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.radius * s.radius;
    case 'square':
      return s.side * s.side;
    case 'rect':
      return s.w * s.h;
  }
}

export function useNarrowingDemo() {
  const [shape, setShape] = useState<Shape>({ kind: 'circle', radius: 3 });
  const a = area(shape);
  const setCircle = () => setShape({ kind: 'circle', radius: 3 });
  const setSquare = () => setShape({ kind: 'square', side: 4 });
  const setRect = () => setShape({ kind: 'rect', w: 4, h: 5 });
  return { shape, setCircle, setSquare, setRect, a };
}

/* ------------------------------------------------------------------ */
/* const-object vs enum (project pattern)                              */
/* ------------------------------------------------------------------ */

// THIS is the project's actual pattern — mirrors core/result.ts and
// core/scenario/api-scenario.ts. Compile with erasableSyntaxOnly: enums are
// NOT erasable (they emit a runtime object), so we forbid them.
export const ApiStatus = {
  Idle: 'idle',
  Loading: 'loading',
  Success: 'success',
  Error: 'error',
} as const;

export type ApiStatus = (typeof ApiStatus)[keyof typeof ApiStatus];

export function useConstObjectDemo() {
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.Idle);
  return { status, setStatus };
}

/* ------------------------------------------------------------------ */
/* unknown vs any vs never                                             */
/* ------------------------------------------------------------------ */

export function useUnknownAnyDemo() {
  // `unknown` forces narrowing before use; `any` opts out of type-checking
  // entirely (this project forbids `any`); `never` is the type of code that
  // can't return (throws / infinite loop) or a union branch that can't exist.
  const handleUnknown = (raw: unknown): string => {
    if (typeof raw === 'string') return `string: ${raw}`;
    if (typeof raw === 'number') return `number: ${raw}`;
    return `narrowed to: ${typeof raw}`;
  };

  const [raw, setRaw] = useState('hello');
  const parsed = parseValue(raw);
  const handled = handleUnknown(parsed);

  return { raw, setRaw, handled };
}
