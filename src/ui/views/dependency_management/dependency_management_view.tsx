import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Card, Text } from '../../design-system';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import { Section, Code, Pill } from '../../components';
import {
  useLiveGraphDemo,
  useLiveToggleDemo,
  useResolveInspectorDemo,
  resolveClassName,
  accessorFor,
} from './dependency_management_hooks';
import { usePosts } from '../../hooks/use-posts';

/**
 * DependencyManagementView — a dumb structure. All state/behaviour lives in
 * the co-located hooks (dependency_management_hooks.ts); this file only renders.
 *
 * A teaching artifact for THIS app's hand-rolled service locator. Grounded in
 * the real files:
 *   core/container.ts                 (the Container / `container` singleton)
 *   core/config/app-config.ts         (AppConfig — the root of the graph)
 *   app/_layout.tsx                   (container.initialize(createAppConfig()))
 *   ui/hooks/use-posts.ts             (resolves GetPostsUseCase via container)
 *
 * Single-file helpers stay local per convention. No `any`; strict + erasure-clean.
 */
export function DependencyManagementView() {
  return (
    <ScreenScaffold
      title="Dependency Management"
      subtitle="A hand-rolled service locator — wiring in one explicit, debuggable place."
    >
      <IntroCard />
      <ConceptCard />
      <RegistrationGraphCard />
      <LiveGraphCard />
      <LifecycleCard />
      <LiveToggleCard />
      <ResolveInspectorCard />
      <ComparisonCard />
      <RecapCard />
    </ScreenScaffold>
  );
}
function IntroCard() {
  return (
    <Section title="Dependency injection">
      <Text variant="body">
        A screen needs data. The naive version reaches straight for{' '}
        <Text style={{ fontFamily: 'monospace' }}>fetch</Text> or imports a DAO —
        and now that screen is permanently welded to one HTTP engine and one
        storage backend.{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          Dependency Injection
        </Text>{' '}
        inverts that: a screen depends on an{' '}
        <Text style={{ fontStyle: 'italic' }}>abstraction</Text>, and something
        else decides which concrete implementation fills it.
      </Text>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" style={{ fontWeight: '600' }}>
          This app's choice
        </Text>
        <Text variant="small" tone="muted" mt="xxs">
          A small, hand-rolled{' '}
          <Text style={{ fontFamily: 'monospace' }}>service locator</Text> in{' '}
          <Text style={{ fontFamily: 'monospace' }}>core/container.ts</Text> — one
          registry, named accessors, eager singletons. It mirrors the sibling
          React guide's{' '}
          <Text style={{ fontFamily: 'monospace' }}>container.ts</Text> and
          Flutter's <Text style={{ fontFamily: 'monospace' }}>get_it</Text>. No
          codegen, no decorator metadata, no magic — wiring you can read
          top-to-bottom.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The concept — IoC + depend on abstractions                       */
/* ------------------------------------------------------------------ */

function ConceptCard() {
  return (
    <Section
      title="The concept — inversion of control, depend on abstractions"
      explanation="DI is IoC applied to dependencies: rather than a class constructing what it needs, it asks for it (constructor parameters). The class depends on an interface; the container binds the interface to a concrete impl."
    >
      <Box gap="sm">
        <Code>{`// BAD — the screen is welded to fetch + a URL + a DTO shape:
function PostsScreen() {
  const [posts, setPosts] = useState<PostDTO[]>([]);
  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/posts')   // ← engine leak
      .then(r => r.json()).then(setPosts);                // ← wire shape leak
  }, []);
}

// THIS APP — the screen depends on a use case ABSTRACTION, resolved via the
// container. It never imports fetch, the http client, a DTO, or a DAO:
function usePosts(getPostsUseCase = container.getPostsUseCase) {
  // … drives GetPostsUseCase.execute() → Result<Post[]>
}`}</Code>
        <Box gap="xs">
          {CONCEPT_ROWS.map((r) => (
            <Box key={r.term} p="sm" radius="sm" bg="surfaceVariant">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text variant="small" style={{ fontWeight: '600' }}>
                  {r.term}
                </Text>
                <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                  {r.cite}
                </Text>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.note}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Section>
  );
}

const CONCEPT_ROWS: ReadonlyArray<{ term: string; cite: string; note: string }> = [
  {
    term: 'Inversion of Control',
    cite: 'container.resolve()',
    note: "The class no longer controls how its dependencies are created — it calls resolve() and receives a ready-made instance. Control flows 'outside-in'.",
  },
  {
    term: 'Depend on abstractions',
    cite: 'PostRepository (interface)',
    note: 'use-cases depend on the PostRepository interface, never on PostRepositoryImpl. The container binds the interface → impl, so the impl is swappable.',
  },
  {
    term: 'Single responsibility',
    cite: '_layout.tsx',
    note: 'Wiring is a separate concern, centralized in one bootstrap call (container.initialize). Screens stay about presentation; the container is about construction.',
  },
];

/* ------------------------------------------------------------------ */
/* 3. The registration graph                                          */
/* ------------------------------------------------------------------ */

function RegistrationGraphCard() {
  return (
    <Section
      title="The registration graph — config is the root"
      explanation="container.initialize(config) eagerly registers a chain of singletons. Each depends on the ones before it, so the graph reads top-to-bottom: config → engines → sources → repository → use case."
    >
      <Box gap="sm">
        <Code>{`// core/container.ts — initialize() builds the whole graph in order:
initialize(config: AppConfig) {
  this.register('AppConfig', config);                       // 1. root
  this.register('Logger', new Logger(config.environment, …));
  this.register('HttpClient', createHttpClient({            // 2. engine
    config, logger: this.logger, getScenario: () => this.scenario.api,
  }));
  this.register('PostRemoteDataSource', this.createPostRemoteDataSource());
  this.register('AppDatabase', this.createAppDatabase());   // 3. local engine
  this.register('PostRepository', this.createPostRepository()); // 4. impl
  this.register('GetPostsUseCase', this.createGetPostsUseCase()); // 5. use case
}

// each createX() resolves its own deps from the registry:
private createPostRepository() {
  return new PostRepositoryImpl(
    this.postRemoteDataSource,  // abstraction
    this.appDatabase,           // abstraction
    this.logger,
  );
}`}</Code>
        <Box gap="xs">
          {GRAPH_ROWS.map((r, i) => (
            <Box key={r.name} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
              <Text variant="small" tone="primary" style={{ fontWeight: '700' }}>
                {i + 1}.
              </Text>
              <Box flex={1}>
                <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <Text variant="small" style={{ fontWeight: '600' }}>
                    {r.name}
                  </Text>
                  <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                    {r.impl}
                  </Text>
                </Box>
                <Text variant="caption" tone="muted" mt="xxs">
                  {r.note}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
        <Text variant="caption" tone="muted">
          Notice the directions: every arrow points inward toward the domain. The
          use case depends on the{' '}
          <Text style={{ fontFamily: 'monospace' }}>PostRepository</Text>{' '}
          interface; the repository depends on the{' '}
          <Text style={{ fontFamily: 'monospace' }}>PostRemoteDataSource</Text>{' '}
          and <Text style={{ fontFamily: 'monospace' }}>AppDatabase</Text>{' '}
          abstractions. Nothing depends on a concrete impl directly except the
          container's <Text style={{ fontFamily: 'monospace' }}>createX</Text>{' '}
          factories.
        </Text>
      </Box>
    </Section>
  );
}

const GRAPH_ROWS: ReadonlyArray<{ name: string; impl: string; note: string }> = [
  { name: 'AppConfig', impl: 'createAppConfig(env)', note: 'The root. Resolved from expo-constants at runtime; carries env + scenario flags. Everything else reads it.' },
  { name: 'Logger', impl: 'new Logger(env, enableLogs)', note: 'Cross-cutting. Severity floor comes from config (prod = errors-only).' },
  { name: 'HttpClient', impl: 'createHttpClient({config, …})', note: 'The fetch engine + interceptor pipeline. Reads baseUrl + the live api scenario.' },
  { name: 'PostRemoteDataSource', impl: 'FakeApiService | JsonPlaceholderPostRemoteDataSource', note: 'SWAPPABLE seam. Dev = FakeApiService (canned); live = real http-backed source. Flipped by setUseFakeApi.' },
  { name: 'AppDatabase', impl: 'FakeAppDatabase | AppDatabaseImpl', note: 'SWAPPABLE seam. Dev = in-memory fake; prod = AsyncStorage behind a DAO.' },
  { name: 'PostRepository', impl: 'new PostRepositoryImpl(remote, local, logger)', note: 'The orchestrator. Depends on the two source ABSTRACTIONS, never their impls — which is exactly why they are swappable.' },
  { name: 'GetPostsUseCase', impl: 'new GetPostsUseCase(repository)', note: 'The top of the graph. Screens resolve this one object; it owns the repository.' },
];

/* ------------------------------------------------------------------ */
/* 4. LIVE registration graph — resolve every accessor                 */
/* ------------------------------------------------------------------ */

function LiveGraphCard() {
  const { tick, graph, reResolve } = useLiveGraphDemo();

  return (
    <Section
      title="LIVE — the resolved registration graph"
      explanation="This is the REAL container, resolved right now. Each row calls the actual accessor (container.logger, container.getPostsUseCase, …) and prints the concrete class that came back. Re-resolve after toggling the source below — you'll watch PostRemoteDataSource swap class."
    >
      <Box gap="xs">
        {graph.map((row) => (
          <Box key={row.name} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                {row.name}
              </Text>
              <Pill tone="primary">{row.cls}</Pill>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs" style={{ fontFamily: 'monospace' }}>
              {row.source}
            </Text>
          </Box>
        ))}
        <Box row gap="xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button title="re-resolve" variant="outline" onPress={reResolve} />
          <Text variant="caption" tone="muted">
            resolve pass #{tick + 1}
          </Text>
        </Box>
        <Text variant="caption" tone="muted">
          The graph is built once at startup (eager singletons) and resolves the
          SAME instance each time — that is the singleton lifecycle. The toggle
          below rebuilds the remote → repository → use-case slice live.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Lifecycle — singleton vs transient                               */
/* ------------------------------------------------------------------ */

function LifecycleCard() {
  return (
    <Section
      title="Lifecycle — singleton today, transient when it matters"
      explanation="Every registration here is an eager singleton: one instance shared app-wide. That's the right default for stateless services (http client, repository, use case). Transient (a new instance per resolve) is reserved for stateful, short-lived objects."
    >
      <Box gap="xs">
        {LIFECYCLE_ROWS.map((r) => (
          <Box key={r.mode} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.mode}
              </Text>
              <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                {r.cite}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.note}
            </Text>
          </Box>
        ))}
        <Code>{`// core/container.ts — singleton via the registry map:
private readonly registry = new Map<symbol, unknown>();
private register(name: string, instance: unknown) {
  this.registry.set(key(name), instance);   // overwrite = replace singleton
}
private resolve(name: string): unknown {
  const instance = this.registry.get(key(name));
  if (instance === undefined) throw new Error(\`Dependency "\${name}" is not registered\`);
  return instance;
}`}</Code>
        <Text variant="caption" tone="muted">
          The registry keys on a{' '}
          <Text style={{ fontFamily: 'monospace' }}>Symbol</Text> so names never
          collide with prototype properties. Re-registering the same name (as{' '}
          <Text style={{ fontFamily: 'monospace' }}>setUseFakeApi</Text> does)
          swaps the singleton in place — consumers that resolve afresh pick up the
          new impl.
        </Text>
      </Box>
    </Section>
  );
}

const LIFECYCLE_ROWS: ReadonlyArray<{ mode: string; cite: string; note: string }> = [
  { mode: 'Singleton (this app)', cite: 'register() once', note: 'HttpClient, Logger, repository, use case — all stateless or statefully-shared. One instance for the app lifetime. Cheapest; the default.' },
  { mode: 'Transient', cite: '(not used here)', note: 'A fresh instance per resolve. Used when an object holds per-call mutable state (a per-screen form controller, a unit-of-work). A real locator adds registerFactory(() => new X()).' },
  { mode: 'Scoped', cite: '(e.g. per-session)', note: 'In a navigator-scoped graph you might scope an auth-context repository to a logged-in user. Overkill for this app; mentioned so the vocabulary is complete.' },
];

/* ------------------------------------------------------------------ */
/* 6. LIVE toggle — swap impl behind the same use case                 */
/* ------------------------------------------------------------------ */

function LiveToggleCard() {
  const { state, fetch, useFake, toggle } = useLiveToggleDemo();

  return (
    <Section
      title="LIVE — swap the impl behind the same use case"
      explanation="The seam in action. Tap toggle: the SAME container.getPostsUseCase now resolves to a different remote data source (FakeApi ↔ live jsonplaceholder), and usePosts re-fetches through it. Nothing in the hook, use case, or repository changes — that is the whole point of depending on an abstraction."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill tone="primary">
            source: {useFake ? 'FakeApiService (canned)' : 'JsonPlaceholderPostRemoteDataSource (live)'}
          </Pill>
          <Button title="toggle source" variant="filled" onPress={toggle} />
          <Button title="refetch" variant="ghost" onPress={fetch} />
        </Box>

        <ToggleBody state={state} />

        <Code>{`// core/container.ts — swapping rebuilds the affected slice:
setUseFakeApi(useFakeApi: boolean) {
  if (this.useFakeApi === useFakeApi) return;
  this.useFakeApi = useFakeApi;
  this.register('PostRemoteDataSource', this.createPostRemoteDataSource());
  this.register('PostRepository',       this.createPostRepository());
  this.register('GetPostsUseCase',      this.createGetPostsUseCase());
}
// createPostRemoteDataSource() returns FakeApiService OR the http-backed source.
// PostRepositoryImpl is constructed against the abstraction either way — it
// never knows which impl it got.`}</Code>
        <Text variant="caption" tone="muted">
          The fake source returns canned data after a short delay; the live source
          issues a real fetch through the http client (whose failure-injection
          interceptor still honours the api scenario). In a test, you'd register a
          fully scripted fake the same way — this is the exact seam tests exploit.
        </Text>
      </Box>
    </Section>
  );
}

function ToggleBody({ state }: { state: ReturnType<typeof usePosts>['state'] }) {
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <Box p="sm" radius="sm" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          resolving getPostsUseCase → repository → remote …
        </Text>
      </Box>
    );
  }
  if (state.status === 'error') {
    return (
      <Box p="sm" radius="sm" bg="surfaceVariant">
        <Text variant="small" tone="danger">
          {state.failure.kind}: {state.failure.message}
        </Text>
        <Text variant="caption" tone="muted" mt="xxs">
          (the live source can fail for real reasons — that itself proves you hit a
          different impl. Toggle back to FakeApi for a deterministic result.)
        </Text>
      </Box>
    );
  }
  return (
    <Box gap="xs">
      <Pill tone="primary">{`${state.posts.length} posts resolved`}</Pill>
      {state.posts.slice(0, 2).map((p) => (
        <Box key={p.id} p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            #{p.id} {p.title}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Resolve inspector + scenario knobs                               */
/* ------------------------------------------------------------------ */

function ResolveInspectorCard() {
  const { entry, setEntry, api, db, applyApi, applyDb } = useResolveInspectorDemo(GRAPH_ROWS);

  return (
    <Section
      title="Resolve inspector + dev scenario knobs"
      explanation="Pick a registered name and see its resolved class live. The scenario knobs below are the same mutable holder the container threads into the http client and the fakes — flipping them here changes how the NEXT resolve behaves."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {GRAPH_ROWS.map((r) => (
            <Button
              key={r.name}
              title={r.name}
              variant={entry === r.name ? 'filled' : 'outline'}
              onPress={() => setEntry(r.name)}
            />
          ))}
        </Box>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <ResolveResult name={entry} />
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            DEV SCENARIO KNOBS (threaded through the container)
          </Text>
          <Box row gap="xs" mt="xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Text variant="caption" tone="muted">
              api:
            </Text>
            {scenarioButtons(ApiScenario, api, applyApi)}
            <Pill tone="primary">{api}</Pill>
          </Box>
          <Box row gap="xs" mt="xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Text variant="caption" tone="muted">
              db:
            </Text>
            {scenarioButtons(DbScenario, db, applyDb)}
            <Pill tone="primary">{db}</Pill>
          </Box>
        </Box>
        <Code>{`// how a screen resolves — the only line of DI in a view file:
const getPostsUseCase = container.getPostsUseCase;   // abstraction, not impl
// the scenario knobs are mutated from dev screens, not from production code:
container.setApiScenario(ApiScenario.NetworkError);  // → next fetch fails`}</Code>
      </Box>
    </Section>
  );
}

/** Render a button per scenario value of a const object. */
function scenarioButtons<T extends string>(
  obj: Readonly<Record<string, T>>,
  active: T,
  onPick: (v: T) => void,
) {
  return (Object.values(obj) as readonly T[]).map((v) => (
    <Button
      key={v}
      title={v}
      variant={active === v ? 'filled' : 'ghost'}
      onPress={() => onPick(v)}
    />
  ));
}

function ResolveResult({ name }: { name: string }) {
  const resolved = resolveClassName(name);
  return (
    <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Text variant="small" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
        container.{accessorFor(name)}
      </Text>
      <Text variant="small" tone="muted">
        →
      </Text>
      <Pill tone="primary">{resolved}</Pill>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Comparison — locator vs alternatives                             */
/* ------------------------------------------------------------------ */

function ComparisonCard() {
  return (
    <Section
      title="Why a hand-rolled locator — vs the alternatives"
      explanation="Neither React nor RN ships a standard DI container. Three realistic options exist; this app picked the one with the least magic and the most debuggability for a teaching artifact."
    >
      <Box gap="xs">
        {COMPARISON_ROWS.map((r) => (
          <Box key={r.option} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.option}
              </Text>
              {r.thisApp ? <Pill tone="primary">this app</Pill> : null}
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.note}
            </Text>
          </Box>
        ))}
        <Text variant="caption" tone="muted">
          A note on React Context: it IS a service-locator of sorts (consumers
          resolve via <Text style={{ fontFamily: 'monospace' }}>useContext</Text>),
          and for stateful, reactive values that should re-render consumers on
          change (the theme, a session) it is the right tool — this app's{' '}
          <Text style={{ fontFamily: 'monospace' }}>ThemeProvider</Text> uses it.
          But for stateless construction wiring (a use case, a repository), Context
          adds re-render semantics you do not want; a plain locator is simpler and
          resolves without touching the React tree.
        </Text>
      </Box>
    </Section>
  );
}

const COMPARISON_ROWS: ReadonlyArray<{ option: string; note: string; thisApp?: boolean }> = [
  {
    option: 'Hand-rolled service locator',
    thisApp: true,
    note: 'One Map<symbol, unknown>, named accessors, eager singletons. Zero deps, zero codegen, trivially readable. Mirrors the sibling React guide + Flutter get_it. Trade-off: no auto-wiring — you write each createX() by hand.',
  },
  {
    option: 'Constructor injection (no container)',
    note: 'Pass deps through props / constructor params. Purest form of DI; great for leaf components and tests. At the app root you still need SOMETHING to construct the graph — which is exactly what container.initialize is.',
  },
  {
    option: 'React Context',
    note: 'A provider tree + useContext. Good for REACTIVE state (theme, auth). Awkward for a large stateless service graph: every consumer re-renders on any context change, and the wiring is scattered across providers. Not used here for services.',
  },
  {
    option: 'getIt / inversify / tsyringe',
    note: 'Battle-tested libraries. inversify adds decorator metadata (needs emitDecorators); getIt is a locator much like this one; tsyringe is TS-native. Justified in large apps; overkill for a teaching graph this size and adds a dependency the architecture does not need.',
  },
];

/* ------------------------------------------------------------------ */
/* 9. Recap                                                            */
/* ------------------------------------------------------------------ */

function RecapCard() {
  return (
    <Section
      title="Recap — the wiring story in one breath"
      explanation="Four invariants. They are why DI in this app looks the way it does."
    >
      <Box gap="xs">
        {RECAP_ROWS.map((r, i) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
            <Text variant="small" tone="primary" style={{ fontWeight: '700' }}>
              {i + 1}.
            </Text>
            <Box flex={1}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.title}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.body}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

const RECAP_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Depend on abstractions, resolve via the container',
    body: 'Screens import a use case accessor (container.getPostsUseCase), not a concrete impl. The container binds interface → impl; the impl is swappable.',
  },
  {
    title: 'Wiring is centralized and explicit',
    body: 'One bootstrap call (container.initialize in _layout.tsx) builds the whole graph in order. No decorator metadata, no codegen, no scattered providers — read createX() top-to-bottom.',
  },
  {
    title: 'Swappable seams are tested by the dev knobs',
    body: 'setUseFakeApi rebuilds the remote → repository → use-case slice at runtime. The same use case works against either impl — proof the abstraction holds.',
  },
  {
    title: 'ui stays decoupled from data internals',
    body: 'A screen never imports a DTO, a DAO, the http client, or a repository impl. It resolves a use case and consumes Result<T>. That is the layering invariant, enforced by convention.',
  },
];
