import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Card, Text } from '../../design-system';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import { Section, Code, Pill } from '../../components';
import {
  useInvariantExplorer,
  useLayerExplorer,
  useLiveTrace,
  isAllowed,
  LAYER_NAMES,
  type LayerName,
  type FolderNode,
} from './architecture_hooks';

/**
 * ArchitectureView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (architecture_hooks.ts); this file only renders.
 *
 * A teaching artifact for THIS app's layering and the clean-architecture
 * mapping to React Native. Source of truth: ARCHITECTURE.md. Grounded in the
 * real folder structure under src/{domain,data,core,ui} + app/.
 *
 * Single-file helpers stay local per convention. No `any`; strict + erasure-clean.
 */
export function ArchitectureView() {
  return (
    <ScreenScaffold
      title="Architecture"
      subtitle="Layering, the inward-dependency invariant, and one request through every layer."
    >
      <IntroCard />
      <DiagramCard />
      <InvariantCard />
      <CleanArchMappingCard />
      <LayerExplorerCard />
      <LiveTraceCard />
      <ResultBoundaryCard />
      <SiblingGuidesCard />
      <RecapCard />
    </ScreenScaffold>
  );
}
function IntroCard() {
  return (
    <Section title="How this app is layered">
      <Text variant="body">
        This app is a small, production-shaped React Native app whose own
        codebase is the lesson. The spine is a{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          layering
        </Text>{' '}
        with one rule, repeated everywhere: dependencies point{' '}
        <Text style={{ fontStyle: 'italic' }}>inward</Text>. The domain knows
        nothing of the world; the world arranges itself to serve the domain.
      </Text>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          <Text style={{ fontWeight: '600' }}>Four layers, one direction.</Text>{' '}
          <Text style={{ fontFamily: 'monospace' }}>domain</Text> (pure) ←{' '}
          <Text style={{ fontFamily: 'monospace' }}>data</Text> (implements
          domain contracts) ← <Text style={{ fontFamily: 'monospace' }}>core</Text>{' '}
          (cross-cutting infra) and{' '}
          <Text style={{ fontFamily: 'monospace' }}>ui</Text> (presentation, reads
          domain + core, reaches data only through the container). A view never
          imports a DTO, a DAO, or the http client.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The diagram                                                      */
/* ------------------------------------------------------------------ */

function DiagramCard() {
  return (
    <Section
      title="The layering — ASCII map of the real folders"
      explanation="Read each layer's contents from the actual src/ tree. The arrow on the left is the whole rule: inward only."
    >
      <Box gap="sm">
        <Code>{`        ┌──────────────────────────────────────────────────────┐
        │  ui/            presentation. Reads domain + core.      │
        │    screens/ components/ hooks/ navigation/ design-system│
        └──────────────────────────────────────────────────────┘
          │  resolves use cases via the container (never data/*)
          ▼
        ┌──────────────────────────────────────────────────────┐
        │  core/         cross-cutting infra shared by everyone │
        │    result  error-handling  container  config  scenario│
        └──────────────────────────────────────────────────────┘
          │  result.ts is the ONLY thing domain imports
          ▼
        ┌──────────────────────────────────────────────────────┐
        │  data/         implements the domain contracts. I/O.  │
        │    remote/  local/  repositories/  fake/              │
        └──────────────────────────────────────────────────────┘
          │  depends on domain interfaces (the seam)
          ▼
        ┌──────────────────────────────────────────────────────┐
        │  domain/       pure business models + contracts.      │
        │    models/  repositories/  usecases/                  │
        └──────────────────────────────────────────────────────┘
          (depends on nothing but core/result — no React, no fetch, no storage)

   app/  ← Expo Router entry. File-based routes; bootstrap in _layout.tsx.`}</Code>
        <Text variant="caption" tone="muted">
          Two arrows that look backward but aren't: data → domain (data{' '}
          <Text style={{ fontStyle: 'italic' }}>implements</Text> the domain's
          repository interfaces — that's the dependency-inversion that lets the
          domain stay pure), and core sits beside both as shared infrastructure.
          The invariant is: nothing in an inner ring is imported by something that
          only an outer ring should own.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. The invariant — dependency-direction validator                   */
/* ------------------------------------------------------------------ */

function InvariantCard() {
  const { row, setRow } = useInvariantExplorer();
  return (
    <Section
      title="The invariant — who may import what"
      explanation="Tap a row to see its allowed imports. Green = may import; red = forbidden by the layering. This is the rule ARCHITECTURE.md encodes; the only dynamic cast hotspot is Expo Router's Href in the hub."
    >
      <Box gap="xs">
        {LAYER_NAMES.map((l) => (
          <Button
            key={l}
            title={l}
            variant={row === l ? 'filled' : 'outline'}
            onPress={() => setRow(l)}
          />
        ))}
      </Box>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" style={{ fontWeight: '600' }}>
          {row}/ may import:
        </Text>
        <Box gap="xs" mt="xs">
          {IMPORT_MATRIX.map((m) => {
            const allowed = isAllowed(row, m.target);
            return (
              <Box key={m.target} row gap="sm" style={{ alignItems: 'center' }}>
                <Pill tone={allowed ? 'success' : 'danger'}>
                  {allowed ? '✓ may' : '✗ never'}
                </Pill>
                <Text variant="small" style={{ fontFamily: 'monospace' }}>
                  {m.target}
                </Text>
                <Text variant="caption" tone="muted" style={{ flexShrink: 1 }}>
                  {m.note}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>
      <Text variant="caption" tone="muted">
        The one pragmatic exception: the hub's{' '}
        <Text style={{ fontFamily: 'monospace' }}>router.push(path as never)</Text>{' '}
        cast. Expo Router's <Text style={{ fontFamily: 'monospace' }}>Href</Text>{' '}
        type is generated from the file tree, so a data-driven route table cannot
        satisfy it without a generated manifest. It is annotated as such and is the
        ONLY such cast — flagged in ARCHITECTURE.md.
      </Text>
    </Section>
  );
}

const IMPORT_MATRIX: ReadonlyArray<{ target: string; note: string }> = [
  { target: 'core/result', note: 'the Result<T> return type' },
  { target: 'core/error-handling', note: 'Failure (domain/presentation errors)' },
  { target: 'domain/*', note: 'models, repository interfaces, use cases' },
  { target: 'data/* internals', note: 'DTOs, DAOs, http client, remote/local sources' },
  { target: 'react / react-native', note: 'the framework' },
  { target: 'container (resolve)', note: 'the service locator' },
];

/* ------------------------------------------------------------------ */
/* 4. Clean-architecture mapping                                       */
/* ------------------------------------------------------------------ */

function CleanArchMappingCard() {
  return (
    <Section
      title="Clean architecture → this React Native app"
      explanation="The classic entities/use-cases/adapters/framework rings, mapped to the real files. RN's standard (Expo Router, fetch, AsyncStorage) fills the framework ring; nothing leaks inward past it."
    >
      <Box gap="xs">
        {MAPPING_ROWS.map((r) => (
          <Box key={r.ring} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.ring}
              </Text>
              <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                {r.files}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.note}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

const MAPPING_ROWS: ReadonlyArray<{ ring: string; files: string; note: string }> = [
  { ring: 'Entities', files: 'domain/models/Post', note: 'Pure business objects. No framework, no I/O. The most stable thing in the codebase.' },
  { ring: 'Use cases', files: 'domain/usecases/GetPostsUseCase', note: 'Application-specific rules. Thin today; the seam where combining repos / caching policy / business rules lives.' },
  { ring: 'Interface adapters', files: 'repositories/PostRepositoryImpl, remote/dtos, local/daos', note: 'Convert data between the layers the framework understands (JSON, fetch) and the layers the domain understands (Post).' },
  { ring: 'Framework & drivers', files: 'remote/http-client, local/AppDatabase, ui/screens, app/_layout', note: 'The machinery: fetch, AsyncStorage, Expo Router, React. The outermost, most swap-able ring.' },
];

/* ------------------------------------------------------------------ */
/* 5. Interactive layer explorer                                       */
/* ------------------------------------------------------------------ */

const LAYER_TREE: ReadonlyArray<{ layer: string; nodes: ReadonlyArray<FolderNode> }> = [
  {
    layer: 'domain/',
    nodes: [
      {
        folder: 'models/',
        responsibility: 'Pure value objects (no I/O).',
        files: [{ name: 'post.ts', role: 'Post: { id, title, body }. Knows nothing of JSON/storage.' }],
      },
      {
        folder: 'repositories/',
        responsibility: 'The contracts data implements.',
        files: [{ name: 'post-repository.ts', role: 'PostRepository interface — getPosts(): Promise<Result<Post[]>>.' }],
      },
      {
        folder: 'usecases/',
        responsibility: 'Application logic over repositories.',
        files: [{ name: 'get-posts-usecase.ts', role: 'Thin orchestrator; the seam for policy/caching.' }],
      },
    ],
  },
  {
    layer: 'data/',
    nodes: [
      {
        folder: 'remote/',
        responsibility: 'HTTP engine + DTOs + remote sources.',
        files: [
          { name: 'http-client.ts', role: 'fetch + interceptor pipeline (auth, retry, failure-injection).' },
          { name: 'post-remote-data-source.ts', role: 'Calls the API, returns PostDTO[] via guardedApiCall.' },
          { name: 'dtos/post-dto.ts', role: 'Wire shape + postDtoFromJson/toPost validation.' },
        ],
      },
      {
        folder: 'local/',
        responsibility: 'AsyncStorage behind a DAO.',
        files: [
          { name: 'app-database.ts', role: 'Abstract AppDatabase + AppDatabaseImpl (owns PostDao).' },
          { name: 'daos/post-dao.ts', role: 'CRUD + (de)serialize; throws typed AppDatabaseException.' },
        ],
      },
      {
        folder: 'repositories/',
        responsibility: 'Implements the domain contract; orchestrates sources.',
        files: [{ name: 'post-repository-impl.ts', role: 'Offline-first: remote → cache; fallback serveFromCache.' }],
      },
      {
        folder: 'fake/',
        responsibility: 'Dev/test stand-ins.',
        files: [
          { name: 'fake-api-service.ts', role: 'Canned remote data; scenario-driven failures.' },
          { name: 'fake-app-database.ts', role: 'In-memory cache; scenario-driven failures.' },
        ],
      },
    ],
  },
  {
    layer: 'core/',
    nodes: [
      {
        folder: 'error-handling/',
        responsibility: 'The two-stage pipeline (see the Exception Handling screen).',
        files: [
          { name: 'exceptions.ts', role: 'AppException — data-layer, technical.' },
          { name: 'failures.ts', role: 'Failure — domain/presentation, semantic.' },
          { name: 'guards.ts', role: 'mapExceptionToFailure + safeRepositoryCall.' },
        ],
      },
      {
        folder: 'config/',
        responsibility: 'AppConfig from Expo env + Logger.',
        files: [
          { name: 'app-config.ts', role: 'Environment + flags (const-object + literal union).' },
          { name: 'index.ts', role: 'createAppConfig from expo-constants extra.' },
        ],
      },
      {
        folder: '',
        responsibility: 'Result + the service locator + scenario knobs.',
        files: [
          { name: 'result.ts', role: 'Result<T> = Success<T,warning?> | Failed.' },
          { name: 'container.ts', role: 'The hand-rolled DI registry (see Dependency Management).' },
          { name: 'scenario/*', role: 'ApiScenario / DbScenario dev knobs.' },
        ],
      },
    ],
  },
  {
    layer: 'ui/',
    nodes: [
      {
        folder: 'screens/ + components/',
        responsibility: 'Presentation. Reads domain + core only.',
        files: [{ name: '*-screen.tsx', role: 'Topic screens; resolve use cases via the container.' }],
      },
      {
        folder: 'hooks/',
        responsibility: 'useReducer state machines; container resolution.',
        files: [{ name: 'use-posts.ts', role: 'idle/loading/loaded(warning?)/error(failure) state machine.' }],
      },
      {
        folder: 'design-system/',
        responsibility: 'Tokens → ThemeProvider → primitives.',
        files: [{ name: 'tokens.ts + components/*', role: 'Text/Box/Button/Card + theme context.' }],
      },
      {
        folder: 'navigation/',
        responsibility: 'Route metadata SSOT.',
        files: [{ name: 'routes.ts', role: 'RoutePaths + ROUTES (hub/drawer consume).' }],
      },
    ],
  },
];

function LayerExplorerCard() {
  const { openLayer, openFolder, setOpenFolder, pickLayer, layer, folder } =
    useLayerExplorer(LAYER_TREE);

  return (
    <Section
      title="Interactive layer explorer — the real files"
      explanation="Tap a layer, then a folder, to read what each real file does. This is the whole src/ tree, annotated."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {LAYER_TREE.map((l) => (
            <Button
              key={l.layer}
              title={l.layer}
              variant={openLayer === l.layer ? 'filled' : 'outline'}
              onPress={() => pickLayer(l.layer)}
            />
          ))}
        </Box>
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {layer.nodes.map((n) => (
            <Button
              key={n.folder || '(root)'}
              title={n.folder || '(root)'}
              variant={openFolder === n.folder ? 'filled' : 'ghost'}
              onPress={() => setOpenFolder(n.folder)}
            />
          ))}
        </Box>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
            <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
              {openLayer}
              {folder.folder}
            </Text>
            <Pill>{`${folder.files.length} file${folder.files.length === 1 ? '' : 's'}`}</Pill>
          </Box>
          <Text variant="caption" tone="muted" mt="xxs">
            {folder.responsibility}
          </Text>
          <Box gap="xs" mt="sm">
            {folder.files.map((f) => (
              <Box key={f.name} p="sm" radius="sm" bg="background">
                <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                  {f.name}
                </Text>
                <Text variant="caption" tone="muted" mt="xxs">
                  {f.role}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. LIVE trace — one request through every layer                     */
/* ------------------------------------------------------------------ */

function LiveTraceCard() {
  const { state, fetch, log, busy, run } = useLiveTrace();

  return (
    <Section
      title="LIVE — trace one request through every layer"
      explanation="A real posts fetch through the real container + usePosts. Each state transition is annotated with the layer responsible. Watch the request flow ui → domain → data → core → back. Switch the scenario to trace an error path."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="success" variant="filled" onPress={() => run(ApiScenario.Success, DbScenario.Success)} />
          <Button title="offline → cache" variant="outline" onPress={() => run(ApiScenario.NetworkError, DbScenario.Success)} />
          <Button title="offline → empty" variant="outline" onPress={() => run(ApiScenario.NetworkError, DbScenario.Empty)} />
          <Button title="refetch" variant="ghost" onPress={fetch} />
        </Box>

        <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill tone={state.status === 'error' ? 'danger' : 'primary'}>
            state: {state.status}
          </Pill>
          {busy ? <Pill>tracing…</Pill> : null}
          {'posts' in state ? <Pill>{`${state.posts.length} posts`}</Pill> : null}
          {'warning' in state && state.warning ? (
            <Pill tone="danger">{`warning: ${state.warning.kind}`}</Pill>
          ) : null}
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          {log.length === 0 ? (
            <Text variant="caption" tone="muted">
              tap a scenario to start the trace…
            </Text>
          ) : (
            log.map((e) => (
              <Box key={e.id} row gap="sm" style={{ alignItems: 'baseline' }}>
                <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
                  {e.at}
                </Text>
                <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                  {e.layer}
                </Text>
                <Text variant="caption" style={{ flexShrink: 1 }}>
                  {e.event}
                </Text>
              </Box>
            ))
          )}
        </Box>

        <Code>{`// The path a single getPosts() takes (the trace above follows this):
usePosts()                                 // ui/hooks
  → GetPostsUseCase.execute()              // domain/usecases
    → PostRepository.getPosts()            // data/repositories (impl)
      → safeRepositoryCall({               // core/error-handling
          call: remote.getPosts(),         // data/remote → http-client → fetch
          onNetworkError: serveFromCache,  // data/local → DAO → AsyncStorage
        })
      → Result<Post[]>                     // core/result
    ← Result<Post[]>
  ← Result<Post[]>
← dispatch(loaded | error)                 // ui/hooks state machine`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Result<T> at the boundary + SSOT                                 */
/* ------------------------------------------------------------------ */

function ResultBoundaryCard() {
  return (
    <Section
      title="Why Result<T> at the boundary — and single source of truth"
      explanation="The domain boundary returns Result<T>, not throws. It forces every call site to acknowledge failure at the type level — no forgotten try/catch. And several things that could drift are kept as the single source of truth."
    >
      <Box gap="sm">
        <Code>{`// domain/repositories/post-repository.ts — the boundary contract:
interface PostRepository {
  getPosts(): Promise<Result<Post[]>>;   // ← Result, never throws
}
// core/result.ts:
type Result<T> = Success<T, warning?: Failure> | Failed;`}</Code>
        <Box gap="xs">
          {SSOT_ROWS.map((r) => (
            <Box key={r.thing} p="sm" radius="sm" bg="surfaceVariant">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text variant="small" style={{ fontWeight: '600' }}>
                  {r.thing}
                </Text>
                <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                  {r.where}
                </Text>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.note}
              </Text>
            </Box>
          ))}
        </Box>
        <Text variant="caption" tone="muted">
          Result over exceptions is a deliberate trade-off: exceptions still exist{' '}
          <Text style={{ fontStyle: 'italic' }}>inside</Text> data/ (typed
          AppExceptions), but they are converted to Result before crossing into the
          domain. The UI therefore has exactly two branches (loaded | error) and
          can never silently drop a failure.
        </Text>
      </Box>
    </Section>
  );
}

const SSOT_ROWS: ReadonlyArray<{ thing: string; where: string; note: string }> = [
  { thing: 'Result<T>', where: 'core/result.ts', note: 'One discriminated union for every fallible domain op. ok/!ok narrowing everywhere.' },
  { thing: 'Routes', where: 'ui/navigation/routes.ts', note: 'RoutePaths + ROUTES metadata drive the hub grid (and future drawer). One edit adds a screen.' },
  { thing: 'Theme tokens', where: 'design-system/tokens.ts', note: 'Spacing/radii/palette/typography consumed via StyleSheet + ThemeProvider. No magic numbers in screens.' },
  { thing: 'Environment', where: 'core/config/index.ts', note: 'AppConfig is built in one place from expo-constants; nothing reads process.env directly outside app.config.ts.' },
];

/* ------------------------------------------------------------------ */
/* 8. How this mirrors the sibling guides                              */
/* ------------------------------------------------------------------ */

function SiblingGuidesCard() {
  return (
    <Section
      title="How this mirrors the sibling guides"
      explanation="This RN guide is concept-for-concept parallel to the React (web) and Flutter guides. The layering, error pipeline, and DI are identical; only the framework-specific adapters differ."
    >
      <Box gap="xs">
        {SIBLING_ROWS.map((r) => (
          <Box key={r.concept} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {r.concept}
            </Text>
            <Box row gap="sm" mt="xxs" style={{ flexWrap: 'wrap' }}>
              <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                RN: {r.rn}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.vs}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

const SIBLING_ROWS: ReadonlyArray<{ concept: string; rn: string; vs: string }> = [
  { concept: 'HTTP engine', rn: 'fetch + interceptor pipeline', vs: 'Web guide: axios. Flutter guide: dio. Same two-stage error mapping; only the engine adapter differs.' },
  { concept: 'Local storage', rn: 'AsyncStorage behind a DAO', vs: 'Web: IndexedDB/Dexie. Flutter: sqflite. The DAO seam makes the engine swappable in all three.' },
  { concept: 'DI', rn: 'hand-rolled container', vs: 'Web: same hand-rolled container.ts. Flutter: get_it + injectable codegen. RN has no standard DI; the locator is the least-magic choice.' },
  { concept: 'Routing', rn: 'Expo Router (file-based) + routes.ts metadata', vs: 'Web: the route table IS the router. RN keeps the table for metadata SSOT while Expo Router owns resolution.' },
  { concept: 'Env', rn: 'app.config.ts + EXPO_PUBLIC_* + EAS', vs: 'Web: Vite import.meta.env per --mode. Flutter: --dart-define + --flavor.' },
];

/* ------------------------------------------------------------------ */
/* 9. Recap                                                            */
/* ------------------------------------------------------------------ */

function RecapCard() {
  return (
    <Section
      title="Recap — the architecture in one breath"
      explanation="Four invariants. They are why this codebase looks the way it does."
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
    title: 'Dependencies point inward',
    body: 'domain is pure; data implements its contracts; core is shared infra; ui resolves use cases via the container. A view never imports a DTO/DAO/http client.',
  },
  {
    title: 'Result<T> at the boundary',
    body: 'The domain never throws across its edge — it returns Result. Forces every call site to handle failure; the UI has exactly two branches.',
  },
  {
    title: 'Two-stage error pipeline',
    body: 'AppException (technical) → Failure (semantic) → Result. Severity drives presentation. See the Exception Handling screen for the mechanics.',
  },
  {
    title: 'One request crosses every layer',
    body: 'hook → usecase → repository → remote/local → Result → UI. The live trace above follows a real fetch through each. That round-trip IS the architecture.',
  },
];
