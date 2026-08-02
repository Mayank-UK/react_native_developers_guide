import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../design-system/theme-provider';
import { usePosts, isBlocking } from './use-posts';
import { container } from '../../core/container';
import { ApiScenario } from '../../core/scenario/api-scenario';
import { DbScenario } from '../../core/scenario/db-scenario';
import { FailureSeverity } from '../../core/error-handling/failures';
import {
  NetworkFailure,
  AuthFailure,
  CacheFailure,
} from '../../core/error-handling/failures';

/**
 * Hook + async-state tests for `usePosts` using RNTL's `renderHook`. The
 * global jest.setup.ts already wires the container with fakes (Success) before
 * each test, so the default path returns 3 canned posts.
 *
 * These cover the patterns the Testing screen cites: testing a hook that owns
 * an async state machine, `waitFor` for the settled state, and driving the
 * container's scenario knobs to exercise alternate branches.
 *
 * `usePosts` reads the container directly (no React context), but rendering a
 * hook still needs a React root; wrapping in ThemeProvider mirrors how the hook
 * runs in-app and keeps the test free of provider-order surprises.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('usePosts', () => {
  it('loads the canned posts on mount', async () => {
    const { result } = renderHook(() => usePosts(), { wrapper });
    // The auto-fetch effect fires on mount; we settle to the loaded state.
    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });
    if (result.current.state.status === 'loaded') {
      expect(result.current.state.posts).toHaveLength(3);
      expect(result.current.state.warning).toBeUndefined();
    }
  });

  it('exposes a fetch() that reloads from the container', async () => {
    const { result } = renderHook(() => usePosts(), { wrapper });
    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });

    act(() => {
      result.current.fetch();
    });
    // fetch dispatches 'loading' synchronously, then resolves back to 'loaded'.
    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });
  });

  it('surfaces a blocking failure when remote fails and cache is empty', async () => {
    container.setApiScenario(ApiScenario.ServerError);
    container.setDbScenario(DbScenario.Empty);

    const { result } = renderHook(() => usePosts(), { wrapper });
    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    if (result.current.state.status === 'error') {
      expect(result.current.state.failure.severity).toBe(FailureSeverity.Critical);
    }
  });

  it('surfaces a non-blocking warning when serving stale cache after a network error', async () => {
    // Prime the cache with a successful fetch, then force a network failure.
    const { result } = renderHook(() => usePosts(), { wrapper });
    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });

    container.setApiScenario(ApiScenario.NetworkError);
    act(() => {
      result.current.fetch();
    });
    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });
    if (result.current.state.status === 'loaded') {
      expect(result.current.state.warning).toBeDefined();
      expect(result.current.state.warning?.severity).toBe(FailureSeverity.Critical);
    }
  });
});

describe('isBlocking', () => {
  it('returns true for Critical severity and false otherwise', () => {
    // Real Failure subclasses carry concrete severities (see failures.ts).
    expect(isBlocking(new NetworkFailure())).toBe(true); // Critical
    expect(isBlocking(new AuthFailure())).toBe(false); // Warning
    expect(
      isBlocking(new CacheFailure(undefined, undefined, FailureSeverity.Info)),
    ).toBe(false); // Info
  });
});
