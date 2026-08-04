import { act, render, renderHook } from '@testing-library/react-native';
import type { NetInfoState } from '@react-native-community/netinfo';
import { ThemeProvider } from '../../design-system/theme-provider';
import { OfflineView } from './offline_view';
import {
  CACHE_STRATEGIES,
  SYNC_STATE,
  cacheStrategyLabel,
  cacheStrategyMatrix,
  isOnline,
  syncStateLabel,
  useNetInfoDemo,
  useOptimisticListDemo,
} from './offline_hooks';

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

// Per-spec mock for @react-native-community/netinfo. The factory must NOT close
// over arbitrary vars (jest mock-factory rule), so any jest.fn referenced inside
// is `mock`-prefixed and re-declared in module scope below.
const STABLE_ONLINE: NetInfoState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
  details: { ip: '127.0.0.1', isConnectionExpensive: false, ssid: null, subnet: null },
} as unknown as NetInfoState;

const mockFetch = jest.fn().mockResolvedValue(STABLE_ONLINE);
const mockRemove = jest.fn();
const mockAddEventListener = jest.fn().mockImplementation((cb: (s: NetInfoState) => void) => {
  cb(STABLE_ONLINE); // fire immediately so the snapshot is populated
  return mockRemove;
});

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
    fetch: (...args: unknown[]) => mockFetch(...args),
  },
}));

