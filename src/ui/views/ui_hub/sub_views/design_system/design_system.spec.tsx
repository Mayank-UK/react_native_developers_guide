import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { DesignSystemView } from './design_system_view';
import {
  paletteSwatches,
  modeWord,
  usePressedState,
} from './design_system_hooks';
import { LightPalette, DarkPalette } from '../../../../design-system/tokens';

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

/**
 * Tests for the design-system view's LOGIC (the Button-anatomy pressed-state
 * hook + the pure swatch/mode helpers) and a smoke render of the dumb view.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('paletteSwatches', () => {
  it('builds the canonical 10-entry swatch list from a palette', () => {
    const light = paletteSwatches(LightPalette);
    expect(light).toHaveLength(10);
    expect(light[0]).toEqual(['background', LightPalette.background]);
    expect(light.find(([n]) => n === 'primary')![1]).toBe(LightPalette.primary);
    expect(light.find(([n]) => n === 'info')).toBeUndefined();

    const dark = paletteSwatches(DarkPalette);
    expect(dark.find(([n]) => n === 'danger')![1]).toBe(DarkPalette.danger);
  });
});

describe('modeWord', () => {
  it('returns the human-readable mode name', () => {
    expect(modeWord('light')).toBe('light');
    expect(modeWord('dark')).toBe('dark');
  });
});

describe('usePressedState', () => {
  it('starts unpressed and tracks press-in / press-out', () => {
    const { result } = renderHook(() => usePressedState(), { wrapper });
    expect(result.current.pressed).toBe(false);
    act(() => result.current.onPressIn());
    expect(result.current.pressed).toBe(true);
    act(() => result.current.onPressOut());
    expect(result.current.pressed).toBe(false);
  });
});

describe('DesignSystemView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<DesignSystemView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
