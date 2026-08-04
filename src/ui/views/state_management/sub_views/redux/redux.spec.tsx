import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { ReduxView } from './redux_view';
import {
  ReduxProvider,
  demoStore,
  useReduxControls,
  useReduxCountDisplay,
} from './redux_hooks';
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
 * Tests for the redux view's LOGIC (the scoped store + selector/dispatch hooks)
 * and a smoke render of the dumb view.
 */

const themeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const reduxWrapper = ({ children }: { children: ReactNode }) => (
  <ReduxProvider store={demoStore}>{children}</ReduxProvider>
);

describe('useReduxCountDisplay', () => {
  it('reads the scoped store', () => {
    const { result } = renderHook(() => useReduxCountDisplay(), { wrapper: reduxWrapper });
    expect(result.current.count).toBe(0);
  });
});

describe('useReduxControls', () => {
  it('dispatches incremented / decremented / addedBy', () => {
    const { result: controls } = renderHook(() => useReduxControls(), { wrapper: reduxWrapper });
    const { result: display } = renderHook(() => useReduxCountDisplay(), {
      wrapper: reduxWrapper,
    });
    act(() => controls.current.increment());
    act(() => controls.current.addBy5());
    expect(display.current.count).toBe(6);
    act(() => controls.current.decrement());
    expect(display.current.count).toBe(5);
  });
});

describe('ReduxView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON, unmount } = render(<ReduxView />, { wrapper: themeWrapper });
    expect(toJSON()).toBeTruthy();
    // The view mounts a live Redux provider; unmount to avoid leaking work.
    unmount();
  });
});
