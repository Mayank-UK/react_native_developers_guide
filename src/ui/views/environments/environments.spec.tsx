import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { EnvironmentsView } from './environments_view';

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
  readLiveConfig,
  useLiveResolved,
  useFlagPlayground,
} from './environments_hooks';
import { container } from '../../../core/container';

/**
 * Tests for the environments view's LOGIC (the co-located hooks + the pure
 * readLiveConfig helper) and a smoke render of the dumb view. The global
 * jest.setup.ts wires the container with a dev config before each test.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('readLiveConfig', () => {
  it('reads the resolved AppConfig from the container', () => {
    const { config } = readLiveConfig();
    expect(config).toBe(container.appConfig);
    expect(config.environment).toBe('dev');
  });

  it('falls back to "(unknown)" strings when expo-constants has no identity', () => {
    const { appName, bundleId, androidPackage } = readLiveConfig();
    // In the jest environment expo-constants has no build identity, so each
    // field degrades gracefully to the placeholder.
    expect(['(unknown)', undefined]).toContain(appName);
    expect(['(unknown)', undefined]).toContain(bundleId);
    expect(['(unknown)', undefined]).toContain(androidPackage);
  });
});

describe('useLiveResolved', () => {
  it('exposes the live config and a re-read trigger', () => {
    const { result } = renderHook(() => useLiveResolved(), { wrapper });
    expect(result.current.live.config.environment).toBe('dev');
    act(() => result.current.reread());
    // re-read should not throw and should keep the same env.
    expect(result.current.live.config.environment).toBe('dev');
  });
});

describe('useFlagPlayground', () => {
  it('starts with the dev panel open and verbose === config.enableLogs', () => {
    const { result } = renderHook(() => useFlagPlayground(), { wrapper });
    expect(result.current.devPanel).toBe(true);
    expect(result.current.verbose).toBe(container.appConfig.enableLogs);
  });

  it('toggles devPanel and verbose', () => {
    const { result } = renderHook(() => useFlagPlayground(), { wrapper });
    act(() => result.current.setDevPanel(false));
    expect(result.current.devPanel).toBe(false);
    act(() => result.current.setVerbose(true));
    expect(result.current.verbose).toBe(true);
  });

  it('reads the live container scenario knobs', () => {
    const { result } = renderHook(() => useFlagPlayground(), { wrapper });
    expect(result.current.apiScenario).toBe(container.getApiScenario());
    expect(result.current.dbScenario).toBe(container.getDbScenario());
    expect(result.current.useFakeApi).toBe(container.getUseFakeApi());
  });
});

describe('EnvironmentsView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<EnvironmentsView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
