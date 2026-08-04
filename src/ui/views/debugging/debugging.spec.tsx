import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { DebuggingView } from './debugging_view';

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
  useDevLog,
  useLoggerPanel,
  useScenarioKnob,
  useElementInspector,
  LEVEL_PRIORITY,
  LEVEL_TONE,
} from './debugging_hooks';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';

/**
 * Tests for the debugging view's LOGIC (the co-located hooks + pure level
 * helpers) and a smoke render of the dumb view. The global jest.setup.ts wires
 * the container with fakes (Success) before each test.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('LEVEL helpers', () => {
  it('orders severities by priority', () => {
    expect(LEVEL_PRIORITY.debug).toBeLessThan(LEVEL_PRIORITY.info);
    expect(LEVEL_PRIORITY.info).toBeLessThan(LEVEL_PRIORITY.warning);
    expect(LEVEL_PRIORITY.warning).toBeLessThan(LEVEL_PRIORITY.error);
  });

  it('maps warning to danger (shared Pill has no warning tone)', () => {
    expect(LEVEL_TONE.debug).toBe('muted');
    expect(LEVEL_TONE.info).toBe('primary');
    expect(LEVEL_TONE.warning).toBe('danger');
    expect(LEVEL_TONE.error).toBe('danger');
  });
});

describe('useDevLog', () => {
  it('appends a timestamped entry and mirrors to console', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result } = renderHook(() => useDevLog(), { wrapper });
    act(() => result.current.log('info', 'dev', 'hello'));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]!.message).toBe('hello');
    expect(result.current.entries[0]!.tag).toBe('dev');
    expect(spy).toHaveBeenCalledWith('[dev] INFO: hello');
    spy.mockRestore();
  });

  it('clear() empties the buffer', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result } = renderHook(() => useDevLog(), { wrapper });
    act(() => result.current.log('debug', 't', 'x'));
    act(() => result.current.clear());
    expect(result.current.entries).toHaveLength(0);
    spy.mockRestore();
  });
});

describe('useLoggerPanel', () => {
  it('starts unfiltered and narrows by minimum severity', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result } = renderHook(() => useLoggerPanel(), { wrapper });
    act(() => {
      result.current.log('debug', 't', 'd');
      result.current.log('error', 't', 'e');
    });
    expect(result.current.visible).toHaveLength(2);
    act(() => result.current.setFilter('error'));
    expect(result.current.visible).toHaveLength(1);
    expect(result.current.visible[0]!.level).toBe('error');
    spy.mockRestore();
  });
});

describe('useScenarioKnob', () => {
  it('resolves the live fetch and logs the loaded transition', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result } = renderHook(() => useScenarioKnob(), { wrapper });
    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });
    expect(result.current.entries.some((e) => /Success\(\d+ posts\)/.test(e.message))).toBe(true);
    spy.mockRestore();
  });

  it('run() drives the container knobs and forces a blocking failure', async () => {
    const setApiSpy = jest.spyOn(container, 'setApiScenario');
    const setDbSpy = jest.spyOn(container, 'setDbScenario');
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result } = renderHook(() => useScenarioKnob(), { wrapper });

    act(() => result.current.run(ApiScenario.NetworkError, DbScenario.Empty, 'blocking'));
    expect(setApiSpy).toHaveBeenCalledWith(ApiScenario.NetworkError);
    expect(setDbSpy).toHaveBeenCalledWith(DbScenario.Empty);
    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    expect(result.current.entries.some((e) => /Failed:/.test(e.message))).toBe(true);
    setApiSpy.mockRestore();
    setDbSpy.mockRestore();
    spy.mockRestore();
  });
});

describe('useElementInspector', () => {
  it('starts at the initial index and switches', () => {
    const { result } = renderHook(() => useElementInspector(2), { wrapper });
    expect(result.current.selected).toBe(2);
    act(() => result.current.setSelected(0));
    expect(result.current.selected).toBe(0);
  });
});

describe('DebuggingView (smoke)', () => {
  it('renders without crashing', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { toJSON } = render(<DebuggingView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    spy.mockRestore();
  });
});
