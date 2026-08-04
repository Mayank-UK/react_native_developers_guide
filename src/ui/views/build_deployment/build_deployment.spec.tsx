import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { BuildDeploymentView } from './build_deployment_view';

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
  buildProfileSummary,
  releaseChecklist,
  useBuildPlayground,
  EAS_PROFILES,
} from './build_deployment_hooks';

/**
 * Tests for the build & deployment view's LOGIC (pure helpers + the
 * useBuildPlayground hook) and a smoke render of the dumb view.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('buildProfileSummary', () => {
  const summaries = buildProfileSummary();

  it('returns a summary for each of the three profiles', () => {
    expect(Object.keys(summaries).sort()).toEqual(
      ['development', 'production', 'staging'],
    );
  });

  it('mirrors the real eas.json for the development profile', () => {
    const dev = summaries.development;
    expect(dev.distribution).toBe('internal');
    expect(dev.developmentClient).toBe(true);
    expect(dev.autoIncrement).toBe(false);
    expect(dev.appEnv).toBe('dev');
  });

  it('mirrors the real eas.json for the staging profile', () => {
    const stg = summaries.staging;
    expect(stg.distribution).toBe('internal');
    expect(stg.developmentClient).toBe(false);
    expect(stg.autoIncrement).toBe(false);
    expect(stg.appEnv).toBe('staging');
  });

  it('mirrors the real eas.json for the production profile', () => {
    const prod = summaries.production;
    // production's distribution is implicit "store" (the store-release one).
    expect(prod.distribution).toBe('store');
    expect(prod.developmentClient).toBe(false);
    expect(prod.autoIncrement).toBe(true);
    expect(prod.appEnv).toBe('prod');
  });

  it('stays in sync with the EAS_PROFILES const-object mirror', () => {
    // If this fails, eas.json (mirrored by EAS_PROFILES) and the summary disagree.
    (Object.keys(EAS_PROFILES) as Array<keyof typeof EAS_PROFILES>).forEach(
      (name) => {
        const p = EAS_PROFILES[name];
        const s = summaries[name];
        expect(s.appEnv).toBe(p.env.APP_ENV);
        expect(s.developmentClient).toBe(p.developmentClient ?? false);
        expect(s.autoIncrement).toBe(p.autoIncrement ?? false);
      },
    );
  });
});

describe('releaseChecklist', () => {
  const steps = releaseChecklist();

  it('is non-empty and ordered starting at 1', () => {
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]?.order).toBe(1);
    expect(steps[steps.length - 1]?.order).toBe(steps.length);
  });

  it('has strictly increasing, contiguous order values', () => {
    const orders = steps.map((s) => s.order);
    for (let i = 1; i < orders.length; i += 1) {
      expect(orders[i]).toBe(orders[i - 1]! + 1);
    }
  });

  it('every step has a non-empty title + detail', () => {
    steps.forEach((s) => {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.detail.length).toBeGreaterThan(0);
    });
  });
});

describe('useBuildPlayground', () => {
  it('starts on the provided initial profile', () => {
    const { result } = renderHook(() => useBuildPlayground('staging'), {
      wrapper,
    });
    expect(result.current.profile).toBe('staging');
    expect(result.current.selected.appEnv).toBe('staging');
  });

  it('switching the profile changes the resolved summary', () => {
    const { result } = renderHook(() => useBuildPlayground('development'), {
      wrapper,
    });
    expect(result.current.selected.developmentClient).toBe(true);
    act(() => result.current.setProfile('production'));
    expect(result.current.profile).toBe('production');
    expect(result.current.selected.developmentClient).toBe(false);
    expect(result.current.selected.autoIncrement).toBe(true);
    expect(result.current.selected.distribution).toBe('store');
  });

  it('exposes all three profile summaries regardless of selection', () => {
    const { result } = renderHook(() => useBuildPlayground(), { wrapper });
    expect(Object.keys(result.current.summaries).sort()).toEqual(
      ['development', 'production', 'staging'],
    );
  });
});

describe('BuildDeploymentView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<BuildDeploymentView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
