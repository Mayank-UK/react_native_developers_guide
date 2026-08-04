import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { LayoutView } from './layout_view';
import {
  DIRECTIONS,
  JUSTIFY,
  ALIGN,
  GAPS,
  useFlexDirection,
  useJustifyAlign,
  useFlexGrowToggle,
  useGapPicker,
  useStackToggle,
} from './layout_hooks';

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
 * Tests for the layout view's LOGIC (the co-located picker hooks) and a smoke
 * render of the dumb view.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('option arrays', () => {
  it('exposes the canonical flex direction / justify / align / gap option sets', () => {
    expect(DIRECTIONS).toEqual(['row', 'column', 'row-reverse', 'column-reverse']);
    expect(JUSTIFY).toContain('space-between');
    expect(ALIGN).toEqual(['flex-start', 'center', 'flex-end', 'stretch']);
    expect(GAPS).toEqual(['xxs', 'xs', 'sm', 'md', 'lg']);
  });
});

describe('useFlexDirection', () => {
  it('starts on row and switches', () => {
    const { result } = renderHook(() => useFlexDirection(), { wrapper });
    expect(result.current.dir).toBe('row');
    act(() => result.current.setDir('column'));
    expect(result.current.dir).toBe('column');
  });
});

describe('useJustifyAlign', () => {
  it('starts centered and updates each axis independently', () => {
    const { result } = renderHook(() => useJustifyAlign(), { wrapper });
    expect(result.current.justify).toBe('center');
    expect(result.current.align).toBe('center');
    act(() => result.current.setJustify('flex-end'));
    act(() => result.current.setAlign('stretch'));
    expect(result.current.justify).toBe('flex-end');
    expect(result.current.align).toBe('stretch');
  });
});

describe('useFlexGrowToggle', () => {
  it('starts true and toggles', () => {
    const { result } = renderHook(() => useFlexGrowToggle(), { wrapper });
    expect(result.current.growMiddle).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.growMiddle).toBe(false);
  });
});

describe('useGapPicker', () => {
  it('starts at md and switches token', () => {
    const { result } = renderHook(() => useGapPicker(), { wrapper });
    expect(result.current.gap).toBe('md');
    act(() => result.current.setGap('xs'));
    expect(result.current.gap).toBe('xs');
  });
});

describe('useStackToggle', () => {
  it('starts false and toggles', () => {
    const { result } = renderHook(() => useStackToggle(), { wrapper });
    expect(result.current.stack).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.stack).toBe(true);
  });
});

describe('LayoutView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<LayoutView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
