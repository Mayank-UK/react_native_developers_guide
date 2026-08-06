import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { GeolocationView } from './geolocation_view';
import { useLocationDemo } from './geolocation_hooks';
import * as Location from 'expo-location';

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

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

describe('GeolocationView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<GeolocationView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
