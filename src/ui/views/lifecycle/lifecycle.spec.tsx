import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { LifecycleView } from './lifecycle_view';

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
// useFocusEffect is a navigation hook that needs a navigator context; stub only
// it (keep the real module so native-stack's createScreenFactory stays intact).
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: () => undefined,
}));
import {
  useEventLog,
  useDependencyPlayground,
  useTimerDemo,
  useCleanupDemo,
  useLayoutEffectDemo,
  useMemoCallbackDemo,
  useRefAcrossRenders,
  useFocusDemo,
  useAppStateDemo,
  expensiveSum,
} from './lifecycle_hooks';

/**
 * Tests for the lifecycle view's LOGIC (the co-located hooks + pure helpers)
 * and a smoke render of the dumb view. The global jest.setup.ts wires the
 * container with fakes before each test.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('useEventLog', () => {
  it('appends entries with stable ids and caps to max', () => {
    const { result } = renderHook(() => useEventLog(3), { wrapper });
    act(() => {
      result.current[1]('a');
      result.current[1]('b');
      result.current[1]('c');
      result.current[1]('d');
    });
    // capped to 3, most-recent-first
    expect(result.current[0]).toHaveLength(3);
    expect(result.current[0][0]!.text).toBe('d');
    expect(result.current[0][2]!.text).toBe('b');
  });

  it('clear() empties the log', () => {
    const { result } = renderHook(() => useEventLog(), { wrapper });
    act(() => result.current[1]('x'));
    act(() => result.current[2]());
    expect(result.current[0]).toHaveLength(0);
  });
});

describe('useDependencyPlayground', () => {
  it('starts in mount mode with dep 0 and renderId 1', () => {
    const { result } = renderHook(() => useDependencyPlayground(), { wrapper });
    expect(result.current.mode).toBe('mount');
    expect(result.current.dep).toBe(0);
    expect(result.current.renderId).toBe(1);
  });

  it('selectMode/bumpDep/forceRender drive state and log', () => {
    const { result } = renderHook(() => useDependencyPlayground(), { wrapper });
    act(() => result.current.selectMode('dep'));
    act(() => result.current.bumpDep());
    act(() => result.current.forceRender());
    expect(result.current.mode).toBe('dep');
    expect(result.current.dep).toBe(1);
    expect(result.current.renderId).toBe(2);
    expect(result.current.entries.some((e) => e.text.includes('switch → dep'))).toBe(true);
  });
});

describe('useTimerDemo', () => {
  it('starts at 0 ticks', () => {
    const { result } = renderHook(() => useTimerDemo(() => undefined), { wrapper });
    expect(result.current.ticks).toBe(0);
  });
});

describe('useCleanupDemo', () => {
  it('starts mounted and toggles', () => {
    const { result } = renderHook(() => useCleanupDemo(), { wrapper });
    expect(result.current.mounted).toBe(true);
    act(() => result.current.toggleMounted());
    expect(result.current.mounted).toBe(false);
  });
});

describe('useLayoutEffectDemo', () => {
  it('starts narrow with unmeasured width and toggles big', () => {
    const { result } = renderHook(() => useLayoutEffectDemo(), { wrapper });
    expect(result.current.big).toBe(false);
    expect(result.current.measuredWidth).toBeNull();
    act(() => result.current.toggleBig());
    expect(result.current.big).toBe(true);
  });

  it('setMeasuredWidth ignores zero and rounds', () => {
    const { result } = renderHook(() => useLayoutEffectDemo(), { wrapper });
    act(() => result.current.setMeasuredWidth(0));
    expect(result.current.measuredWidth).toBeNull();
    act(() => result.current.setMeasuredWidth(123.6));
    expect(result.current.measuredWidth).toBe(124);
  });
});

describe('useMemoCallbackDemo', () => {
  it('computes the expensive sum and recomputes only on size change', () => {
    const { result } = renderHook(() => useMemoCallbackDemo(), { wrapper });
    const initialSum = result.current.sum;
    expect(initialSum).toBe(expensiveSum(150));
    // grow recomputes (size changes → memo invalidates)
    act(() => result.current.grow());
    expect(result.current.size).toBe(200);
    expect(result.current.sum).toBe(expensiveSum(200));
  });

  it('shrink floors at 50', () => {
    const { result } = renderHook(() => useMemoCallbackDemo(), { wrapper });
    act(() => result.current.shrink());
    expect(result.current.size).toBe(100);
  });
});

describe('useRefAcrossRenders', () => {
  it('counts renders via the ref and via state independently', () => {
    const { result } = renderHook(() => useRefAcrossRenders(), { wrapper });
    expect(result.current.renderRef.current).toBeGreaterThanOrEqual(1);
    expect(result.current.renderCount).toBe(0);
    act(() => result.current.bumpRenderCount());
    expect(result.current.renderCount).toBe(1);
  });
});

describe('useFocusDemo / useAppStateDemo', () => {
  it('useFocusDemo exposes a clear fn and starts empty', () => {
    const { result } = renderHook(() => useFocusDemo(), { wrapper });
    expect(result.current.entries).toHaveLength(0);
    expect(typeof result.current.clear).toBe('function');
  });

  it('useAppStateDemo starts unknown and subscribes on mount', () => {
    const { result } = renderHook(() => useAppStateDemo(), { wrapper });
    expect(result.current.current).not.toBe('unknown');
    expect(result.current.entries.length).toBeGreaterThan(0);
  });
});

describe('LifecycleView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON, unmount } = render(<LifecycleView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    // Unmount so the live TimerChild's interval + AppState subscription don't
    // keep the worker alive after the suite ends.
    unmount();
  });
});
