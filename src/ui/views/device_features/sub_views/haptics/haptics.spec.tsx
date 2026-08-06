import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { HapticsView } from './haptics_view';
import { HAPTIC_OPTIONS, useHapticsDemo } from './haptics_hooks';
import * as Haptics from 'expo-haptics';

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

describe('HAPTIC_OPTIONS', () => {
  it('covers impact, notification and selection primitives', () => {
    const keys = Object.keys(HAPTIC_OPTIONS);
    expect(keys.some((k) => k.startsWith('impact'))).toBe(true);
    expect(keys.some((k) => k.startsWith('notification'))).toBe(true);
    expect(keys).toContain('selection');
  });
});

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

describe('HapticsView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HapticsView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
