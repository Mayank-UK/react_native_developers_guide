import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { ZustandView } from './zustand_view';
import {
  useRenderCounter,
  useZustandControls,
  useZustandCountDisplay,
  useZustandParityBadge,
} from './zustand_hooks';

// The dumb view is wrapped in ScreenScaffold, which needs expo-router nav +
// SafeAreaProvider contexts. For this smoke test we only care that the view's
// own composition renders, so mock the scaffold to pass children through.
jest.mock('../../../../components/screen-scaffold', () => {
  const { View } = require('react-native');
  return {
    ScreenScaffold: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

/**
 * Tests for the zustand view's LOGIC (the co-located hooks) and a smoke render
 * of the dumb view.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('useRenderCounter', () => {
  it('increments on every render', () => {
    const { result, rerender } = renderHook(() => useRenderCounter(), { wrapper });
    const first = result.current;
    rerender(undefined);
    rerender(undefined);
    expect(result.current).toBe(first + 2);
  });
});

describe('useZustandCountDisplay', () => {
  it('exposes the store count and a render counter', () => {
    const { result } = renderHook(() => useZustandCountDisplay(), { wrapper });
    expect(result.current.count).toBe(0);
    expect(typeof result.current.renders).toBe('number');
  });
});

describe('useZustandParityBadge', () => {
  it('reports even when count is even', () => {
    const { result } = renderHook(() => useZustandParityBadge(), { wrapper });
    expect(result.current.parity).toBe('even');
  });
});

describe('useZustandControls', () => {
  it('increment changes the count seen by count display', () => {
    const { result: controls } = renderHook(() => useZustandControls(), { wrapper });
    const { result: display } = renderHook(() => useZustandCountDisplay(), {
      wrapper,
    });
    act(() => controls.current.increment());
    // zustand is external; a fresh subscription sees the latest value
    expect(display.current.count).toBe(1);
  });

  it('setNote updates the note', () => {
    const { result } = renderHook(() => useZustandControls(), { wrapper });
    expect(result.current.note).toBe('hello');
    act(() => result.current.setNote('world'));
    expect(result.current.note).toBe('world');
  });
});

describe('ZustandView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ZustandView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
