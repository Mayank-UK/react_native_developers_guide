import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { ResponsiveView } from './responsive_view';
import {
  breakpoint,
  columnsFor,
  orientationOf,
  useKeyboardDemoText,
} from './responsive_hooks';

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
 * Tests for the responsive view's LOGIC (the pure breakpoint math + the
 * keyboard-demo text hook) and a smoke render of the dumb view.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('breakpoint', () => {
  it('buckets widths into sm / md / lg at the documented thresholds', () => {
    expect(breakpoint(0)).toBe('sm');
    expect(breakpoint(479)).toBe('sm');
    expect(breakpoint(480)).toBe('md');
    expect(breakpoint(899)).toBe('md');
    expect(breakpoint(900)).toBe('lg');
    expect(breakpoint(1280)).toBe('lg');
  });
});

describe('columnsFor', () => {
  it('maps breakpoints to 1 / 2 / 3 columns', () => {
    expect(columnsFor(320)).toBe(1);
    expect(columnsFor(480)).toBe(2);
    expect(columnsFor(900)).toBe(3);
    expect(columnsFor(1440)).toBe(3);
  });
});

describe('orientationOf', () => {
  it('derives portrait vs landscape from width vs height', () => {
    expect(orientationOf(400, 800)).toBe('portrait');
    expect(orientationOf(800, 400)).toBe('landscape');
    expect(orientationOf(600, 600)).toBe('landscape');
  });
});

describe('useKeyboardDemoText', () => {
  it('starts empty and updates', () => {
    const { result } = renderHook(() => useKeyboardDemoText(), { wrapper });
    expect(result.current.text).toBe('');
    act(() => result.current.setText('hi'));
    expect(result.current.text).toBe('hi');
  });
});

describe('ResponsiveView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ResponsiveView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
