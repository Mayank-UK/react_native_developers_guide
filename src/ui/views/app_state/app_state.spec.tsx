import { act, render, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateEvent, type AppStateStatus } from 'react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import {
  APP_STATE_VALUES,
  appStateLabel,
  backgroundExecutionMatrix,
  useActivePulse,
  useAppStateLog,
} from './app_state_hooks';
import { AppStateView } from './app_state_view';

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
// Sparse-mock @react-navigation/native (a bare object mock breaks native-stack
// via the LinkCard→expo-router transitive). Override only useFocusEffect.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: () => undefined,
}));

/**
 * Tests for the app-state view's LOGIC (pure helpers + the useAppStateLog /
 * useActivePulse hooks) and a smoke render of the dumb view.
 *
 * AppState is mockable: jest.spyOn(AppState, 'addEventListener') captures the
 * registered handler so a test can fire 'background'/'active' transitions.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('APP_STATE_VALUES / appStateLabel (pure)', () => {
  it('exposes the three RN AppState values', () => {
    expect(APP_STATE_VALUES.active).toBe('active');
    expect(APP_STATE_VALUES.inactive).toBe('inactive');
    expect(APP_STATE_VALUES.background).toBe('background');
  });

  it('maps each value to a friendly label', () => {
    expect(appStateLabel('active')).toMatch(/Foreground/i);
    expect(appStateLabel('inactive')).toMatch(/transient/i);
    expect(appStateLabel('background')).toMatch(/Background/i);
  });
});

describe('backgroundExecutionMatrix (pure)', () => {
  it('returns one row per aspect with ios + android columns', () => {
    const rows = backgroundExecutionMatrix();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(typeof r.aspect).toBe('string');
      expect(r.ios.length).toBeGreaterThan(0);
      expect(r.android.length).toBeGreaterThan(0);
    }
  });

  it('mentions the primary escape hatches (BGTaskScheduler + WorkManager)', () => {
    const joined = backgroundExecutionMatrix()
      .map((r) => r.ios + ' ' + r.android)
      .join(' ');
    expect(joined).toMatch(/BGTaskScheduler/);
    expect(joined).toMatch(/WorkManager/);
  });
});

describe('useAppStateLog', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts with currentState seeded from AppState.currentState', () => {
    const { result } = renderHook(() => useAppStateLog(), { wrapper });
    // jest-expo seeds AppState.currentState to 'active' by default.
    expect(result.current.current).toBe(AppState.currentState);
    expect(result.current.log).toHaveLength(0);
  });

  it('records transitions fired through the AppState subscription', () => {
    let handler: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(
      (_type: AppStateEvent, cb: (state: AppStateStatus) => void) => {
        handler = cb;
        return { remove: jest.fn() };
      },
    );

    const { result } = renderHook(() => useAppStateLog(), { wrapper });

    act(() => handler('background'));
    expect(result.current.current).toBe('background');
    expect(result.current.log).toHaveLength(1);
    expect(result.current.log[0]!.state).toBe('background');

    act(() => handler('active'));
    expect(result.current.current).toBe('active');
    expect(result.current.log).toHaveLength(2);
    // most-recent-first
    expect(result.current.log[0]!.state).toBe('active');
  });

  it('caps the log to max', () => {
    let handler: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(
      (_type: AppStateEvent, cb: (state: AppStateStatus) => void) => {
        handler = cb;
        return { remove: jest.fn() };
      },
    );

    const { result, unmount } = renderHook(() => useAppStateLog(3), { wrapper });
    for (let i = 0; i < 6; i++) {
      act(() => handler(i % 2 === 0 ? 'background' : 'active'));
    }
    expect(result.current.log).toHaveLength(3);
    unmount();
  });
});

describe('useActivePulse', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ticks the counter via its interval', () => {
    // Stub AppState.addEventListener so the effect's own subscription does not
    // interfere; the interval is what we exercise.
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({
      remove: jest.fn(),
    }));

    const { result, unmount } = renderHook(() => useActivePulse(50), { wrapper });
    expect(result.current.ticks).toBe(0);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current.ticks).toBe(1);
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(result.current.ticks).toBe(4);
    unmount();
  });

  it('unmount clears the interval (no further ticks after unmount)', () => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({
      remove: jest.fn(),
    }));

    const { result, unmount } = renderHook(() => useActivePulse(50), { wrapper });
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current.ticks).toBe(1);
    unmount();
    const before = result.current.ticks;
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.ticks).toBe(before);
  });
});

describe('AppStateView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON, unmount } = render(<AppStateView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    // Unmount so the live intervals + AppState subscriptions don't keep the
    // jest worker alive after the suite ends.
    unmount();
  });
});
