import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { ServerStateView } from './server_state_view';
import {
  SERVER_STATE_SCENARIOS,
  fetchPosts,
  usePostsCacheProof,
  usePostsQuery,
  useServerStateDemo,
} from './server_state_hooks';
import { container } from '../../../../../core/container';
import { ApiScenario } from '../../../../../core/scenario/api-scenario';
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
 * Tests for the server-state view's LOGIC (fetchPosts + the TanStack Query
 * hooks + the demo knob) and a smoke render of the dumb view. The global
 * jest.setup.ts wires the container with fakes (Success) before each test.
 */

const themeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

function queryWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('fetchPosts', () => {
  it('unwraps a successful Result into data', async () => {
    const posts = await fetchPosts();
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);
  });

  it('throws when the usecase returns a failed Result', async () => {
    container.setApiScenario(ApiScenario.NetworkError);
    await expect(fetchPosts()).rejects.toThrow();
    container.setApiScenario(ApiScenario.Success);
  });
});

describe('usePostsQuery', () => {
  it('resolves to success with cached posts', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => usePostsQuery(), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect((result.current.data ?? []).length).toBeGreaterThan(0);
    unmount();
    client.clear();
  });
});

describe('usePostsCacheProof', () => {
  it('shares the cache via the same query key', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => usePostsCacheProof(), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    unmount();
    client.clear();
  });
});

describe('useServerStateDemo', () => {
  it('creates a queryClient, starts on Success, and drives the container knob', () => {
    const spy = jest.spyOn(container, 'setApiScenario');
    const { result } = renderHook(() => useServerStateDemo(), { wrapper: themeWrapper });
    expect(result.current.scenario).toBe(ApiScenario.Success);
    expect(result.current.queryClient).toBeInstanceOf(QueryClient);
    expect(typeof result.current.QueryClientProvider).toBe('function');
    act(() => result.current.setScenarioAndLog(ApiScenario.ServerError));
    expect(result.current.scenario).toBe(ApiScenario.ServerError);
    expect(spy).toHaveBeenCalledWith(ApiScenario.ServerError);
    expect(SERVER_STATE_SCENARIOS).toContain(ApiScenario.ServerError);
    spy.mockRestore();
  });
});

describe('ServerStateView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON, unmount } = render(<ServerStateView />, { wrapper: themeWrapper });
    expect(toJSON()).toBeTruthy();
    // The view mounts a live TanStack Query provider; unmount to avoid
    // leaking async work into the jest worker.
    unmount();
  });
});
