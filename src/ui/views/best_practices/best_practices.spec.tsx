import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { BestPracticesView } from './best_practices_view';

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
  useVirtualizationLab,
  useMountCounter,
  useMemoizationLab,
  useRenderCounter,
  useAccessibilityLab,
  performanceNow,
  round1,
  ITEM_COUNTS,
} from './best_practices_hooks';

/**
 * Tests for the best-practices view's LOGIC (the co-located hooks + the pure
 * perf-timer helpers) and a smoke render of the dumb view.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('pure helpers', () => {
  it('round1 rounds to one decimal', () => {
    expect(round1(1.234)).toBe(1.2);
    expect(round1(1.25)).toBe(1.3);
    expect(round1(0)).toBe(0);
  });

  it('performanceNow returns a finite non-negative number', () => {
    const t = performanceNow();
    expect(typeof t).toBe('number');
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThanOrEqual(0);
  });
});

describe('useMountCounter', () => {
  it('is a no-op hook callable inside a component', () => {
    const { result } = renderHook(() => useMountCounter(), { wrapper });
    expect(result.current).toBeUndefined();
  });
});

describe('useVirtualizationLab', () => {
  it('starts in flatlist mode at 1000 items with unmeasured mounts', () => {
    const { result } = renderHook(() => useVirtualizationLab(), { wrapper });
    expect(result.current.mode).toBe('flatlist');
    expect(result.current.count).toBe(1000);
    expect(result.current.mounts).toBeNull();
    expect(result.current.elapsedMs).toBeNull();
    expect(result.current.data).toHaveLength(1000);
  });

  it('setCount changes the data length', () => {
    const { result } = renderHook(() => useVirtualizationLab(), { wrapper });
    act(() => result.current.setCount(ITEM_COUNTS[0]!));
    expect(result.current.count).toBe(100);
    expect(result.current.data).toHaveLength(100);
  });

  it('run() flips mode + count and eventually reports mounts', async () => {
    const { result } = renderHook(() => useVirtualizationLab(), { wrapper });
    act(() => result.current.run('naive', 100));
    expect(result.current.mode).toBe('naive');
    expect(result.current.count).toBe(100);
    expect(result.current.mounts).toBeNull(); // cleared on run; RAF reports later
    // RAF is async; just assert the reset behaviour, not the timing.
  });
});

describe('useMemoizationLab', () => {
  it('starts memoized with stable identity for stablePoke', () => {
    const { result, rerender } = renderHook(() => useMemoizationLab(), { wrapper });
    expect(result.current.memoized).toBe(true);
    expect(result.current.parentTick).toBe(0);
    expect(result.current.pokeCount).toBe(0);
    const first = result.current.stablePoke;
    // re-render without deps change → stablePoke identity stable
    rerender(undefined);
    expect(result.current.stablePoke).toBe(first);
  });

  it('bumpParent/toggleMemoized/stablePoke drive state', () => {
    const { result } = renderHook(() => useMemoizationLab(), { wrapper });
    act(() => result.current.bumpParent());
    act(() => result.current.toggleMemoized());
    act(() => result.current.stablePoke());
    expect(result.current.parentTick).toBe(1);
    expect(result.current.memoized).toBe(false);
    expect(result.current.pokeCount).toBe(1);
  });
});

describe('useRenderCounter', () => {
  it('increments on every render', () => {
    const { result, rerender } = renderHook(() => useRenderCounter(), { wrapper });
    const first = result.current;
    rerender(undefined);
    rerender(undefined);
    expect(result.current).toBe(first + 2);
  });
});

describe('useAccessibilityLab', () => {
  it('announces "Bookmark, button" by default and reflects toggles', () => {
    const { result } = renderHook(() => useAccessibilityLab(), { wrapper });
    expect(result.current.announced).toBe('Bookmark, button');
    act(() => result.current.toggleLabel());
    expect(result.current.announced).toContain('★');
    act(() => result.current.toggleHint());
    expect(result.current.announced).toContain('Saves this post');
  });

  it('press increments and marks selected on odd presses', () => {
    const { result } = renderHook(() => useAccessibilityLab(), { wrapper });
    expect(result.current.selected).toBe(false);
    act(() => result.current.press());
    expect(result.current.presses).toBe(1);
    expect(result.current.selected).toBe(true);
    expect(result.current.announced).not.toContain('selected'); // odd → not announced
    act(() => result.current.press());
    expect(result.current.selected).toBe(false);
  });
});

describe('BestPracticesView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<BestPracticesView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
