import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { ExceptionHandlingView } from './exception_handling_view';

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
import {
  usePipelineDemo,
  useChainInspector,
  exceptionForScenario,
  presentationFor,
} from './exception_handling_hooks';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import { NetworkException, ServerException } from '../../../core/error-handling/exceptions';

/**
 * Tests for the exception-handling view's LOGIC (the co-located hooks + pure
 * helpers) and a smoke render of the dumb view. The global jest.setup.ts wires
 * the container with fakes (Success) before each test.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('useChainInspector', () => {
  it('starts on the chained example (idx 2) and exposes three examples', () => {
    const { result } = renderHook(() => useChainInspector(), { wrapper });
    expect(result.current.idx).toBe(2);
    expect(result.current.examples).toHaveLength(3);
    expect(result.current.current).toBe(result.current.examples[2]);
  });

  it('switches the selected example via setIdx', () => {
    const { result } = renderHook(() => useChainInspector(), { wrapper });
    act(() => result.current.setIdx(0));
    expect(result.current.idx).toBe(0);
    expect(result.current.current.label).toContain('Blocking');
  });
});

describe('usePipelineDemo', () => {
  it('starts on Success/Success and resolves the live fetch to loaded', async () => {
    const { result } = renderHook(() => usePipelineDemo(), { wrapper });
    expect(result.current.api).toBe(ApiScenario.Success);
    expect(result.current.db).toBe(DbScenario.Success);
    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });
  });

  it('run() flips the knobs, drives the container, and refetches', async () => {
    const setApiSpy = jest.spyOn(container, 'setApiScenario');
    const setDbSpy = jest.spyOn(container, 'setDbScenario');
    const { result } = renderHook(() => usePipelineDemo(), { wrapper });

    act(() => result.current.run(ApiScenario.ServerError, DbScenario.Empty));

    expect(result.current.api).toBe(ApiScenario.ServerError);
    expect(result.current.db).toBe(DbScenario.Empty);
    expect(setApiSpy).toHaveBeenCalledWith(ApiScenario.ServerError);
    expect(setDbSpy).toHaveBeenCalledWith(DbScenario.Empty);
    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    setApiSpy.mockRestore();
    setDbSpy.mockRestore();
  });
});

describe('pure helpers', () => {
  it('maps each api scenario to the same exception the data layer throws', () => {
    expect(exceptionForScenario(ApiScenario.NetworkError)).toBeInstanceOf(NetworkException);
    expect(exceptionForScenario(ApiScenario.Timeout)).toBeInstanceOf(NetworkException);
    expect(exceptionForScenario(ApiScenario.ServerError)).toBeInstanceOf(ServerException);
    expect(exceptionForScenario(ApiScenario.InvalidJson)).toBeInstanceOf(ServerException);
  });

  it('picks a non-blocking toast only when stale cache is served', () => {
    expect(presentationFor(ApiScenario.Success, DbScenario.Success)).toMatch(/posts render/);
    expect(presentationFor(ApiScenario.NetworkError, DbScenario.Success)).toMatch(/toast/);
    expect(presentationFor(ApiScenario.NetworkError, DbScenario.Empty)).toMatch(/ShowError/);
    expect(presentationFor(ApiScenario.ServerError, DbScenario.ReadError)).toMatch(/chained/);
  });
});

describe('ExceptionHandlingView (smoke)', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<ExceptionHandlingView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
