import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable } from 'react-native';
import { useDispatch, useSelector, Provider as ReduxProvider } from 'react-redux';
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { ScreenScaffold } from '../components/screen-scaffold';
import { Box, Button, Card, Text, useTheme } from '../design-system';
import { container } from '../../core/container';
import { ApiScenario } from '../../core/scenario/api-scenario';
import type { Post } from '../../domain/models/post';
import { Section, Code, Pill } from '../components';

/**
 * State Management screen — a teaching artifact. The headline, stated up front:
 * there is no single "state" and no single "state tool". There are THREE kinds
 * of state, and each has a tool that fits it best:
 *
 *   (a) LOCAL component state        → useState / useReducer
 *   (b) SHARED client state          → Context, Zustand, Redux Toolkit
 *   (c) SERVER state (async/cache)   → TanStack Query (different concern!)
 *
 * Every concept below ships with a LIVE, interactive demo built with the
 * installed state libraries + this app's design-system primitives, so the user
 * taps and watches state change across components. Scoped Providers (Redux,
 * React Query) live INSIDE this screen's subtree — the app itself is NOT a
 * Redux/Query app (see the "How THIS app does it" card for why).
 *
 * Style note: single-file helpers (`Section`, `Code`, `Pill`, and the small
 * demo sub-components) stay as local functions per project convention; only
 * multi-file pieces graduate to `ui/components`.
 */

export function StateManagementScreen() {
  return (
    <ScreenScaffold
      title="State Management"
      subtitle="Three kinds of state — three different tools. Pick by the shape of the data."
    >
      <IntroCard />
      <LocalStateCard />
      <ContextCard />
      <ZustandCard />
      <ReduxCard />
      <ServerStateQueryCard />
      <ThisAppServerStateCard />
      <DecisionMatrixCard />
      <AwarenessCard />
    </ScreenScaffold>
  );
}
const KIND_ROWS: ReadonlyArray<{
  kind: string;
  example: string;
  tools: string;
}> = [
  {
    kind: 'Local component state',
    example: 'a toggle, a form field, a stepper',
    tools: 'useState, useReducer',
  },
  {
    kind: 'Shared client state',
    example: 'cart, theme, auth session, filters',
    tools: 'Context, Zustand, Redux Toolkit',
  },
  {
    kind: 'Server state',
    example: 'list of posts, a user profile from the API',
    tools: 'TanStack Query (or SWR)',
  },
];

