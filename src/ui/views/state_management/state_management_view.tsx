import { Box, Text } from '../../design-system';
import { ScreenScaffold, LinkCard, Section, Code } from '../../components';
import { ROUTES, RoutePaths } from '../../navigation/routes';

/**
 * StateManagementHubView — a dumb structure; the section landing screen for
 * `/state-management`. Static (no state/effects), so there is no `_hooks.ts`;
 * the `ROUTES.filter` below is a pure derivation over the route table (the
 * single source of truth), presentational.
 *
 * The hub holds the orientation content (what "state" is, how THIS app does it,
 * a decision matrix, and awareness of other models) and lists the four
 * sub-screens — each is a LIVE demo of one state tool (useReducer/Context,
 * Zustand, Redux Toolkit, TanStack Query). The scoped Providers (Redux,
 * React Query) live INSIDE those sub-views' subtrees, NOT here and NOT in
 * `_layout` — the app itself is a DI-service-locator + usecases + useReducer
 * app (see the decision log: "State libs added for the state-management
 * teaching screen"). No `any`; strict + erasableSyntaxOnly-clean.
 */
export function StateManagementHubView() {
  const subRoutes = ROUTES.filter(
    (r) =>
      r.enabled &&
      r.path !== RoutePaths.stateManagement &&
      (r.path === RoutePaths.localState ||
        r.path === RoutePaths.zustand ||
        r.path === RoutePaths.redux ||
        r.path === RoutePaths.serverState),
  );

  return (
    <ScreenScaffold
      title="State Management"
      subtitle="Three kinds of state — three different tools. Pick by the shape of the data."
    >
      <IntroCard />
      <ThisAppServerStateCard />
      <DecisionMatrixCard />
      <AwarenessCard />

      <Section
        title="Live demos"
        explanation="Each sub-screen ships an interactive demo built with the installed state libraries + this app's design-system primitives. Tap a card to open it; use the back arrow to return here."
      >
        <Box gap="sm">
          {subRoutes.map((route) => (
            <LinkCard
              key={route.path}
              title={route.title}
              description={route.description}
              href={route.path}
            />
          ))}
        </Box>
      </Section>
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
/* How THIS app does server state (no global store)                 */
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
            refresh, or optimistic mutations. The Query demo below shows the
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
/* Decision matrix — when to use what                               */
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
/* Awareness — other tools (prose, not wired live)                  */
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
