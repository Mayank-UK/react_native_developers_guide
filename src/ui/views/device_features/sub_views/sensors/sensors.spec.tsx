import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { SensorsView } from './sensors_view';
import { UPDATE_INTERVALS, useAccelerometerDemo } from './sensors_hooks';
import { Accelerometer } from 'expo-sensors';

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

// Reach the mock's internal emitter to drive a synthetic sample into the
// subscription registered by the hook under test.
const sensorsMock = (require('expo-sensors') as {
  __emit: (r: { x: number; y: number; z: number }) => void;
});

describe('useAccelerometerDemo', () => {
  it('starts streaming and applies the cadence via setUpdateInterval', () => {
    const { result } = renderHook(() => useAccelerometerDemo(), { wrapper });
    expect(result.current.active).toBe(true);
    expect(result.current.reading).toBeNull();
    expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(UPDATE_INTERVALS.ui);
    expect(Accelerometer.addListener).toHaveBeenCalled();
  });

  it('emits a sample into the subscription and records the reading', () => {
    const { result } = renderHook(() => useAccelerometerDemo(), { wrapper });
    act(() => {
      sensorsMock.__emit({ x: 1.5, y: -0.5, z: 9.81 });
    });
    expect(result.current.reading).toEqual({ x: 1.5, y: -0.5, z: 9.81 });
  });

  it('changing interval re-applies setUpdateInterval', () => {
    const { result } = renderHook(() => useAccelerometerDemo(), { wrapper });
    act(() => {
      result.current.setInterval('fastest');
    });
    expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(UPDATE_INTERVALS.fastest);
  });

  it('pause stops the subscription (teardown) and resume recreates it', () => {
    const { result } = renderHook(() => useAccelerometerDemo(), { wrapper });
    const initialAddCalls = (Accelerometer.addListener as jest.Mock).mock.calls.length;
    act(() => {
      result.current.pause();
    });
    expect(result.current.active).toBe(false);
    act(() => {
      result.current.resume();
    });
    expect(result.current.active).toBe(true);
    expect((Accelerometer.addListener as jest.Mock).mock.calls.length).toBeGreaterThan(initialAddCalls);
  });
});

describe('SensorsView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<SensorsView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
