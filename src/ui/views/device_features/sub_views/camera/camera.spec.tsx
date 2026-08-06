import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { CameraView } from './camera_view';
import { useCameraDemo } from './camera_hooks';
import * as ImagePicker from 'expo-image-picker';

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

describe('useCameraDemo', () => {
  it('reports both permissions granted (mocked) and resolves the picked asset on pick', async () => {
    const { result } = renderHook(() => useCameraDemo(), { wrapper });
    expect(result.current.mediaStatus).toBe('granted');
    expect(result.current.cameraStatus).toBe('granted');
    expect(result.current.asset).toBeNull();

    await act(async () => {
      await result.current.pick();
    });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(result.current.asset).not.toBeNull();
    expect(result.current.asset?.uri).toBe('mock://img.jpg');
    expect(result.current.asset?.width).toBe(100);
  });

  it('capture resolves the asset via launchCameraAsync', async () => {
    const { result } = renderHook(() => useCameraDemo(), { wrapper });
    await act(async () => {
      await result.current.capture();
    });
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    expect(result.current.asset).not.toBeNull();
    expect(result.current.asset?.uri).toBe('mock://img.jpg');
  });
});

describe('CameraView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CameraView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
