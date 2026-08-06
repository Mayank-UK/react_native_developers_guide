import { Pressable, View } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Text } from '../../components';
import { useTheme } from '../../design-system';
import { Section, Code, Pill } from '../../components';
import {
  useTestExplorer,
  useDemoCounter,
  useLiveRntlPlayground,
  useAssertionVisualizer,
  safeStringify,
  SPEC_LAYERS,
  ASSERTION_GROUPS,
  type CheckRow,
} from './testing_hooks';

/**
 * TestingView — a dumb structure. All state/behaviour lives in the co-located
 * hooks (testing_hooks.ts); this file only renders.
 *
 * Teaches how testing is done in THIS React Native app, grounded in the real
 * Jest + React Native Testing Library setup (`jest.config.js`, `jest.setup.ts`,
 * `jest.mocks.ts`, `babel.config.js`) and the co-located `*.spec.ts` files
 * under src/. Source of truth: ARCHITECTURE.md "Testing posture". The NEW specs
 * it cites (`button.spec.tsx`, `use-posts.spec.tsx`) are real and run in
 * `npm test` — they double as live examples.
 *
 * Single-file helpers stay local per convention. No `any`; strict + erasure-clean.
 */
export function TestingView() {
  return (
    <ScreenScaffold
      title="Testing"
    >
      <IntroCard />
      <ToolingCard />
      <WhatWhereCard />
      <TestExplorerCard />
      <PatternsCard />
      <FakesMocksCard />
      <ResultErgonomicsCard />
      <LiveRntlPlaygroundCard />
      <AssertionVisualizerCard />
      <AsyncHooksCard />
      <CoverageCiCard />
      <RecapCard />
    </ScreenScaffold>
  );
}

