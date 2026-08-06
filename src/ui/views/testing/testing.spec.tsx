import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { TestingView } from './testing_view';

// The dumb view is wrapped in ScreenScaffold, which needs expo-router nav +
// SafeAreaProvider contexts. For this smoke test we only care that the view's
// own composition renders, so mock the scaffold to pass children through.
jest.mock('../../components/screen-scaffold', () => {
  const { View } = require('react-native');
  return {
    ScreenScaffold: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});
import {
  useTestExplorer,
  useDemoCounter,
  useLiveRntlPlayground,
  useAssertionVisualizer,
  checkMatcher,
  safeStringify,
  buildCounterAssertions,
  SPECS,
  ASSERTION_GROUPS,
} from './testing_hooks';

/**
 * Tests for the testing view's LOGIC (the co-located hooks + pure matcher/
 * stringify helpers) and a smoke render of the dumb view.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('useTestExplorer', () => {
  it('starts on the "all" filter with the button spec open', () => {
    const { result } = renderHook(() => useTestExplorer(), { wrapper });
    expect(result.current.filter).toBe('all');
    expect(result.current.visible).toHaveLength(SPECS.length);
    expect(result.current.open.file).toBe('ui/components/button.spec.tsx');
  });

  it('filters by layer', () => {
    const { result } = renderHook(() => useTestExplorer(), { wrapper });
    act(() => result.current.setFilter('ui'));
    expect(result.current.visible.every((s) => s.layer === 'ui')).toBe(true);
    expect(result.current.visible.length).toBeLessThan(SPECS.length);
  });

  it('switches the open file', () => {
    const { result } = renderHook(() => useTestExplorer(), { wrapper });
    act(() => result.current.setOpenFile('core/result.spec.ts'));
    expect(result.current.open.file).toBe('core/result.spec.ts');
  });
});

describe('useDemoCounter / useLiveRntlPlayground', () => {
  it('counts up and down', () => {
    const { result } = renderHook(() => useDemoCounter(), { wrapper });
    act(() => result.current.inc());
    act(() => result.current.inc());
    act(() => result.current.dec());
    expect(result.current.count).toBe(1);
  });

  it('builds assertion rows that pass while count >= 0 and fail below', () => {
    expect(buildCounterAssertions(0).every((r) => r.pass)).toBe(true);
    const neg = buildCounterAssertions(-1);
    const boundary = neg.find((r) => r.label.includes('boundary'))!;
    expect(boundary.pass).toBe(false);
  });

  it('useLiveRntlPlayground mirrors the counter into the assertion rows', () => {
    const { result } = renderHook(() => useLiveRntlPlayground(), { wrapper });
    act(() => result.current.inc());
    const label = result.current.checks.find((c) =>
      c.label.includes('count-text'),
    )!;
    expect(label.label).toContain("'1'");
  });
});

describe('useAssertionVisualizer', () => {
  it('exposes every matcher and computes pass/fail', () => {
    const { result } = renderHook(() => useAssertionVisualizer(), { wrapper });
    expect(ASSERTION_GROUPS.length).toBe(4);
    // toBe (idx 0) on two distinct success() objects → reference-inequal → fail
    expect(result.current.idx).toBe(0);
    expect(result.current.pass).toBe(false);
    act(() => result.current.setIdx(1)); // toEqual → deep-equal → pass
    expect(result.current.group.matcher).toBe('toEqual');
    expect(result.current.pass).toBe(true);
  });
});

describe('pure helpers', () => {
  it('checkMatcher handles each matcher', () => {
    expect(checkMatcher('toBe', 1, 1)).toBe(true);
    expect(checkMatcher('toBe', 1, 2)).toBe(false);
    expect(checkMatcher('toEqual', { a: 1 }, { a: 1 })).toBe(true);
    expect(checkMatcher('toBeInstanceOf', new Error(), Error)).toBe(true);
    expect(checkMatcher('toHaveLength', [1, 2, 3], 3)).toBe(true);
    expect(checkMatcher('toHaveLength', 'abc', 3)).toBe(true);
    expect(checkMatcher('toHaveLength', [1], 3)).toBe(false);
    expect(checkMatcher('unknown', 1, 1)).toBe(false);
  });

  it('safeStringify handles functions and throwables', () => {
    expect(safeStringify({ a: 1 })).toBe('{\n  "a": 1\n}');
    function namedFn() {
      return 0;
    }
    expect(safeStringify(namedFn)).toBe('namedFn');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(typeof safeStringify(cyclic)).toBe('string');
  });
});

describe('TestingView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<TestingView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
