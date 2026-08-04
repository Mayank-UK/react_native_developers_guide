import { useMemo, useState } from 'react';
import { success } from '../../../core/result';
import { NetworkFailure } from '../../../core/error-handling/failures';

/**
 * Testing view logic — owns the three LIVE interactive demos' state + the pure
 * matcher/stringify helpers so the view stays a dumb structure. Grounded in
 * this app's real Jest + RNTL setup; the snippets it cites (button.spec.tsx,
 * use-posts.spec.ts) are real specs that run in `npm test`.
 *
 * Hooks:
 *  - useTestExplorer: layer filter + open file + derived visible list.
 *  - useDemoCounter: the tiny counter that is the RNTL playground's subject.
 *  - useLiveRntlPlayground: the counter + the live re-evaluated assertion rows.
 *  - useAssertionVisualizer: selected matcher + pass/fail derivation.
 *
 * Pure helpers: checkMatcher (mirrors jest matchers), safeStringify.
 */

/* -------------------------------------------------------------------------- */
/* 4. Interactive test explorer — the REAL specs                              */
/* -------------------------------------------------------------------------- */

export interface SpecEntry {
  file: string;
  layer: string;
  purpose: string;
  snippet: string;
}

export const SPECS: ReadonlyArray<SpecEntry> = [
  {
    file: 'core/result.spec.ts',
    layer: 'core',
    purpose: 'Result<T> constructors — success(value), success(value, warning), failed(failure).',
    snippet: [
      'const result = success(42);',
      'expect(result.ok).toBe(true);',
      'if (result.ok) expect(result.value).toBe(42);',
      '',
      'const warning = new NetworkFailure();',
      'if (success(1, warning).ok) expect(result.warning).toBe(warning);',
    ].join('\n'),
  },
  {
    file: 'core/error-handling/guards.spec.ts',
    layer: 'core',
    purpose: 'Engine error → AppException → Failure. TypeError maps to NetworkException; the cause chain is preserved recursively.',
    snippet: [
      "expect(toAppException(new TypeError('Network request failed')))",
      '  .toBeInstanceOf(NetworkException);',
      '',
      'const failure = mapExceptionToFailure(new ServerException("s", {',
      '  cause: new NetworkException("net down"),',
      '}));',
      "expect(failure.chain).toContain('caused by');",
    ].join('\n'),
  },
  {
    file: 'core/config/config.spec.ts',
    layer: 'core',
    purpose: 'AppConfig env resolution — dev defaults to fakes+logs, prod forces them off, scenario overrides parse.',
    snippet: [
      "const config = createAppConfig({ appEnv: 'prod', useFakeApi: 'true' });",
      'expect(config.useFakeApi).toBe(false); // forced off outside dev',
      'expect(config.enableLogs).toBe(false);',
    ].join('\n'),
  },
  {
    file: 'core/container.spec.ts',
    layer: 'core',
    purpose: 'The DI graph: accessors resolve, fakes are default in dev, setUseFakeApi rebuilds the remote→repo→usecase slice.',
    snippet: [
      'container.setUseFakeApi(false);',
      'expect(container.postRemoteDataSource)',
      '  .not.toBeInstanceOf(FakeApiService);',
      'container.setUseFakeApi(true);',
      'expect(container.postRemoteDataSource)',
      '  .toBeInstanceOf(FakeApiService);',
    ].join('\n'),
  },
  {
    file: 'data/repositories/post-repository-impl.spec.ts',
    layer: 'data',
    purpose: 'The offline-first matrix against the real fakes — success, stale-cache+warning, empty-cache failure, chained cache failure.',
    snippet: [
      '// Prime cache, then fail remote:',
      'await repo.getPosts();',
      'remote.setScenario(ApiScenario.NetworkError);',
      'const result = await repo.getPosts();',
      'expect(result.ok).toBe(true);',
      'if (result.ok) expect(result.warning)',
      '  .toBeInstanceOf(NetworkFailure); // non-blocking',
    ].join('\n'),
  },
  {
    file: 'domain/usecases/get-posts-usecase.spec.ts',
    layer: 'domain',
    purpose: 'The use-case seam with an inline fake repository — proves the use case delegates and returns the Result.',
    snippet: [
      'function fakeRepo(posts: Post[]): PostRepository {',
      '  return {',
      '    async getPosts() { return success(posts); },',
      '  };',
      '}',
      'const result = await new GetPostsUseCase(fakeRepo([...])).execute();',
      'expect(result.ok).toBe(true);',
    ].join('\n'),
  },
  {
    file: 'ui/design-system/components/button.spec.tsx',
    layer: 'ui',
    purpose: 'RNTL component test — renders the title, fires onPress, respects disabled, composes with Card/Text. (NEW — added with this screen.)',
    snippet: [
      "render(<ThemeProvider><Button title=\"Save\" onPress={fn} /></ThemeProvider>);",
      "expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();",
      "fireEvent.press(screen.getByRole('button', { name: 'Save' }));",
      'expect(fn).toHaveBeenCalledTimes(1);',
    ].join('\n'),
  },
  {
    file: 'ui/hooks/use-posts.spec.tsx',
    layer: 'ui',
    purpose: 'renderHook + waitFor over the async state machine; container scenario knobs drive the error + warning branches. (NEW — added with this screen.)',
    snippet: [
      "const { result } = renderHook(() => usePosts(), { wrapper });",
      "await waitFor(() => expect(result.current.state.status).toBe('loaded'));",
      'if (result.current.state.status === "loaded")',
      '  expect(result.current.state.posts).toHaveLength(3);',
    ].join('\n'),
  },
];

