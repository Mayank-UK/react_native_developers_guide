import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { DependencyManagementView } from './dependency_management_view';

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
  useLiveGraphDemo,
  useLiveToggleDemo,
  useResolveInspectorDemo,
  readLiveGraph,
  resolveClassName,
  accessorFor,
} from './dependency_management_hooks';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';

/**
 * Tests for the dependency-management view's LOGIC (co-located hooks + pure
 * container-touching helpers) and a smoke render of the dumb view. The global
 * jest.setup.ts wires the container with fakes (Success) before each test.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const GRAPH_ROW_NAMES = [
  { name: 'AppConfig' },
  { name: 'Logger' },
  { name: 'HttpClient' },
  { name: 'PostRemoteDataSource' },
  { name: 'AppDatabase' },
  { name: 'PostRepository' },
  { name: 'GetPostsUseCase' },
];

describe('readLiveGraph + resolveClassName', () => {
  it('resolves every accessor to a non-empty class name', () => {
    const rows = readLiveGraph();
    expect(rows).toHaveLength(7);
    for (const r of rows) {
      expect(r.cls.length).toBeGreaterThan(0);
    }
  });

  it('resolveClassName matches the live graph for each registered name', () => {
    for (const r of readLiveGraph()) {
      if (r.name === 'AppConfig') continue; // AppConfig is a special-cased label
      expect(resolveClassName(r.name)).toBe(r.cls);
    }
  });

  it('resolveClassName handles unknown names gracefully', () => {
    expect(resolveClassName('NoSuch')).toBe('(not registered)');
  });
});

describe('accessorFor', () => {
  it('maps each registered name to its container accessor', () => {
    expect(accessorFor('AppConfig')).toBe('appConfig');
    expect(accessorFor('GetPostsUseCase')).toBe('getPostsUseCase');
    expect(accessorFor('PostRepository')).toBe('postRepository');
    expect(accessorFor('?')).toBe('?');
  });
});

describe('useLiveGraphDemo', () => {
  it('starts at resolve pass #1 and re-resolves on demand', () => {
    const { result } = renderHook(() => useLiveGraphDemo(), { wrapper });
    expect(result.current.tick).toBe(0);
    act(() => result.current.reResolve());
    expect(result.current.tick).toBe(1);
  });
});

describe('useLiveToggleDemo', () => {
  it('reflects the current useFakeApi flag', () => {
    const { result } = renderHook(() => useLiveToggleDemo(), { wrapper });
    expect(typeof result.current.useFake).toBe('boolean');
  });
});

describe('useResolveInspectorDemo', () => {
  it('starts on the first entry and applies scenario knobs', () => {
    const setApiSpy = jest.spyOn(container, 'setApiScenario');
    const setDbSpy = jest.spyOn(container, 'setDbScenario');
    const { result } = renderHook(
      () => useResolveInspectorDemo(GRAPH_ROW_NAMES),
      { wrapper },
    );
    expect(result.current.entry).toBe('AppConfig');
    act(() => result.current.setEntry('Logger'));
    expect(result.current.entry).toBe('Logger');
    act(() => result.current.applyApi(ApiScenario.ServerError));
    expect(setApiSpy).toHaveBeenCalledWith(ApiScenario.ServerError);
    act(() => result.current.applyDb(DbScenario.ReadError));
    expect(setDbSpy).toHaveBeenCalledWith(DbScenario.ReadError);
    setApiSpy.mockRestore();
    setDbSpy.mockRestore();
  });
});

describe('DependencyManagementView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<DependencyManagementView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
