import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { ArchitectureView } from './architecture_view';

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
  useInvariantExplorer,
  useLayerExplorer,
  useLiveTrace,
  isAllowed,
  LAYER_NAMES,
  type FolderNode,
} from './architecture_hooks';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';

/**
 * Tests for the architecture view's LOGIC (co-located hooks + the pure
 * isAllowed helper) and a smoke render of the dumb view. The global
 * jest.setup.ts wires the container with fakes (Success) before each test.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('useInvariantExplorer', () => {
  it('starts on the ui layer and switches', () => {
    const { result } = renderHook(() => useInvariantExplorer(), { wrapper });
    expect(result.current.row).toBe('ui');
    act(() => result.current.setRow('domain'));
    expect(result.current.row).toBe('domain');
  });
});

describe('isAllowed (the dependency invariant)', () => {
  it('forbids ui from importing data internals', () => {
    expect(isAllowed('ui', 'data/* internals')).toBe(false);
    expect(isAllowed('ui', 'domain/*')).toBe(true);
    expect(isAllowed('ui', 'container (resolve)')).toBe(true);
  });

  it('allows domain to import only result + failure types', () => {
    expect(isAllowed('domain', 'core/result')).toBe(true);
    expect(isAllowed('domain', 'core/error-handling')).toBe(true);
    expect(isAllowed('domain', 'react / react-native')).toBe(false);
  });

  it('keeps core independent of the other rings', () => {
    for (const target of LAYER_NAMES) {
      expect(isAllowed('core', target)).toBe(false);
    }
  });

  it('lets data depend on domain + core but not the framework', () => {
    expect(isAllowed('data', 'domain/*')).toBe(true);
    expect(isAllowed('data', 'react / react-native')).toBe(false);
  });
});

describe('useLayerExplorer', () => {
  const tree: ReadonlyArray<{ layer: string; nodes: ReadonlyArray<FolderNode> }> = [
    {
      layer: 'domain/',
      nodes: [
        { folder: 'models/', responsibility: 'a', files: [{ name: 'post.ts', role: 'r' }] },
        { folder: 'usecases/', responsibility: 'b', files: [{ name: 'u.ts', role: 'r' }] },
      ],
    },
    {
      layer: 'core/',
      nodes: [{ folder: 'result/', responsibility: 'c', files: [{ name: 'result.ts', role: 'r' }] }],
    },
  ];

  it('opens the first layer/folder by default and picks new ones', () => {
    const { result } = renderHook(() => useLayerExplorer(tree), { wrapper });
    expect(result.current.openLayer).toBe('domain/');
    expect(result.current.folder.folder).toBe('models/');
    act(() => result.current.pickLayer('core/'));
    expect(result.current.openLayer).toBe('core/');
    expect(result.current.openFolder).toBe('result/');
  });
});

describe('useLiveTrace', () => {
  it('resolves a success fetch and records trace entries', async () => {
    const setApiSpy = jest.spyOn(container, 'setApiScenario');
    const setDbSpy = jest.spyOn(container, 'setDbScenario');
    const { result } = renderHook(() => useLiveTrace(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });
    expect(result.current.log.length).toBeGreaterThan(0);

    act(() => result.current.run(ApiScenario.NetworkError, DbScenario.Empty));
    expect(setApiSpy).toHaveBeenCalledWith(ApiScenario.NetworkError);
    expect(setDbSpy).toHaveBeenCalledWith(DbScenario.Empty);
    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    setApiSpy.mockRestore();
    setDbSpy.mockRestore();
  });
});

describe('ArchitectureView (smoke)', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<ArchitectureView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
