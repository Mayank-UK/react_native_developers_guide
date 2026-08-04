import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { ApiHandlingView } from './api_handling_view';

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
import { useApiHandlingDemo, labelFor } from './api_handling_hooks';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';

/**
 * Tests for the api-handling view's LOGIC (the co-located hook + pure helper)
 * and a smoke render of the dumb view. The global jest.setup.ts wires the
 * container with fakes (Success) before each test.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('labelFor (pure helper)', () => {
  it('returns a human-readable label for every scenario', () => {
    expect(labelFor(ApiScenario.Success)).toBe('Success');
    expect(labelFor(ApiScenario.NetworkError)).toBe('Network');
    expect(labelFor(ApiScenario.Timeout)).toBe('Timeout');
    expect(labelFor(ApiScenario.ServerError)).toBe('Server');
    expect(labelFor(ApiScenario.InvalidJson)).toBe('Bad JSON');
  });
});

describe('useApiHandlingDemo', () => {
  it('resolves the live fetch to loaded under the default Success scenario', async () => {
    const { result } = renderHook(() => useApiHandlingDemo(), { wrapper });
    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });
    expect(result.current.apiScenario).toBe(ApiScenario.Success);
  });

  it('setScenario drives the container and forces a cache miss', async () => {
    const setApiSpy = jest.spyOn(container, 'setApiScenario');
    const setDbSpy = jest.spyOn(container, 'setDbScenario');
    const { result } = renderHook(() => useApiHandlingDemo(), { wrapper });

    act(() => result.current.setScenario(ApiScenario.ServerError));

    expect(setApiSpy).toHaveBeenCalledWith(ApiScenario.ServerError);
    expect(setDbSpy).toHaveBeenCalledWith(DbScenario.Empty);
    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    setApiSpy.mockRestore();
    setDbSpy.mockRestore();
  });

  it('toggleSource flips the fake/live source and refetches', async () => {
    const before = container.getUseFakeApi();
    const setSourceSpy = jest.spyOn(container, 'setUseFakeApi');
    const { result } = renderHook(() => useApiHandlingDemo(), { wrapper });

    act(() => result.current.toggleSource());

    expect(setSourceSpy).toHaveBeenCalledWith(!before);
    setSourceSpy.mockRestore();
  });
});

describe('ApiHandlingView (smoke)', () => {
  it('renders without crashing', async () => {
    const { toJSON, unmount } = render(<ApiHandlingView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    // The view mounts no intervals/subscriptions of its own beyond what the
    // scaffold owns, but unmount to keep the test tidy.
    unmount();
  });
});
