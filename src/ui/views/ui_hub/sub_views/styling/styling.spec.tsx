import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { StylingView } from './styling_view';
import { paletteSwatches, useCopiedFlag } from './styling_hooks';
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
 * Tests for the styling view's LOGIC (the copy-feedback hook + the pure
 * palette-swatch builder) and a smoke render of the dumb view.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('paletteSwatches', () => {
  it('builds the canonical swatch list from a palette', () => {
    const light = paletteSwatches(LightPalette);
    expect(light[0]).toEqual(['background', LightPalette.background]);
    expect(light.find(([n]) => n === 'primary')![1]).toBe(LightPalette.primary);
    expect(light).toHaveLength(11);

    const dark = paletteSwatches(DarkPalette);
    expect(dark.find(([n]) => n === 'primary')![1]).toBe(DarkPalette.primary);
  });
});

describe('useCopiedFlag', () => {
  it('starts false, flips true on copy(), resets after the timeout', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useCopiedFlag(800), { wrapper });
    expect(result.current.copied).toBe(false);
    act(() => result.current.copy());
    expect(result.current.copied).toBe(true);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(result.current.copied).toBe(false);
    jest.useRealTimers();
  });

  it('re-arming copy() before the timeout keeps copied true', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useCopiedFlag(800), { wrapper });
    act(() => result.current.copy());
    act(() => jest.advanceTimersByTime(400));
    act(() => result.current.copy());
    act(() => jest.advanceTimersByTime(400));
    expect(result.current.copied).toBe(true);
    act(() => jest.advanceTimersByTime(400));
    expect(result.current.copied).toBe(false);
    jest.useRealTimers();
  });
});

describe('StylingView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<StylingView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