function IntroCard() {
  return (
    <Section title="Testing React Native">
      <Text variant="body">
        React Native's standard test stack is{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          Jest
        </Text>{' '}
        +{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          React Native Testing Library
        </Text>{' '}
        (RNTL), wired through the <Text style={{ fontFamily: 'monospace' }}>jest-expo</Text> preset. This
        app uses exactly that, and every layer has at least one co-located{' '}
        <Text style={{ fontFamily: 'monospace' }}>*.spec.ts</Text> proving it
        works. This screen teaches testing by reading THOSE specs — not invented
        examples.
      </Text>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          <Text style={{ fontWeight: '600' }}>The posture.</Text> Test behaviour,
          not implementation. The domain layer is pure logic (fast, no mocks). The
          data layer is exercised against in-memory fakes. UI components are
          rendered with RNTL and queried the way a user sees them (by text, role,
          label) — never by reaching into component internals.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Tooling                                                          */
/* ------------------------------------------------------------------ */

const TOOLING_ROWS: ReadonlyArray<{ name: string; file: string; note: string }> = [
  {
    name: 'Jest',
    file: 'jest.config.js',
    note: 'The test runner. Discovers *.spec.ts files, provides describe/it/expect/jest.fn, runs in Node.',
  },
  {
    name: 'jest-expo preset',
    file: 'babel.config.js + jest.config.js',
    note: 'Configures Jest for RN: which babel preset, which node_modules to transform (RN ships untranspiled ESM), and the right test environment.',
  },
  {
    name: 'React Native Testing Library',
    file: '@testing-library/react-native',
    note: 'Renders components with a real React Native renderer (react-test-renderer under the hood) and gives you user-shaped queries: getByText, getByRole, fireEvent, waitFor, renderHook.',
  },
  {
    name: 'react-test-renderer',
    file: 'devDependency pinned 19.0.0',
    note: 'RNTL\'s rendering engine. Pinned to match Expo SDK 53\'s React pin (avoids a peer conflict — see Decision logs in agentic_development.md).',
  },
];

function ToolingCard() {
  return (
    <Section
      title="Tooling — the real config files"
      explanation="Three pieces. Jest runs the tests, jest-expo configures Jest for React Native (the RN/Jest/Babel tangle), and RNTL renders components the way RN does."
    >
      <Box gap="xs">
        {TOOLING_ROWS.map((r) => (
          <Box key={r.name} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.name}
              </Text>
              <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                {r.file}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.note}
            </Text>
          </Box>
        ))}
      </Box>
      <Code>{`// jest.config.js — the whole thing:
module.exports = {
  preset: 'jest-expo',                            // ← RN + Babel + transform setup
  setupFiles: ['<rootDir>/jest.mocks.ts'],        // native-module mocks (AsyncStorage)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],// per-test container reset
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)' +
      '|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|...)',
  ],
};

// package.json scripts:
//   "test": "jest"   |   "test:watch": "jest --watch"`}</Code>
      <Text variant="caption" tone="muted">
        The split between{' '}
        <Text style={{ fontFamily: 'monospace' }}>setupFiles</Text> (runs before the
        test framework, before the module graph) and{' '}
        <Text style={{ fontFamily: 'monospace' }}>setupFilesAfterEach</Text> (where{' '}
        <Text style={{ fontFamily: 'monospace' }}>beforeEach</Text> exists) is
        load-bearing: AsyncStorage must be mocked BEFORE any spec imports the
        container, while the container reset must happen BETWEEN specs. See{' '}
        <Text style={{ fontFamily: 'monospace' }}>jest.mocks.ts</Text> +{' '}
        <Text style={{ fontFamily: 'monospace' }}>jest.setup.ts</Text>.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. What to test where                                               */
/* ------------------------------------------------------------------ */

const LAYER_TEST_ROWS: ReadonlyArray<{
  layer: string;
  shape: string;
  spec: string;
  note: string;
}> = [
  {
    layer: 'domain/',
    shape: 'pure unit',
    spec: 'domain/usecases/get-posts-usecase.spec.ts',
    note: 'No framework, no I/O. The use case is given a tiny in-line fake repository (5 lines) and its Result return value is asserted. Instant, no mocks.',
  },
  {
    layer: 'data/',
    shape: 'fake-backed',
    spec: 'data/repositories/post-repository-impl.spec.ts',
    note: 'The repository is exercised against the real fakes (FakeApiService + FakeAppDatabase) to walk the whole offline-first matrix: success, stale-cache+warning, empty-cache failure, chained cache failure, defensive bucketing.',
  },
  {
    layer: 'core/',
    shape: 'unit',
    spec: 'core/result.spec.ts, error-handling/guards.spec.ts, config/config.spec.ts, container.spec.ts',
    note: 'Pure logic: Result constructors, the engine-error→Failure mapping, env parsing, and the DI registration graph + fake/live swapping.',
  },
  {
    layer: 'ui/',
    shape: 'component + hook (RNTL)',
    spec: 'ui/components/button.spec.tsx, ui/hooks/use-posts.spec.tsx',
    note: 'Rendered with RNTL. Components are queried by text/role (how the user sees them); hooks are driven via renderHook and their async state machine is awaited with waitFor.',
  },
];

function WhatWhereCard() {
  return (
    <Section
      title="What to test, where — by layer"
      explanation="Each layer gets a different test shape because each has different dependencies. Match the test to the layer."
    >
      <Box gap="xs">
        {LAYER_TEST_ROWS.map((r) => (
          <Box key={r.layer} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                {r.layer}
              </Text>
              <Pill>{r.shape}</Pill>
            </Box>
            <Text variant="caption" style={{ fontWeight: '600' }} mt="xxs">
              {r.spec}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.note}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Interactive test explorer — the REAL specs                       */
/* ------------------------------------------------------------------ */

function TestExplorerCard() {
  const { filter, setFilter, openFile, setOpenFile, visible, open } = useTestExplorer();

  return (
    <Section
      title="LIVE — test explorer (the real specs)"
      explanation="The actual *.spec.ts files in this repo, grouped by layer. Filter a layer, then tap a file to read its purpose + a real snippet. These are the tests npm test runs."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {SPEC_LAYERS.map((l) => (
            <Button
              key={l}
              title={l}
              variant={filter === l ? 'filled' : 'outline'}
              onPress={() => setFilter(l)}
            />
          ))}
          <Pill tone="primary">{`${visible.length} spec${visible.length === 1 ? '' : 's'}`}</Pill>
        </Box>

        <Box gap="xs">
          {visible.map((s) => (
            <Pressable
              key={s.file}
              onPress={() => setOpenFile(s.file)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Box
                p="sm"
                radius="sm"
                bg={openFile === s.file ? 'primary' : 'surfaceVariant'}
              >
                <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <Text
                    variant="caption"
                    tone="primary"
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: '600',
                      color: openFile === s.file ? '#fff' : undefined,
                    }}
                  >
                    {s.file}
                  </Text>
                  <Pill>{s.layer}</Pill>
                </Box>
              </Box>
            </Pressable>
          ))}
        </Box>

        <Box p="sm" radius="md" bg="background">
          <Text variant="small" style={{ fontWeight: '600' }}>
            {open.file}
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            {open.purpose}
          </Text>
          <Box mt="xs">
            <Code>{open.snippet}</Code>
          </Box>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Patterns                                                         */
/* ------------------------------------------------------------------ */

const PATTERN_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Arrange / Act / Assert',
    body: 'Every it() is three visual blocks: build the world, perform one action, assert the outcome. A spec that mixes all three reads as noise.',
  },
  {
    title: 'Behaviour, not implementation',
    body: 'Assert on the Result the repository returns, not on whether it called an internal helper. RNTL queries the rendered output (text/role) the user sees, never component.state or instance methods — those break on the next refactor for nothing.',
  },
  {
    title: 'Co-located *.spec.ts',
    body: 'Each spec sits next to the module it tests (result.spec.ts beside result.ts). Discovery is automatic; ownership is obvious; moving a module moves its tests.',
  },
  {
    title: 'One behaviour per test',
    body: 'A failing test name should explain what broke. "returns stale cache with a warning when remote fails" beats "repo works".',
  },
  {
    title: 'No shared mutable state between tests',
    body: 'jest.setup.ts re-initialises + disposes the container in beforeEach/afterEach so specs start from a clean DI graph. Fakes are constructed fresh per test.',
  },
];

function PatternsCard() {
  return (
    <Section
      title="Patterns — Arrange / Act / Assert, behaviour, co-location"
      explanation="The conventions every spec in this repo follows. They keep tests readable, deterministic, and about behaviour rather than implementation."
    >
      <Box gap="xs">
        {PATTERN_ROWS.map((p) => (
          <Box key={p.title} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {p.title}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {p.body}
            </Text>
          </Box>
        ))}
      </Box>
      <Code>{`// Arrange — set up the world (a fake repo, a canned scenario).
const remote = new FakeApiService(ApiScenario.Success);
const local = new FakeAppDatabase(DbScenario.Success);
const repo = new PostRepositoryImpl(remote, local, logger);

// Act — the single behaviour under test.
const result = await repo.getPosts();

// Assert — on the OBSERVABLE outcome (the Result), not inner state.
expect(result.ok).toBe(true);
if (result.ok) expect(result.value).toHaveLength(3);`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Fakes vs mocks                                                   */
/* ------------------------------------------------------------------ */

function FakesMocksCard() {
  return (
    <Section
      title="Fakes vs mocks — this app uses fakes"
      explanation="The app ships real in-memory fakes under data/fake/. Tests (and dev builds) drive the same repository against them instead of stubbing methods with jest.fn — closer to production behaviour and far less brittle."
    >
      <Box gap="xs">
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
            data/fake/
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            <Text style={{ fontFamily: 'monospace' }}>fake-api-service.ts</Text> —
            canned PostDTO[] after a small delay, throws typed AppExceptions per
            ApiScenario.{'\n'}
            <Text style={{ fontFamily: 'monospace' }}>fake-app-database.ts</Text> —
            in-memory cache, scenario-driven read/write failures.
          </Text>
        </Box>
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Fake (preferred here)
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            A real, lightweight implementation of the interface that returns
            deterministic data. The repository test exercises the SAME code path as
            production, just with a swappable source.
          </Text>
        </Box>
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Mock (jest.fn / spyOn)
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            Stubs a single method to return/throw a fixed value. Reserved for the
            one case a fake can't reach — e.g. the defensive-bucketing test uses{' '}
            <Text style={{ fontFamily: 'monospace' }}>jest.spyOn(remote, 'getPosts').mockRejectedValueOnce(new TypeError(...))</Text>{' '}
            to bypass guardedApiCall and prove safeRepositoryCall buckets raw throws
            as UnknownFailure.
          </Text>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Result<T> makes failure ergonomic                                */
/* ------------------------------------------------------------------ */

function ResultErgonomicsCard() {
  return (
    <Section
      title="Why Result<T> makes failure-case testing pleasant"
      explanation="Because the domain boundary never throws, a failure path is just another value you can assert against — no try/catch gymnastics, no toRejects."
    >
      <Code>{`// A failure is a value, not an exception. Assert it like any other.
container.setApiScenario(ApiScenario.ServerError);
container.setDbScenario(DbScenario.Empty);          // nothing to fall back to

await waitFor(() => expect(result.current.state.status).toBe('error'));
if (result.current.state.status === 'error') {
  expect(result.current.state.failure.severity)
    .toBe(FailureSeverity.Critical);
}

// The offline-first warning is ALSO a value (Success carrying a warning):
if (result.current.state.status === 'loaded') {
  expect(result.current.state.warning).toBeInstanceOf(NetworkFailure);
}`}</Code>
      <Text variant="caption" tone="muted">
        Two branches in the UI (loaded | error), one optional warning field. Every
        fallible call site is forced to acknowledge failure at the type level by the{' '}
        <Text style={{ fontFamily: 'monospace' }}>if (result.ok)</Text> narrowing —
        there is no forgotten try/catch. The test mirrors that exactly.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. LIVE — RNTL playground                                           */
/* ------------------------------------------------------------------ */

function AssertionRow({ c }: { c: CheckRow }) {
  return (
    <Box key={c.label} row gap="sm" style={{ alignItems: 'flex-start' }}>
      <Pill tone={c.pass ? 'success' : 'danger'}>
        {c.pass ? 'PASS' : 'FAIL'}
      </Pill>
      <Box flex={1}>
        <Text variant="caption" style={{ fontFamily: 'monospace' }}>
          {c.label}
        </Text>
        <Text variant="caption" tone="muted">
          {c.detail}
        </Text>
      </Box>
    </Box>
  );
}

function DemoCounter() {
  const { count, inc, dec } = useDemoCounter();
  const { theme } = useTheme();
  return (
    <View
      style={{
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radii.md,
        padding: theme.spacing.md,
      }}
    >
      <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
        <Box>
          <Text variant="caption" tone="muted">
            Count
          </Text>
          <Text variant="h2" testID="count-text">
            {count}
          </Text>
        </Box>
        <Box row gap="xs">
          <Button title="−" onPress={dec} />
          <Button title="+" onPress={inc} />
        </Box>
      </Box>
    </View>
  );
}

function LiveRntlPlaygroundCard() {
  const { checks } = useLiveRntlPlayground();

  return (
    <Section
      title="LIVE — RNTL playground: here's the component, here's the test"
      explanation="A real RNTL test renders a component, queries it the way a user sees it, fires events, and asserts. Below is a live component; press its buttons and watch the equivalent assertions re-evaluate. The 'assertion' rows are exactly what expect() checks in button.spec.tsx."
    >
      <Box gap="sm">
        <DemoCounter />

        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            What a test does to the above
          </Text>
          <Box gap="xs" mt="xs">
            {checks.map((c) => (
              <AssertionRow key={c.label} c={c} />
            ))}
          </Box>
        </Box>

        <Code>{`// src/ui/components/button.spec.tsx (excerpt):
render(
  <ThemeProvider>
    <Button title="+" onPress={fn} />
  </ThemeProvider>,
);
expect(screen.getByRole('button', { name: '+' })).toBeTruthy();
fireEvent.press(screen.getByRole('button', { name: '+' }));
expect(fn).toHaveBeenCalledTimes(1);

// Driving a counter and asserting the rendered text:
fireEvent.press(screen.getByText('+'));
expect(screen.getByTestId('count-text').props.children).toBe(1);`}</Code>

        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Text variant="caption" tone="muted" style={{ flexShrink: 1 }}>
            Tap the component above — the playground state is the component's own
            state, mirroring how RNTL leaves the rendering to the component and
            only observes + fires events.
          </Text>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Assertion visualizer                                             */
/* ------------------------------------------------------------------ */

function AssertionVisualizerCard() {
  const { idx, setIdx, group, pass } = useAssertionVisualizer();

  return (
    <Section
      title="LIVE — assertion visualizer"
      explanation="Pick a matcher to see when it passes vs fails. The same matchers appear across this repo's specs. The runner prints PASSED/FAILED per it()."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {ASSERTION_GROUPS.map((g, i) => (
            <Button
              key={g.name}
              title={g.matcher}
              variant={idx === i ? 'filled' : 'outline'}
              onPress={() => setIdx(i)}
            />
          ))}
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Box row gap="sm" style={{ alignItems: 'center' }}>
            <Pill tone={pass ? 'success' : 'danger'}>{pass ? 'PASSED' : 'FAILED'}</Pill>
            <Text variant="small" style={{ fontFamily: 'monospace' }}>
              expect(actual).{group.matcher}(expected)
            </Text>
          </Box>
          <Box gap="xxs" mt="xs">
            <Text variant="caption" tone="muted">
              actual:
            </Text>
            <Code>{safeStringify(group.actual)}</Code>
            <Text variant="caption" tone="muted" mt="xxs">
              expected:
            </Text>
            <Code>{safeStringify(group.expected)}</Code>
          </Box>
          <Text variant="caption" tone="muted" mt="xxs">
            {group.note}
          </Text>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 10. Async, hooks, timers                                            */
/* ------------------------------------------------------------------ */

const ASYNC_ROWS: ReadonlyArray<{ tool: string; where: string; body: string }> = [
  {
    tool: 'renderHook',
    where: '@testing-library/react-native',
    body: 'Mounts a hook in a test renderer and exposes result.current. The wrapper option provides context (ThemeProvider) the hook needs.',
  },
  {
    tool: 'waitFor',
    where: '@testing-library/react-native',
    body: 'Polls an assertion until it passes (or times out). The right tool for async state that settles after microtasks/timers — used for every usePosts branch.',
  },
  {
    tool: 'act',
    where: '@testing-library/react-native',
    body: 'Wraps an interaction that causes state updates (e.g. calling result.current.fetch() manually) so React flushes the update before the next assertion.',
  },
  {
    tool: 'jest.useFakeTimers',
    where: 'jest',
    body: 'For debounce/retry/setInterval code. Control the clock with advanceTimersByTime / runOnlyPendingTimers; restore with useRealTimers. No real-time waits in the suite.',
  },
];

function AsyncHooksCard() {
  return (
    <Section
      title="Async, hooks & timers"
      explanation="usePosts owns an async state machine; its spec shows the three tools you reach for whenever a hook does I/O."
    >
      <Box gap="xs">
        {ASYNC_ROWS.map((r) => (
          <Box key={r.tool} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                {r.tool}
              </Text>
              <Text variant="caption" tone="muted">
                {r.where}
              </Text>
            </Box>
            <Text variant="caption" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
      </Box>
      <Code>{`// renderHook + waitFor — the async hook pattern:
import { renderHook, waitFor } from '@testing-library/react-native';

const { result } = renderHook(() => usePosts(), { wrapper });

await waitFor(() => {
  expect(result.current.state.status).toBe('loaded');
});
if (result.current.state.status === 'loaded') {
  expect(result.current.state.posts).toHaveLength(3);
}

// Fake timers for debounce / retry / setInterval code:
jest.useFakeTimers();
jest.advanceTimersByTime(1000);   // or runOnlyPendingTimers()
jest.useRealTimers();             // restore at the end of the suite`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 11. Coverage / CI / watch                                           */
/* ------------------------------------------------------------------ */

const SCRIPT_ROWS: ReadonlyArray<{ cmd: string; use: string }> = [
  { cmd: 'npm test', use: 'jest — runs every *.spec.ts once. The CI command.' },
  { cmd: 'npm run test:watch', use: 'jest --watch — re-runs only specs affected by a change. Local dev loop.' },
  { cmd: 'npm run typecheck', use: 'tsc --noEmit — the type gate. Separate from tests; both run in CI.' },
];

function CoverageCiCard() {
  return (
    <Section
      title="Coverage, CI & watch mode"
      explanation="The npm scripts are intentionally minimal — Jest does the heavy lifting. Add --coverage when you want a report; run --watch locally while iterating."
    >
      <Box gap="xs">
        {SCRIPT_ROWS.map((s) => (
          <Box key={s.cmd} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
            <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
              {s.cmd}
            </Text>
            <Text variant="caption" style={{ flexShrink: 1 }}>
              {s.use}
            </Text>
          </Box>
        ))}
      </Box>
      <Code>{`# Run the whole suite (what CI does):
npm test

# Iterate on one file, re-running on change:
npm run test:watch

# Coverage report (Istanbul, shipped with Jest):
npx jest --coverage --coverageReporters=text

# Type-check the whole project (CI gate, separate from tests):
npx tsc --noEmit`}</Code>
      <Text variant="caption" tone="muted">
        CI tip: run <Text style={{ fontFamily: 'monospace' }}>npm test</Text> and{' '}
        <Text style={{ fontFamily: 'monospace' }}>npx tsc --noEmit</Text> as separate
        gates. Tests don't catch type errors; the type checker doesn't catch logic
        bugs. You need both. Coverage is a guide (find untested branches), not a
        target — 100% with weak assertions is worth less than 70% with strong ones.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 12. Recap                                                           */
/* ------------------------------------------------------------------ */

const RECAP_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Jest + RNTL via jest-expo',
    body: 'The RN standard. jest-expo handles the RN/Babel/transform tangle; RNTL renders components and gives user-shaped queries.',
  },
  {
    title: 'Match the test to the layer',
    body: 'Pure unit for domain/core, fake-backed for data (the offline-first matrix), RNTL render+query for UI components and hooks.',
  },
  {
    title: 'Behaviour, not implementation',
    body: 'Assert the Result/value the user cares about. Query rendered output by text/role. Never reach into component internals.',
  },
  {
    title: 'Fakes over mocks',
    body: 'data/fake/* are real in-memory implementations. Tests drive the same repo code as production; jest.fn is reserved for the cases a fake cannot reach.',
  },
  {
    title: 'Result<T> makes failure a value',
    body: 'No try/catch gymnastics. The error path and the offline-first warning path are just branches you assert against — see use-posts.spec.tsx.',
  },
  {
    title: 'Tests AND types, in CI',
    body: 'npm test catches logic bugs; tsc --noEmit catches type bugs. Neither subsumes the other; both are gates. Coverage is a guide, not a target.',
  },
];

function RecapCard() {
  return (
    <Section
      title="Recap — testing in one breath"
      explanation="Six takeaways. They are why this app's specs look the way they do."
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

// Re-exported so the spec may reference the dataset without importing the view.
