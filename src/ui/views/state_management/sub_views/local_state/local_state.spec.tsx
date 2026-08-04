import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { LocalStateView } from './local_state_view';
import {
  CounterActionType,
  counterReducer,
  useCounterDemo,
  useFavorites,
  useFavoritesState,
  FavoritesContext,
} from './local_state_hooks';
import type { ReactNode } from 'react';

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
 * Tests for the local-state view's LOGIC (the co-located hooks + the pure
 * reducer) and a smoke render of the dumb view.
 */

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

/* -------------------------------------------------------------------------- */
/* pure reducer                                                               */
/* -------------------------------------------------------------------------- */

describe('counterReducer', () => {
  it('applies increment / decrement / reset', () => {
    expect(counterReducer(0, { type: CounterActionType.Increment })).toBe(1);
    expect(counterReducer(5, { type: CounterActionType.Decrement })).toBe(4);
    expect(counterReducer(99, { type: CounterActionType.Reset })).toBe(0);
  });

  it('applies addBy by a payload', () => {
    expect(counterReducer(2, { type: CounterActionType.AddBy, by: 5 })).toBe(7);
  });
});

/* -------------------------------------------------------------------------- */
/* LOCAL state                                                                */
/* -------------------------------------------------------------------------- */

describe('useCounterDemo', () => {
  it('starts at count 0, step 1', () => {
    const { result } = renderHook(() => useCounterDemo(), { wrapper });
    expect(result.current.count).toBe(0);
    expect(result.current.step).toBe(1);
  });

  it('dispatch drives the reducer and setStep the useState', () => {
    const { result } = renderHook(() => useCounterDemo(), { wrapper });
    act(() => result.current.dispatch({ type: CounterActionType.Increment }));
    act(() => result.current.dispatch({ type: CounterActionType.AddBy, by: 3 }));
    expect(result.current.count).toBe(4);
    act(() => result.current.setStep((s) => s + 1));
    expect(result.current.step).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/* SHARED client state — Context                                              */
/* -------------------------------------------------------------------------- */

describe('useFavoritesState', () => {
  it('starts empty and toggles ids in/out', () => {
    const { result } = renderHook(() => useFavoritesState(), { wrapper });
    expect(result.current.count).toBe(0);
    expect(result.current.ids).toEqual([]);
    act(() => result.current.toggle(1));
    expect(result.current.ids).toEqual([1]);
    expect(result.current.count).toBe(1);
    // toggle off
    act(() => result.current.toggle(1));
    expect(result.current.ids).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('toggle keeps a stable identity across state changes', () => {
    const { result } = renderHook(() => useFavoritesState(), { wrapper });
    const first = result.current.toggle;
    act(() => result.current.toggle(1));
    expect(result.current.toggle).toBe(first);
  });
});

describe('useFavorites', () => {
  it('throws when used outside a provider', () => {
    // Suppress the expected console.error from React for the thrown error.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useFavorites())).toThrow(/FavoritesProvider/);
    spy.mockRestore();
  });

  it('reads the context value when inside a provider', () => {
    const value = { ids: [1, 2], count: 2, toggle: jest.fn() };
    const ctxWrapper = ({ children }: { children: ReactNode }) => (
      <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
    );
    const { result } = renderHook(() => useFavorites(), { wrapper: ctxWrapper });
    expect(result.current.count).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/* smoke render                                                               */
/* -------------------------------------------------------------------------- */

describe('LocalStateView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<LocalStateView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
