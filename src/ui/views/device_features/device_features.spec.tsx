import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { DeviceFeaturesView } from './device_features_view';
import { PERMISSION_STATUS, deviceInfo, permissionLabel, statusOfPermission } from './device_features_hooks';

// The dumb view is wrapped in ScreenScaffold, which needs expo-router nav +
// SafeAreaProvider contexts. For this smoke test we only care that the view's
// own composition renders, so mock the scaffold + LinkCard (LinkCard uses
// expo-router's useRouter) to pass children through.
jest.mock('../../components/screen-scaffold', () => {
  const { View } = require('react-native');
  return {
    ScreenScaffold: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});
jest.mock('../../components/link-card', () => {
  const { View } = require('react-native');
  return {
    LinkCard: ({ title }: { title: string }) => <View>{title}</View>,
  };
});

/**
 * Tests for the device-features hub: the shared permission primitives (the
 * SSOT every per-feature sub-view consumes) + the pure `deviceInfo` readout +
 * a smoke render of the hub itself. Per-feature hook suites live in each
 * sub_view's own spec.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('permissionLabel', () => {
  it('labels each of the four lifecycle states', () => {
    expect(permissionLabel('granted')).toBe('Granted');
    expect(permissionLabel('denied')).toMatch(/Denied/);
    expect(permissionLabel('undetermined')).toMatch(/Not yet asked/);
    expect(permissionLabel('blocked')).toMatch(/Settings/);
  });
});

describe('PERMISSION_STATUS', () => {
  it('encodes the four-way lifecycle (const-object, not an enum)', () => {
    expect(PERMISSION_STATUS).toEqual({
      granted: 'granted',
      denied: 'denied',
      undetermined: 'undetermined',
      blocked: 'blocked',
    });
  });
});

describe('statusOfPermission', () => {
  it('treats null as undetermined', () => {
    expect(statusOfPermission(null)).toBe('undetermined');
  });

  it('maps granted/denied directly', () => {
    expect(statusOfPermission({ status: 'granted', granted: true, canAskAgain: true })).toBe('granted');
    expect(statusOfPermission({ status: 'denied', granted: false, canAskAgain: true })).toBe('denied');
  });

  it('collapses denied + !canAskAgain into blocked', () => {
    expect(statusOfPermission({ status: 'denied', granted: false, canAskAgain: false })).toBe('blocked');
  });
});

describe('deviceInfo', () => {
  it('returns numeric screen geometry + a platform string', () => {
    const info = deviceInfo();
    expect(typeof info.platform).toBe('string');
    expect(typeof info.screenWidth).toBe('number');
    expect(typeof info.screenHeight).toBe('number');
    expect(typeof info.pixelRatio).toBe('number');
    expect(info.screenWidth).toBeGreaterThan(0);
  });
});

describe('DeviceFeaturesView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<DeviceFeaturesView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