function IntroCard() {
  return (
    <Section title="State management">
      <Text variant="body">
        "State" is just data that changes over time. But not all state is the
        same. Before reaching for a library, ask{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          who owns this data and where does it live
        </Text>
        {' '}— the answer picks the tool.
      </Text>
      <Box gap="xs">
        {KIND_ROWS.map((r) => (
          <Box key={r.kind} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.kind}
              </Text>
              <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
                {r.tools}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              e.g. {r.example}
            </Text>
          </Box>
        ))}
      </Box>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          The biggest mistake teams make: stuffing server data (API responses)
          into a client store (Redux/Zustand) and hand-managing loading flags,
          error flags, and cache invalidation. Server state is a DIFFERENT
          concern — it goes in TanStack Query. The demos below make each tool
          do exactly what it is built for.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. LOCAL state — useState + useReducer (LIVE)                       */
/* ------------------------------------------------------------------ */

/**
 * useReducer with a typed action union. This is the SAME const-object + literal
 * pattern this project uses for `FailureSeverity` / `ApiScenario` (see
 * `core/error-handling/failures.ts`): runtime values AND a literal type, with
 * no `enum` (so it stays erasable-syntax clean).
 */
const CounterActionType = {
  Increment: 'increment',
  Decrement: 'decrement',
  Reset: 'reset',
  AddBy: 'addBy',
} as const;
type CounterActionType = (typeof CounterActionType)[keyof typeof CounterActionType];

type CounterAction =
  | { type: typeof CounterActionType.Increment }
  | { type: typeof CounterActionType.Decrement }
  | { type: typeof CounterActionType.Reset }
  | { type: typeof CounterActionType.AddBy; by: number };

function counterReducer(state: number, action: CounterAction): number {
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

function LocalStateCard() {
  // A trivial useState for contrast.
  const [step, setStep] = useState(1);
  // A useReducer for transitions with multiple action types.
  const [count, dispatch] = useReducer(counterReducer, 0);

  return (
    <Section
      title="Local state — useState & useReducer"
      explanation="State that only ONE component (and maybe its children) needs. useState is the daily driver; useReducer shines when the next state depends on a typed action (a finite-state machine) — several actions, one transition function. This is exactly the pattern this app's own use-posts hook uses."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            count =
          </Text>
          <Text variant="h2" tone="primary" style={{ fontWeight: '700' }}>
            {count}
          </Text>
        </Box>

        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button
            title="dispatch increment"
            variant="filled"
            onPress={() => dispatch({ type: CounterActionType.Increment })}
          />
          <Button
            title="dispatch decrement"
            variant="outline"
            onPress={() => dispatch({ type: CounterActionType.Decrement })}
          />
          <Button
            title={`addBy(step=${step})`}
            variant="outline"
            onPress={() => dispatch({ type: CounterActionType.AddBy, by: step })}
          />
          <Button
            title="reset"
            variant="ghost"
            onPress={() => dispatch({ type: CounterActionType.Reset })}
          />
        </Box>

        <Box row gap="sm" style={{ alignItems: 'center' }}>
          <Button title="step +1" variant="ghost" onPress={() => setStep((s) => s + 1)} />
          <Pill tone="primary">{`useState step = ${step}`}</Pill>
        </Box>

        <Code>{`// const-object + literal union (this project's pattern, NOT enum)
const CounterActionType = {
  Increment: 'increment', Decrement: 'decrement',
  Reset: 'reset', AddBy: 'addBy',
} as const;
type CounterAction =
  | { type: typeof CounterActionType.Increment }
  | { type: typeof CounterActionType.AddBy; by: number };

const [count, dispatch] = useReducer(counterReducer, 0);
dispatch({ type: CounterActionType.AddBy, by: 5 });`}</Code>
        <Text variant="caption" tone="muted">
          Rule of thumb: start with useState; promote to useReducer when you have
          3+ related setters, when state transitions have rules, or when you want
          the state machine to be testable in isolation (the reducer is a pure
          function — easy to unit test). This app's{' '}
          <Text style={{ fontFamily: 'monospace' }}>usePosts</Text> hook is a
          real example: an idle/loading/loaded/error machine driven by a reducer.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. SHARED client state — Context (LIVE)                             */
/* ------------------------------------------------------------------ */

/**
 * A small self-contained Context a "favorites" feature would use. Two SIBLING
 * sub-components consume it through useContext — neither receives props. The
 * provider holds the state; the consumers read + update it.
 */

interface FavoritesValue {
  ids: ReadonlyArray<number>;
  count: number;
  toggle: (id: number) => void;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

const FAV_ITEMS: ReadonlyArray<{ id: number; title: string }> = [
  { id: 1, title: 'State is just data' },
  { id: 2, title: 'Pick the tool by the shape' },
  { id: 3, title: 'Server state ≠ client state' },
];

function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ReadonlyArray<number>>([]);
  const toggle = useCallback((id: number) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const value = useMemo<FavoritesValue>(
    () => ({ ids, count: ids.length, toggle }),
    [ids, toggle],
  );
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return ctx;
}

/** A sibling that WRITES to the shared state. */
function FavoritesPicker() {
  const { ids, toggle } = useFavorites();
  const { theme } = useTheme();
  return (
    <Box gap="xs">
      {FAV_ITEMS.map((item) => {
        const fav = ids.includes(item.id);
        return (
          <Pressable
            key={item.id}
            onPress={() => toggle(item.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: theme.spacing.sm,
              borderRadius: theme.radii.sm,
              borderWidth: 1,
              borderColor: fav ? theme.colors.primary : theme.colors.border,
              backgroundColor: fav ? theme.colors.primary : theme.colors.background,
            }}
          >
            <Text
              variant="small"
              tone={fav ? 'onPrimary' : 'default'}
            >
              {item.title}
            </Text>
            <Text
              variant="caption"
              tone={fav ? 'onPrimary' : 'muted'}
              style={{ fontWeight: '600' }}
            >
              {fav ? '★ fav' : '☆ tap'}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
}

/** A DIFFERENT sibling that only READS the shared state — no prop-drilling. */
function FavoritesBadge() {
  const { count } = useFavorites();
  return (
    <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" center>
      <Text variant="h3" tone="primary" style={{ fontWeight: '700' }}>
        {count}
      </Text>
      <Text variant="small" tone="muted">
        favorites (sibling reads via context)
      </Text>
    </Box>
  );
}

function ContextCard() {
  return (
    <Section
      title="Shared client state — Context"
      explanation="When several components on different branches need the same client-side value (cart, theme, auth), prop-drilling is painful. React's built-in Context lets a Provider hold the value and any descendant read/update it. This app's own ThemeProvider is a production Context example."
    >
      <FavoritesProvider>
        <Box gap="sm">
          <FavoritesBadge />
          <FavoritesPicker />
          <Text variant="caption" tone="muted">
            Tap items: the badge (a separate sibling) updates instantly through
            context — neither component was passed props. The provider owns the
            state; both consumers reach it via{' '}
            <Text style={{ fontFamily: 'monospace' }}>useContext</Text>.
          </Text>
          <Code>{`const FavoritesContext = createContext<FavoritesValue | null>(null);

function FavoritesProvider({ children }) {
  const [ids, setIds] = useState<number[]>([]);
  // ... build value, memoized
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

// any descendant:
const { toggle, count } = useContext(FavoritesContext);`}</Code>
          <Text variant="caption" tone="muted">
            Caveat: when the context value changes, EVERY consumer re-renders,
            even ones that only use one field. For high-frequency or large trees,
            split contexts or reach for Zustand (next). Context is best for
            low-frequency, app-wide values (theme, locale, auth session).
          </Text>
        </Box>
      </FavoritesProvider>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. SHARED client state — Zustand (LIVE)                             */
/* ------------------------------------------------------------------ */

/**
 * Zustand: a single create() call returns a hook. Components subscribe with a
 * SELECTOR and re-render ONLY when the selected slice changes — no provider
 * needed. This demo makes that observable with render counters.
 */
interface CounterStore {
  count: number;
  note: string;
  increment: () => void;
  setNote: (n: string) => void;
}

const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  note: 'hello',
  increment: () => set((s) => ({ count: s.count + 1 })),
  setNote: (n) => set({ note: n }),
}));

/** Renders the count. Re-renders whenever count changes. */
function ZustandCountDisplay() {
  const count = useCounterStore((s) => s.count);
  const renders = useRef(0);
  renders.current += 1;
  return (
    <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" center>
      <Text variant="h3" tone="primary" style={{ fontWeight: '700' }}>
        {count}
      </Text>
      <Text variant="caption" tone="muted">
        count · renders={renders.current}
      </Text>
    </Box>
  );
}

/**
 * Subscribes via a selector to count % 2 — re-renders ONLY when parity flips.
 * Bumping count 1→2 re-renders it; 2→3 re-renders it; but a note change never
 * does. Watch the render counter.
 */
function ZustandParityBadge() {
  const parity = useCounterStore((s) => (s.count % 2 === 0 ? 'even' : 'odd'));
  const renders = useRef(0);
  renders.current += 1;
  return (
    <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" center>
      <Pill tone="primary">{parity}</Pill>
      <Text variant="caption" tone="muted">
        parity (selector) · renders={renders.current}
      </Text>
    </Box>
  );
}

function ZustandCard() {
  const increment = useCounterStore((s) => s.increment);
  const setNote = useCounterStore((s) => s.setNote);
  const note = useCounterStore((s) => s.note);
  return (
    <Section
      title="Shared client state — Zustand"
      explanation="Zustand is a tiny (~1KB) store: one create() call, no Provider boilerplate, and components subscribe with a selector so they re-render only when THEIR slice changes. It is the most popular lightweight alternative to Context+useReducer for shared client state."
    >
      <Box gap="sm">
        <ZustandCountDisplay />
        <ZustandParityBadge />

        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="store.increment()" variant="filled" onPress={increment} />
          <Button
            title="toggle note"
            variant="outline"
            onPress={() => setNote(note === 'hello' ? 'world' : 'hello')}
          />
        </Box>

        <Text variant="caption" tone="muted">
          Watch the render counters: increment bumps both (count changes, parity
          may flip). But toggling the note re-renders NEITHER display component —
          each selected only the slice it cares about. That is Zustand's main win
          over Context (which would re-render all consumers on any change).
        </Text>

        <Code>{`import { create } from 'zustand';

const useCounter = create<{ count: number; inc: () => void }>((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));

// in any component, anywhere — no Provider:
const count = useCounter((s) => s.count); // selector → re-renders only on count
const inc   = useCounter((s) => s.inc);`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. SHARED client state — Redux Toolkit + react-redux (LIVE)         */
/* ------------------------------------------------------------------ */

/**
 * Redux Toolkit (the modern, recommended way to write Redux) collapses the old
 * Redux boilerplate into createSlice (typed reducer + action creators) +
 * configureStore. The store here is SCOPED to this screen's demo subtree via a
 * <Provider> — we do NOT add it to _layout (this app is not a Redux app).
 */
interface ReduxCounterState {
  count: number;
}

const reduxCounterSlice = createSlice({
  name: 'demoCounter',
  initialState: { count: 0 } as ReduxCounterState,
  reducers: {
    incremented(state) {
      state.count += 1; // RTK uses Immer; "mutating" this is safe + immutable
    },
    decremented(state) {
      state.count -= 1;
    },
    addedBy(state, action: PayloadAction<number>) {
      state.count += action.payload;
    },
  },
});

const { incremented, decremented, addedBy } = reduxCounterSlice.actions;

const demoStore = configureStore({
  reducer: { demoCounter: reduxCounterSlice.reducer },
});
type DemoRootState = ReturnType<typeof demoStore.getState>;
type DemoDispatch = typeof demoStore.dispatch;

function ReduxCountDisplay() {
  const count = useSelector((s: DemoRootState) => s.demoCounter.count);
  return (
    <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" center>
      <Text variant="h3" tone="primary" style={{ fontWeight: '700' }}>
        {count}
      </Text>
      <Text variant="caption" tone="muted">
        {'useSelector(state => state.demoCounter.count)'}
      </Text>
    </Box>
  );
}

function ReduxControls() {
  const dispatch = useDispatch<DemoDispatch>();
  return (
    <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
      <Button title="dispatch(incremented())" variant="filled" onPress={() => dispatch(incremented())} />
      <Button title="dispatch(decremented())" variant="outline" onPress={() => dispatch(decremented())} />
      <Button title="dispatch(addedBy(5))" variant="outline" onPress={() => dispatch(addedBy(5))} />
    </Box>
  );
}

function ReduxCard() {
  return (
    <Section
      title="Shared client state — Redux Toolkit + react-redux"
      explanation="Redux is the most opinionated client-state library: a single global store, actions → reducer → next state, with time-travel debugging. Redux Toolkit (RTK) is the modern, official, low-boilerplate way to write it. It shines for LARGE apps with many engineers who want strict unidirectional flow and tooling. Here the store is scoped to this subtree via a <Provider>."
    >
      {/* Provider scoped to this screen's demo only — NOT in _layout */}
      <ReduxProvider store={demoStore}>
        <Box gap="sm">
          <ReduxCountDisplay />
          <ReduxControls />
          <Code>{`import { configureStore, createSlice } from '@reduxjs/toolkit';
import { useSelector, useDispatch, Provider } from 'react-redux';

const slice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    incremented(state) { state.count += 1; }, // Immer: safe to "mutate"
  },
});
const store = configureStore({ reducer: { counter: slice.reducer } });

// inside a component under <Provider store={store}>:
const count = useSelector((s) => s.counter.count);
const dispatch = useDispatch();
dispatch(slice.actions.incremented());`}</Code>
          <Text variant="caption" tone="muted">
            Zustand vs Redux: Zustand is minimal (a hook per store, selectors,
            no provider). Redux Toolkit gives you a single source of truth, the
            DevTools time-travel, middleware (thunk/saga), and stricter
            conventions — at the cost of more ceremony. For most apps today,
            Zustand + TanStack Query covers what Redux used to be brought in
            for; reach for Redux when the team specifically wants its model.
          </Text>
        </Box>
      </ReduxProvider>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. SERVER state — TanStack Query (LIVE)                             */
/* ------------------------------------------------------------------ */

/**
 * TanStack Query owns the async lifecycle (loading/success/error), caching,
 * refetch, and invalidation — so you do NOT hand-manage those flags in a client
 * store. The queryFn here calls THIS app's GetPostsUseCase (clean architecture:
 * repository → usecase → query). It unwraps the Result<T>: ok → data, !ok →
 * throw so Query sees an error. The QueryClientProvider is scoped to the demo.
 *
 * The dev scenario knob lets you flip the fake API to a failure path and watch
 * the SAME query move success → error → success live.
 */
async function fetchPosts(): Promise<Post[]> {
  const result = await container.getPostsUseCase.execute();
  if (!result.ok) throw new Error(result.failure.message);
  return result.value;
}

const POSTS_QUERY_KEY = ['posts'] as const;

/** The list that consumes the cached server state. */
function PostsQueryList() {
  const { data, status, error, refetch, isFetching } = useQuery({
    queryKey: POSTS_QUERY_KEY,
    queryFn: fetchPosts,
  });
  return (
    <Box gap="xs">
      <Box row gap="sm" style={{ alignItems: 'center' }}>
        <Pill
          tone={
            status === 'success' ? 'primary' : status === 'error' ? 'danger' : 'muted'
          }
        >
          {`${status}${isFetching ? ' · refetching' : ''}`}
        </Pill>
        <Button title="refetch" variant="ghost" onPress={() => void refetch()} />
      </Box>
      {status === 'pending' ? (
        <Text variant="small" tone="muted">
          loading… (first fetch; cache empty)
        </Text>
      ) : status === 'error' ? (
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" tone="danger" style={{ fontWeight: '600' }}>
            error: {error instanceof Error ? error.message : 'unknown'}
          </Text>
        </Box>
      ) : (
        <Box gap="xxs">
          {(data ?? []).slice(0, 4).map((p) => (
            <Box key={p.id} p="sm" radius="sm" bg="surfaceVariant">
              <Text variant="small" style={{ fontWeight: '600' }}>
                #{p.id} {p.title}
              </Text>
            </Box>
          ))}
          <Text variant="caption" tone="muted">
            {(data ?? []).length} posts cached
          </Text>
        </Box>
      )}
    </Box>
  );
}

/** A SECOND consumer of the SAME query key — it reads the cache, no new fetch. */
function PostsCacheProof() {
  // Same queryKey → no second network call; it subscribes to the cache.
  const { data, status } = useQuery({
    queryKey: POSTS_QUERY_KEY,
    queryFn: fetchPosts,
  });
  return (
    <Box p="sm" radius="md" bg="surfaceVariant">
      <Text variant="caption" tone="muted">
        Second component, same queryKey → reads cache → status:{' '}
        <Text style={{ fontWeight: '600' }}>{status}</Text>, cached posts:{' '}
        <Text style={{ fontWeight: '600' }}>{(data ?? []).length}</Text>
      </Text>
    </Box>
  );
}

function ServerStateQueryCard() {
  // QueryClient created ONCE for this demo subtree.
  const [queryClient] = useState(() => new QueryClient());
  const [scenario, setScenario] = useState<ApiScenario>(ApiScenario.Success);

  const setScenarioAndLog = useCallback((next: ApiScenario) => {
    container.setApiScenario(next);
    setScenario(next);
  }, []);

  return (
    <Section
      title="Server state — TanStack Query"
      explanation="Server state is DIFFERENT from client state: the data is async, lives on a server, can be stale, and needs cache + invalidation + retry. TanStack Query (React Query) owns all of that. Note how the queryFn calls THIS app's GetPostsUseCase — Query sits ABOVE the clean-architecture repository/usecase layer, it does not replace it."
    >
      <QueryClientProvider client={queryClient}>
        <Box gap="sm">
          <PostsQueryList />
          <PostsCacheProof />

          <Box gap="xs">
            <Text variant="caption" tone="muted">
              Flip the dev scenario to force the fake API down a failure path,
              then refetch — watch the SAME query transition success → error →
              success. (The real jsonplaceholder path is unaffected; this knob
              drives the FakeApiService / failure-injection interceptor.)
            </Text>
            <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
              {(
                [
                  ApiScenario.Success,
                  ApiScenario.NetworkError,
                  ApiScenario.ServerError,
                ] as readonly ApiScenario[]
              ).map((s) => (
                <Button
                  key={s}
                  title={s}
                  variant={scenario === s ? 'filled' : 'outline'}
                  onPress={() => setScenarioAndLog(s)}
                />
              ))}
            </Box>
          </Box>

          <Code>{`import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

async function fetchPosts() {
  const result = await container.getPostsUseCase.execute(); // clean arch
  if (!result.ok) throw new Error(result.failure.message); // error → Query
  return result.value;
}

const { data, status, error, refetch } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
});
// status: 'pending' | 'success' | 'error' — owned by Query, not by you`}</Code>
          <Text variant="caption" tone="muted">
            What you get for free: automatic cache by query key (the second
            component showed cached data instantly), background refetch, retry,
            stale-while-revalidate, and{' '}
            <Text style={{ fontFamily: 'monospace' }}>queryClient.invalidateQueries(['posts'])</Text>{' '}
            to mark data stale after a mutation. This is the work teams
            incorrectly copy into Redux actions. Query keeps it at the edge.
          </Text>
        </Box>
      </QueryClientProvider>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. How THIS app does server state (no global store)                 */
/* ------------------------------------------------------------------ */

function ThisAppServerStateCard() {
  return (
    <Section
      title="How THIS app does it — DI + usecases + a hook"
      explanation="This app deliberately has NO global store and NO query library wired globally. Server state is owned by a hook (usePosts) that drives a useReducer machine over a GetPostsUseCase resolved from the hand-rolled DI container. The question this card answers: why is that a legitimate choice, and when would we add Query?"
    >
      <Box gap="xs">
        <Code>{`// src/ui/hooks/use-posts.ts — the app's server-state pattern
type PostsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; posts: Post[]; warning?: Failure }
  | { status: 'error'; failure: Failure };

const [state, dispatch] = useReducer(reducer, { status: 'idle' });
// calls container.getPostsUseCase.execute() → Result<Post[]>`}</Code>
        <Text variant="small" tone="muted">
          The clean-architecture layering already handles the hard parts: the
          repository is offline-first (cache + warning), failures come back as a
          typed <Text style={{ fontFamily: 'monospace' }}>Result&lt;T&gt;</Text>,
          and severity drives UI. A hook is enough surface to expose that to one
          screen. The DI service locator wires dependencies without a global
          state tree. So: a global store is OPTIONAL here, not mandatory.
        </Text>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" tone="muted">
            When to GRADUATE to TanStack Query here: the moment multiple screens
            need the same data with cross-screen cache invalidation, background
            refresh, or optimistic mutations. The Query demo above shows the
            transition is additive — drop QueryClientProvider in _layout, keep
            the same queryFn calling the SAME usecase, and remove the hand-rolled
            usePosts machine. The architecture below it does not change.
          </Text>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Decision matrix — when to use what                               */
/* ------------------------------------------------------------------ */

const MATRIX_ROWS: ReadonlyArray<{
  need: string;
  pick: string;
  why: string;
}> = [
  {
    need: 'One component owns it',
    pick: 'useState / useReducer',
    why: 'No sharing → no library. Cheapest option.',
  },
  {
    need: 'A few nearby components share it',
    pick: 'lift state up / Context',
    why: 'Built into React. Best for low-frequency values (theme, auth).',
  },
  {
    need: 'Many components, frequent updates',
    pick: 'Zustand',
    why: 'Selector subscriptions avoid the Context re-render cliff.',
  },
  {
    need: 'Huge team, strict unidirectional flow',
    pick: 'Redux Toolkit',
    why: 'Conventions + DevTools pay off at scale; overkill for small apps.',
  },
  {
    need: 'Async data from a server',
    pick: 'TanStack Query',
    why: 'Cache, invalidation, retry, loading/error — NOT a client store.',
  },
  {
    need: 'This app, today',
    pick: 'DI + usecases + useReducer hook',
    why: 'Clean architecture keeps state at the edges; Result<T> covers failure.',
  },
];

function DecisionMatrixCard() {
  return (
    <Section
      title="Decision matrix — when to use what"
      explanation="Tie every choice to the shape of the data, not to fashion. This app's current pick (last row) is right for its size and layering; the libraries above are tools to reach for as the need actually arises."
    >
      <Box gap="xs">
        {MATRIX_ROWS.map((r) => (
          <Box key={r.need} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.need}
              </Text>
              <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                {r.pick}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.why}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Awareness — other tools (prose, not wired live)                  */
/* ------------------------------------------------------------------ */

function AwarenessCard() {
  return (
    <Section
      title="Awareness — other state models you will meet"
      explanation="These are not installed in this app; the goal is recognition. Each model exists because it fits a different access pattern than the tools above."
    >
      <Box gap="xs">
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Jotai / Recoil — atomic state
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            State is split into independent atoms; components subscribe to
            individual atoms instead of one store. Great for highly derived,
            interdependent state (spreadsheets, form builders). Recoil is
            Meta's library (largely maintenance-only); Jotai is its active
            successor.
          </Text>
          <Code>{`import { atom, useAtom } from 'jotai';
const countAtom = atom(0);
const [count, setCount] = useAtom(countAtom);`}</Code>
        </Box>

        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            MobX — observable objects
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            You mark plain objects/classes as observable; MobX tracks which
            fields a component reads and re-renders precisely those. Feels like
            "mutable" state with automatic dependency tracking. Pairs naturally
            with OOP domain models (close to the Flutter guide's mindset).
          </Text>
          <Code>{`import { makeAutoObservable } from 'mobx';
class Counter { count = 0; inc() { this.count++; } }
const c = makeAutoObservable(new Counter());`}</Code>
        </Box>

        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            useSyncExternalStore — the low-level primitive
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            The React hook that Zustand, Redux, and Jotai all use under the hood
            to subscribe a component to an EXTERNAL store (tearing-safe under
            concurrent rendering). You rarely call it directly, but knowing it
            exists explains why those libraries can share one store without
            Context.
          </Text>
          <Code>{`const value = useSyncExternalStore(
  subscribe,   // (cb) => unsubscribe
  getSnapshot, // () => current value (must be stable ref)
);`}</Code>
        </Box>
      </Box>
    </Section>
  );
}
