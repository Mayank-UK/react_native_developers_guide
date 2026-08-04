import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { InteractiveView } from './interactive_view';
import {
  usePressLog,
  useDisabledGate,
  useFocusField,
  useHoverState,
} from './interactive_hooks';

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
 * Tests for the interactive view's LOGIC (the co-located demo hooks) and a
 * smoke render of the dumb view.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('usePressLog', () => {
  it('pushes entries newest-first, caps at 6, and bumps the render counter', () => {
    const { result } = renderHook(() => usePressLog(), { wrapper });
    expect(result.current.log).toHaveLength(0);
    expect(result.current.seq).toBe(1);
    act(() => result.current.push('press'));
    act(() => result.current.push('long-press'));
    expect(result.current.log).toHaveLength(2);
    expect(result.current.log[0]!.text).toBe('long-press');
    expect(result.current.seq).toBe(3);
  });

  it('caps the log at six entries', () => {
    const { result } = renderHook(() => usePressLog(), { wrapper });
    act(() => {
      for (let i = 0; i < 10; i++) result.current.push(`e${i}`);
    });
    expect(result.current.log).toHaveLength(6);
    expect(result.current.log[0]!.text).toBe('e9');
  });

  it('hands each entry a strictly increasing id', () => {
    const { result } = renderHook(() => usePressLog(), { wrapper });
    act(() => result.current.push('a'));
    act(() => result.current.push('b'));
    expect(result.current.log[1]!.id).toBeLessThan(result.current.log[0]!.id);
  });
});

describe('useDisabledGate', () => {
  it('starts disabled (false) and toggles', () => {
    const { result } = renderHook(() => useDisabledGate(), { wrapper });
    expect(result.current.enabled).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(true);
  });
});

describe('useFocusField', () => {
  it('tracks focus and value independently', () => {
    const { result } = renderHook(() => useFocusField(), { wrapper });
    expect(result.current.focused).toBe(false);
    expect(result.current.value).toBe('');
    act(() => result.current.setFocused(true));
    act(() => result.current.setValue('hi'));
    expect(result.current.focused).toBe(true);
    expect(result.current.value).toBe('hi');
  });
});

describe('useHoverState', () => {
  it('starts unhovered and flips', () => {
    const { result } = renderHook(() => useHoverState(), { wrapper });
    expect(result.current.hovered).toBe(false);
    act(() => result.current.setHovered(true));
    expect(result.current.hovered).toBe(true);
  });
});

describe('InteractiveView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<InteractiveView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
