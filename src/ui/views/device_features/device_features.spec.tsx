import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { DeviceFeaturesView } from './device_features_view';

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
  HAPTIC_OPTIONS,
  PERMISSION_STATUS,
  deviceInfo,
  permissionLabel,
  useHapticsDemo,
  useLocationDemo,
  useImagePickerDemo,
  useSecureStoreDemo,
} from './device_features_hooks';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

/**
 * Tests for the device-features view's LOGIC (the four co-located hooks + the
 * pure `permissionLabel` / `deviceInfo` / `HAPTIC_OPTIONS` helpers) and a smoke
 * render of the dumb view. The four native modules are globally mocked in
 * jest.mocks.ts (setupFiles); each mock's native calls are jest.fns we can
 * assert against.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

/* ------------------------------------------------------------------ */
/* pure helpers                                                       */
/* ------------------------------------------------------------------ */

describe('permissionLabel', () => {
  it('labels each of the four lifecycle states', () => {
    expect(permissionLabel('granted')).toBe('Granted');
    expect(permissionLabel('denied')).toMatch(/Denied/);
    expect(permissionLabel('undetermined')).toMatch(/Not yet asked/);
    expect(permissionLabel('blocked')).toMatch(/Settings/);
  });
});

describe('HAPTIC_OPTIONS', () => {
  it('covers impact, notification and selection primitives', () => {
    const keys = Object.keys(HAPTIC_OPTIONS);
    expect(keys.some((k) => k.startsWith('impact'))).toBe(true);
    expect(keys.some((k) => k.startsWith('notification'))).toBe(true);
    expect(keys).toContain('selection');
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

/* ------------------------------------------------------------------ */
/* useHapticsDemo                                                     */
/* ------------------------------------------------------------------ */

describe('useHapticsDemo', () => {
  it('fires the underlying native call for each kind and records the label', async () => {
    const { result } = renderHook(() => useHapticsDemo(), { wrapper });
    expect(result.current.last).toBeNull();

    await act(async () => {
      result.current.trigger('impactHeavy');
    });
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    expect(result.current.last).toBe(HAPTIC_OPTIONS.impactHeavy);

    await act(async () => {
      result.current.trigger('notificationSuccess');
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
    expect(result.current.last).toBe(HAPTIC_OPTIONS.notificationSuccess);

    await act(async () => {
      result.current.trigger('selection');
    });
    expect(Haptics.selectionAsync).toHaveBeenCalled();
    expect(result.current.last).toBe(HAPTIC_OPTIONS.selection);
  });
});

/* ------------------------------------------------------------------ */
/* useLocationDemo                                                    */
/* ------------------------------------------------------------------ */

describe('useLocationDemo', () => {
  it('reports granted (mocked) and resolves a fix on request', async () => {
    const { result } = renderHook(() => useLocationDemo(), { wrapper });
    expect(result.current.status).toBe('granted');
    expect(result.current.position).toBeNull();

    await act(async () => {
      await result.current.request();
    });
    expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    expect(result.current.position).not.toBeNull();
    expect(result.current.position?.latitude).toBe(1);
    expect(result.current.position?.longitude).toBe(2);
    expect(result.current.position?.accuracy).toBe(5);
  });

  it('refresh re-takes a fix when already granted', async () => {
    const { result } = renderHook(() => useLocationDemo(), { wrapper });
    await act(async () => {
      await result.current.refresh();
    });
    expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    expect(result.current.position?.latitude).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* useImagePickerDemo                                                 */
/* ------------------------------------------------------------------ */

describe('useImagePickerDemo', () => {
  it('reports granted (mocked) and resolves the picked asset on pick', async () => {
    const { result } = renderHook(() => useImagePickerDemo(), { wrapper });
    expect(result.current.status).toBe('granted');
    expect(result.current.asset).toBeNull();

    await act(async () => {
      await result.current.pick();
    });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(result.current.asset).not.toBeNull();
    expect(result.current.asset?.uri).toBe('mock://img.jpg');
    expect(result.current.asset?.width).toBe(100);
  });
});

/* ------------------------------------------------------------------ */
/* useSecureStoreDemo                                                 */
/* ------------------------------------------------------------------ */

describe('useSecureStoreDemo', () => {
  it('save writes through SecureStore and exposes the value, then clear deletes it', async () => {
    const { result } = renderHook(() => useSecureStoreDemo(), { wrapper });
    expect(result.current.value).toBeNull();

    await act(async () => {
      await result.current.save('token-123');
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('demo_secret'),
      'token-123',
    );
    expect(result.current.value).toBe('token-123');

    await act(async () => {
      await result.current.clear();
    });
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('demo_secret'),
    );
    expect(result.current.value).toBeNull();
  });

  it('read returns the stored value via SecureStore.getItemAsync', async () => {
    const { result } = renderHook(() => useSecureStoreDemo(), { wrapper });
    await act(async () => {
      await result.current.save('abc');
    });
    await act(async () => {
      await result.current.read();
    });
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('demo_secret'),
    );
    expect(result.current.value).toBe('abc');
  });
});

/* ------------------------------------------------------------------ */
/* DeviceFeaturesView (smoke)                                         */
/* ------------------------------------------------------------------ */

describe('DeviceFeaturesView (smoke)', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<DeviceFeaturesView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    // The image-picker card renders an async-pick button; let any pending
    // microtasks (the global mock's resolved promises) flush before unmount.
    await waitFor(() => undefined);
  });
});