/**
 * Tests for the offline view's LOGIC (pure helpers + the useNetInfoDemo /
 * useOptimisticListDemo hooks) and a smoke render of the dumb view.
 *
 * NetInfo is mocked per-spec above (stable online wifi state). The default
 * export's addEventListener fires the registered callback with the stable
 * state immediately, matching how the real lib calls the listener on
 * subscription.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  mockFetch.mockClear();
  mockAddEventListener.mockClear();
  mockRemove.mockClear();
});

describe('CACHE_STRATEGIES / cacheStrategyLabel (pure)', () => {
  it('exposes the five canonical strategy values', () => {
    expect(CACHE_STRATEGIES.CACHE_FIRST).toBe('cache-first');
    expect(CACHE_STRATEGIES.NETWORK_FIRST).toBe('network-first');
    expect(CACHE_STRATEGIES.CACHE_ONLY).toBe('cache-only');
    expect(CACHE_STRATEGIES.NETWORK_ONLY).toBe('network-only');
    expect(CACHE_STRATEGIES.STALE_WHILE_REVALIDATE).toBe('stale-while-revalidate');
  });

  it('maps each strategy to a friendly label', () => {
    expect(cacheStrategyLabel('cache-first')).toMatch(/fastest/i);
    expect(cacheStrategyLabel('network-first')).toMatch(/freshest/i);
    expect(cacheStrategyLabel('cache-only')).toMatch(/offline/i);
    expect(cacheStrategyLabel('network-only')).toMatch(/no cache/i);
    expect(cacheStrategyLabel('stale-while-revalidate')).toMatch(/instant/i);
  });
});

describe('cacheStrategyMatrix (pure)', () => {
  it('returns one row per strategy', () => {
    const rows = cacheStrategyMatrix();
    expect(rows).toHaveLength(5);
    const strategies = rows.map((r) => r.strategy);
    expect(new Set(strategies).size).toBe(5);
  });

  it('each row has a non-empty when + optimises field', () => {
    for (const r of cacheStrategyMatrix()) {
      expect(r.when.length).toBeGreaterThan(0);
      expect(['latency', 'freshness', 'offline', 'bandwidth']).toContain(r.optimises);
    }
  });
});

describe('SYNC_STATE / syncStateLabel (pure)', () => {
  it('exposes the four sync-state values', () => {
    expect(SYNC_STATE.IDLE).toBe('idle');
    expect(SYNC_STATE.PENDING).toBe('pending');
    expect(SYNC_STATE.SYNCED).toBe('synced');
    expect(SYNC_STATE.ERROR).toBe('error');
  });

  it('maps each state to a friendly label', () => {
    expect(syncStateLabel('idle')).toMatch(/nothing queued/i);
    expect(syncStateLabel('pending')).toMatch(/queued/i);
    expect(syncStateLabel('synced')).toMatch(/confirmed/i);
    expect(syncStateLabel('error')).toMatch(/rolled back/i);
  });
});

describe('isOnline (pure)', () => {
  it('returns true only when isConnected and internet is reachable', () => {
    expect(isOnline({ isConnected: true, isInternetReachable: true, type: 'wifi' } as never)).toBe(true);
    expect(isOnline({ isConnected: true, isInternetReachable: false, type: 'wifi' } as never)).toBe(false);
    expect(isOnline({ isConnected: false, isInternetReachable: null, type: 'none' } as never)).toBe(false);
    expect(isOnline({ isConnected: null, isInternetReachable: null, type: 'unknown' } as never)).toBe(false);
  });

  it('treats null / undefined input as offline', () => {
    expect(isOnline(null)).toBe(false);
    expect(isOnline(undefined)).toBe(false);
  });
});

describe('useNetInfoDemo', () => {
  it('subscribes + seeds from fetch, exposing the stable online state', () => {
    const { result, unmount } = renderHook(() => useNetInfoDemo(), { wrapper });
    // The factory's addEventListener fires STABLE_ONLINE synchronously on
    // subscription; fetch also resolves to STABLE_ONLINE.
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.online).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.type).toBe('wifi');
    expect(result.current.ready).toBe(true);
    unmount();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useNetInfoDemo(), { wrapper });
    unmount();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('reflects a transition fired through the registered handler', () => {
    // Re-mock addEventListener to capture the handler so we can fire a transition.
    let handler: (s: NetInfoState) => void = () => undefined;
    mockAddEventListener.mockImplementationOnce((cb: (s: NetInfoState) => void) => {
      handler = cb;
      return mockRemove;
    });
    const offlineState = {
      isConnected: false,
      isInternetReachable: null,
      type: 'none',
    } as unknown as NetInfoState;

    const { result, unmount } = renderHook(() => useNetInfoDemo(), { wrapper });
    act(() => handler(offlineState));
    expect(result.current.online).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.type).toBe('none');
    unmount();
  });
});

describe('useOptimisticListDemo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts empty with the force-fail knob off', () => {
    const { result, unmount } = renderHook(() => useOptimisticListDemo(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.forceFail).toBe(false);
    expect(result.current.draft).toBe('');
    unmount();
  });

  it('appends optimistically as pending, then confirms after the commit delay', () => {
    const { result, unmount } = renderHook(() => useOptimisticListDemo(), { wrapper });
    act(() => result.current.addTask('Buy milk'));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.label).toBe('Buy milk');
    expect(result.current.items[0]!.syncState).toBe('pending');
    // Advance past the commit delay (1200ms) -> promoted to synced.
    act(() => {
      jest.advanceTimersByTime(1300);
    });
    expect(result.current.items[0]!.syncState).toBe('synced');
    unmount();
  });

  it('rolls back when forceFail is on (error then dropped)', () => {
    const { result, unmount } = renderHook(() => useOptimisticListDemo(), { wrapper });
    act(() => result.current.toggleForceFail());
    expect(result.current.forceFail).toBe(true);
    act(() => result.current.addTask('Will fail'));
    expect(result.current.items[0]!.syncState).toBe('pending');
    // Commit fires -> error.
    act(() => {
      jest.advanceTimersByTime(1300);
    });
    expect(result.current.items[0]!.syncState).toBe('error');
    // Cleanup beat (700ms after error) -> row dropped.
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(result.current.items).toHaveLength(0);
    unmount();
  });

  it('submitDraft appends the draft then clears it; ignores empty/whitespace', () => {
    const { result, unmount } = renderHook(() => useOptimisticListDemo(), { wrapper });
    act(() => result.current.setDraft('   Walk dog   '));
    expect(result.current.draft).toBe('   Walk dog   ');
    act(() => result.current.submitDraft());
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.label).toBe('Walk dog'); // trimmed
    expect(result.current.draft).toBe('');
    // Empty draft is a no-op.
    act(() => result.current.submitDraft());
    expect(result.current.items).toHaveLength(1);
    unmount();
  });

  it('reset clears items + draft', () => {
    const { result, unmount } = renderHook(() => useOptimisticListDemo(), { wrapper });
    act(() => result.current.addTask('A'));
    act(() => result.current.setDraft('pending'));
    act(() => result.current.reset());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.draft).toBe('');
    unmount();
  });
});

describe('OfflineView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON, unmount } = render(<OfflineView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    // Unmount so the live NetInfo subscriptions + optimistic-demo timers don't
    // keep the jest worker alive after the suite ends.
    unmount();
  });
});
