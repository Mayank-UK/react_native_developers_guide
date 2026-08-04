import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { ReactFundamentalsView } from './react_fundamentals_view';

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
  useCounterState,
  useControlledInput,
  useConditionalToggle,
  useTaskList,
  useEffectTimer,
  useMemoUseRefDemo,
  useReducerCounter,
  useToggle,
  expensiveSum,
  counterReducer,
} from './react_fundamentals_hooks';

/**
 * Tests for the React Fundamentals view's LOGIC (the co-located hooks + pure
 * helpers) and a smoke render of the dumb view.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('useCounterState', () => {
  it('starts at 0 and increments/decrements/resets', () => {
    const { result } = renderHook(() => useCounterState(), { wrapper });
    expect(result.current.count).toBe(0);
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
    act(() => result.current.increment());
    act(() => result.current.reset());
    expect(result.current.count).toBe(0);
  });
});

describe('useControlledInput', () => {
  it('tracks text and the over-limit flag', () => {
    const { result } = renderHook(() => useControlledInput(), { wrapper });
    expect(result.current.over).toBe(false);
    act(() => result.current.setText('a'.repeat(21)));
    expect(result.current.over).toBe(true);
  });
});

describe('useConditionalToggle', () => {
  it('flips the boolean', () => {
    const { result } = renderHook(() => useConditionalToggle(), { wrapper });
    expect(result.current.on).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.on).toBe(true);
  });
});

describe('useTaskList', () => {
  it('starts with two tasks and adds/removes', () => {
    const { result } = renderHook(() => useTaskList(), { wrapper });
    expect(result.current.tasks).toHaveLength(2);
    act(() => result.current.add());
    expect(result.current.tasks).toHaveLength(3);
    const id = result.current.tasks[0]!.id;
    act(() => result.current.remove(id));
    expect(result.current.tasks.find((t) => t.id === id)).toBeUndefined();
  });
});

describe('useEffectTimer', () => {
  it('starts stopped at zero ticks', () => {
    const { result } = renderHook(() => useEffectTimer(), { wrapper });
    expect(result.current.running).toBe(false);
    expect(result.current.ticks).toBe(0);
  });
});

describe('useMemoUseRefDemo', () => {
  it('computes the memoized sum and bumps unrelated without recomputing', () => {
    const { result } = renderHook(() => useMemoUseRefDemo(), { wrapper });
    const first = result.current.sum;
    act(() => result.current.bumpUnrelated());
    expect(result.current.sum).toBe(first);
    act(() => result.current.incrementSize());
    expect(result.current.sum).not.toBe(first);
  });
});

describe('useReducerCounter', () => {
  it('drives the reducer via dispatch', () => {
    const { result } = renderHook(() => useReducerCounter(), { wrapper });
    expect(result.current.count).toBe(0);
    act(() => result.current.increment());
    act(() => result.current.increment());
    act(() => result.current.decrement());
    expect(result.current.count).toBe(1);
    act(() => result.current.reset());
    expect(result.current.count).toBe(0);
  });
});

describe('useToggle', () => {
  it('toggles two independent instances', () => {
    const { result: a } = renderHook(() => useToggle(false), { wrapper });
    const { result: b } = renderHook(() => useToggle(false), { wrapper });
    act(() => a.current[1]());
    expect(a.current[0]).toBe(true);
    expect(b.current[0]).toBe(false);
  });
});

describe('pure helpers', () => {
  it('counterReducer transitions deterministically', () => {
    expect(counterReducer(5, { type: 'increment' })).toBe(6);
    expect(counterReducer(5, { type: 'decrement' })).toBe(4);
    expect(counterReducer(5, { type: 'reset' })).toBe(0);
  });

  it('expensiveSum is the quadratic busy-work result', () => {
    expect(expensiveSum(0)).toBe(0);
    // n=1: (0*0)%7 = 0
    expect(expensiveSum(1)).toBe(0);
  });
});

describe('ReactFundamentalsView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ReactFundamentalsView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
