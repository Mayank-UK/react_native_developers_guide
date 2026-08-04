import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { NavigationRoutingView } from './navigation_view';

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

// The hooks (and the view via <Link>) call into expo-router. Mock it fully so
// the smoke render + hook tests stay context-free. jest.mock factories cannot
// reference arbitrary out-of-scope vars — names prefixed with `mock` are the
// permitted exception.
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
    useGlobalSearchParams: () => ({}),
    // useFocusEffect: invoke the callback ONCE per mount. The real hook fires
    // on focus only; calling cb on every render would loop (cb -> setState ->
    // re-render -> cb). A ref guard makes it fire once.
    useFocusEffect: (cb: () => unknown) => {
      const React = require('react');
      const didRun = React.useRef(false);
      if (!didRun.current) {
        didRun.current = true;
        cb();
      }
    },
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});
import {
  useImperativeNav,
  useDynamicParams,
  useFocusLog,
  useNavLog,
  stamp,
} from './navigation_hooks';

/**
 * Tests for the navigation-routing view's LOGIC (the co-located hooks + the
 * pure stamp helper) and a smoke render of the dumb view.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('stamp', () => {
  it('formats an HH:MM:SS.mmm string', () => {
    const s = stamp(new Date(2026, 0, 1, 13, 5, 9, 42));
    expect(s).toBe('13:05:09.042');
  });
});

describe('useNavLog', () => {
  it('caps entries at the given max and prepends newest first', () => {
    const { result } = renderHook(() => useNavLog(3), { wrapper });
    act(() => {
      result.current[1]('one', 'default');
      result.current[1]('two', 'primary');
      result.current[1]('three', 'danger');
      result.current[1]('four', 'muted');
    });
    expect(result.current[0]).toHaveLength(3);
    expect(result.current[0][0]!.text).toBe('four');
    expect(result.current[0][2]!.text).toBe('two');
  });

  it('clear() empties the log', () => {
    const { result } = renderHook(() => useNavLog(), { wrapper });
    act(() => result.current[1]('hello'));
    expect(result.current[0]).toHaveLength(1);
    act(() => result.current[2]());
    expect(result.current[0]).toHaveLength(0);
  });
});

describe('useImperativeNav', () => {
  it('push logs and calls router.push with the target', () => {
    const { result } = renderHook(() => useImperativeNav(), { wrapper });
    act(() => result.current.go('push', '/about'));
    expect(mockPush).toHaveBeenCalledWith('/about');
    expect(result.current.entries[0]!.text).toMatch(/push\(\/about\)/);
    expect(result.current.entries[0]!.tone).toBe('primary');
  });

  it('replace logs with danger tone and calls router.replace', () => {
    const { result } = renderHook(() => useImperativeNav(), { wrapper });
    act(() => result.current.go('replace', '/about'));
    expect(mockReplace).toHaveBeenCalledWith('/about');
    expect(result.current.entries[0]!.tone).toBe('danger');
  });

  it('back logs and calls router.back', () => {
    const { result } = renderHook(() => useImperativeNav(), { wrapper });
    act(() => result.current.go('back', ''));
    expect(mockBack).toHaveBeenCalled();
    expect(result.current.entries[0]!.text).toMatch(/back\(\)/);
  });
});

describe('useDynamicParams', () => {
  it('starts on the initial value and pushes the typed pathname', () => {
    const { result } = renderHook(() => useDynamicParams('post-9'), { wrapper });
    expect(result.current.value).toBe('post-9');
    act(() => result.current.navigateToDetail());
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/navigation-routing/[id]',
      params: { id: 'post-9' },
    });
  });

  it('falls back to "empty" when the value is blank', () => {
    const { result } = renderHook(() => useDynamicParams(''), { wrapper });
    act(() => result.current.navigateToDetail());
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ params: { id: 'empty' } }),
    );
  });

  it('setValue updates the controlled value', () => {
    const { result } = renderHook(() => useDynamicParams(), { wrapper });
    act(() => result.current.setValue('xyz'));
    expect(result.current.value).toBe('xyz');
  });
});

describe('useFocusLog', () => {
  it('records a focus entry on mount', () => {
    const { result } = renderHook(() => useFocusLog(5), { wrapper });
    expect(result.current.entries.length).toBeGreaterThan(0);
    expect(result.current.entries[0]!.text).toMatch(/focus #1/);
  });
});

describe('NavigationRoutingView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<NavigationRoutingView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