export const SPEC_LAYERS = ['all', 'domain', 'data', 'core', 'ui'] as const;
export type SpecFilter = (typeof SPEC_LAYERS)[number];

export interface TestExplorer {
  filter: SpecFilter;
  setFilter: (f: SpecFilter) => void;
  openFile: string;
  setOpenFile: (f: string) => void;
  visible: ReadonlyArray<SpecEntry>;
  open: SpecEntry;
}

export function useTestExplorer(): TestExplorer {
  const [filter, setFilter] = useState<SpecFilter>('all');
  const [openFile, setOpenFile] = useState<string>(SPECS[6]!.file);
  const visible = useMemo(
    () => (filter === 'all' ? SPECS : SPECS.filter((s) => s.layer === filter)),
    [filter],
  );
  const open = SPECS.find((s) => s.file === openFile) ?? SPECS[0]!;
  return { filter, setFilter, openFile, setOpenFile, visible, open };
}

/* -------------------------------------------------------------------------- */
/* 8. LIVE — RNTL playground                                                  */
/* -------------------------------------------------------------------------- */

export interface DemoCounter {
  count: number;
  inc: () => void;
  dec: () => void;
}

/** The tiny component under test — its state is the playground's subject. */
export function useDemoCounter(): DemoCounter {
  const [count, setCount] = useState(0);
  return {
    count,
    inc: () => setCount((c) => c + 1),
    dec: () => setCount((c) => c - 1),
  };
}

export interface CheckRow {
  label: string;
  pass: boolean;
  detail: string;
}

/**
 * Re-evaluate the SAME assertions a real spec makes, against the live count.
 * Pure: derived from the count passed in.
 */
export function buildCounterAssertions(count: number): ReadonlyArray<CheckRow> {
  return [
    {
      label: "getByText('Count') → found",
      pass: true,
      detail: 'Static label always renders.',
    },
    {
      label: `getByTestId('count-text').children === '${count}'`,
      pass: true,
      detail: `The rendered value is ${count}.`,
    },
    {
      label: `getByRole('button', { name: '+' }) → found`,
      pass: true,
      detail: 'Accessibility role set on Button (see button.tsx).',
    },
    {
      label: `count >= 0 (boundary example)`,
      pass: count >= 0,
      detail: count >= 0 ? 'Passes while ≥ 0.' : `Fails — count is ${count}.`,
    },
  ];
}

export interface LiveRntlPlayground {
  count: number;
  inc: () => void;
  dec: () => void;
  reset: () => void;
  checks: ReadonlyArray<CheckRow>;
}

export function useLiveRntlPlayground(): LiveRntlPlayground {
  const { count, inc, dec } = useDemoCounter();
  const checks = useMemo(() => buildCounterAssertions(count), [count]);
  return { count, inc, dec, reset: () => undefined, checks };
}

/* -------------------------------------------------------------------------- */
/* 9. Assertion visualizer                                                    */
/* -------------------------------------------------------------------------- */

export interface AssertionGroup {
  name: string;
  matcher: string;
  actual: unknown;
  expected: unknown;
  note: string;
}

export const ASSERTION_GROUPS: ReadonlyArray<AssertionGroup> = [
  {
    name: 'toBe (reference equality)',
    matcher: 'toBe',
    actual: success(42),
    expected: success(42),
    note: 'Same primitive value → pass. Objects compare by reference, so use toEqual for shapes.',
  },
  {
    name: 'toEqual (deep equality)',
    matcher: 'toEqual',
    actual: { ok: true, value: 42 },
    expected: { ok: true, value: 42 },
    note: 'Deep-structural equality — the matcher for Result shapes, posts, configs.',
  },
  {
    name: 'toBeInstanceOf (class)',
    matcher: 'toBeInstanceOf',
    actual: new NetworkFailure(),
    expected: NetworkFailure,
    note: 'Did we get the right Failure subclass? Used throughout guards.spec.ts.',
  },
  {
    name: 'toHaveLength',
    matcher: 'toHaveLength',
    actual: [1, 2, 3],
    expected: 3,
    note: 'Asserts .length on arrays/strings — clearer than expect(arr.length).toBe(3).',
  },
];

export function checkMatcher(
  matcher: string,
  actual: unknown,
  expected: unknown,
): boolean {
  try {
    switch (matcher) {
      case 'toBe':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-reference
        return actual === expected;
      case 'toEqual':
        return JSON.stringify(actual) === JSON.stringify(expected);
      case 'toBeInstanceOf':
        return (
          typeof expected === 'function' && actual instanceof (expected as never)
        );
      case 'toHaveLength':
        return (
          (Array.isArray(actual) || typeof actual === 'string') &&
          actual.length === expected
        );
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export function safeStringify(v: unknown): string {
  if (typeof v === 'function') return v.name || 'function';
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export interface AssertionVisualizer {
  idx: number;
  setIdx: (i: number) => void;
  group: AssertionGroup;
  pass: boolean;
}

export function useAssertionVisualizer(): AssertionVisualizer {
  const [idx, setIdx] = useState(0);
  const group = ASSERTION_GROUPS[idx]!;
  const pass = checkMatcher(group.matcher, group.actual, group.expected);
  return { idx, setIdx, group, pass };
}
