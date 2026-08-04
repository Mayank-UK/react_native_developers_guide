import { act, render, renderHook, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { AnimationsGesturesView } from './animations_gestures_view';
import {
  useAnimatedApiDemo,
  useReanimatedDemo,
  usePanCardDemo,
  decayFromVelocity,
} from './animations_gestures_hooks';

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

// react-native-gesture-handler's GestureDetector renders children; under jest
// we only need the tree to mount. Minimal mock — only the surface this view
// uses (GestureDetector + Gesture.Pan builder chain). The reanimated mock lives
// in jest.mocks.ts (setupFiles) so the hooks already see a JS-only surface.
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const chain = () => {
    const o = {
      onStart: () => o,
      onBegin: () => o,
      onUpdate: () => o,
      onEnd: () => o,
      onFinalize: () => o,
      finalize: () => o,
      enabled: () => o,
    };
    return o;
  };
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: { Pan: chain, Tap: chain, LongPress: chain, Pinch: chain },
    Swipeable: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: View,
  };
});

/**
 * Tests for the animations & gestures view's LOGIC (the co-located hooks +
 * pure helpers) and a smoke render of the dumb view. Reanimated + gesture-
 * handler are mocked (see above + jest.mocks.ts); the hooks exercise the same
 * code paths the real libs drive on device.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

/* ------------------------------------------------------------------ */
/* pure helper — decayFromVelocity                                     */
/* ------------------------------------------------------------------ */

describe('decayFromVelocity', () => {
  it('builds a withDecay config carrying the velocity + default deceleration', () => {
    const cfg = decayFromVelocity(420);
    expect(cfg.velocity).toBe(420);
    expect(cfg.deceleration).toBe(0.998);
  });

  it('honours an explicit deceleration argument', () => {
    expect(decayFromVelocity(-100, 0.9).deceleration).toBe(0.9);
  });
});

/* ------------------------------------------------------------------ */
/* useAnimatedApiDemo — built-in Animated                              */
/* ------------------------------------------------------------------ */

describe('useAnimatedApiDemo', () => {
  it('starts resting (expanded=false) with a stable Animated.Value', () => {
    const { result } = renderHook(() => useAnimatedApiDemo(), { wrapper });
    expect(result.current.expanded).toBe(false);
    // The Animated.Value is a stable object held across renders.
    expect(result.current.scale).toBeDefined();
  });

  it('toggle() flips expanded and reset() restores resting', () => {
    const { result } = renderHook(() => useAnimatedApiDemo(), { wrapper });
    // Animated.spring/.timing .start() is a no-op in jest without a driver;
    // we only assert the JS state mirror the hook maintains.
    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(false);
    act(() => result.current.reset());
    expect(result.current.expanded).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* useReanimatedDemo — Reanimated v3                                   */
/* ------------------------------------------------------------------ */

describe('useReanimatedDemo', () => {
  it('exposes a shared value starting at 0 and a press toggle', () => {
    const { result } = renderHook(() => useReanimatedDemo(), { wrapper });
    // The mock useSharedValue returns a plain { value } — readable here.
    expect(result.current.progress.value).toBe(0);
    expect(typeof result.current.press).toBe('function');
    expect(result.current.expanded).toBe(false);
  });

  it('press() flips expanded and timingTo() writes the shared value', () => {
    const { result } = renderHook(() => useReanimatedDemo(), { wrapper });
    act(() => result.current.press());
    expect(result.current.expanded).toBe(true);
    // withTiming in the mock is the identity fn, so the value lands directly.
    act(() => result.current.timingTo(0.5));
    expect(result.current.progress.value).toBe(0.5);
  });
});

/* ------------------------------------------------------------------ */
/* usePanCardDemo — gesture-driven card                                */
/* ------------------------------------------------------------------ */

describe('usePanCardDemo', () => {
  it('starts idle at origin with a composed gesture object', () => {
    const { result } = renderHook(() => usePanCardDemo(), { wrapper });
    expect(result.current.offsetX.value).toBe(0);
    expect(result.current.offsetY.value).toBe(0);
    expect(result.current.dragging).toBe(false);
    // The Gesture.Pan() builder mock returns a chainable object.
    expect(result.current.gesture).toBeDefined();
  });

  it('reset() keeps the card at origin and clears the dragging flag', () => {
    const { result } = renderHook(() => usePanCardDemo(), { wrapper });
    act(() => result.current.reset());
    expect(result.current.offsetX.value).toBe(0);
    expect(result.current.dragging).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* View smoke render + interaction                                     */
/* ------------------------------------------------------------------ */

describe('AnimationsGesturesView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON, unmount } = render(<AnimationsGesturesView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    unmount();
  });

  it('the built-in Animated demo toggle flips its pill label', () => {
    const { getByTestId, getAllByText, queryByText, unmount } = render(
      <AnimationsGesturesView />,
      { wrapper },
    );
    // Two demos show a "resting" pill initially (Animated + Reanimated).
    expect(getAllByText('resting').length).toBe(2);
    // Press the Animated demo's toggle (disambiguated by testID).
    fireEvent.press(getByTestId('animated-api-toggle'));
    // The Animated pill flips to "expanded" — so only one "resting" remains.
    expect(queryByText('expanded')).toBeTruthy();
    expect(getAllByText('resting').length).toBe(1);
    unmount();
  });

  it('the Reanimated demo toggle flips its pill label', () => {
    const { getByTestId, getAllByText, queryByText, unmount } = render(
      <AnimationsGesturesView />,
      { wrapper },
    );
    // Two "resting" pills initially.
    expect(getAllByText('resting').length).toBe(2);
    // Press the Reanimated demo's toggle (disambiguated by testID).
    fireEvent.press(getByTestId('reanimated-toggle'));
    expect(queryByText('expanded')).toBeTruthy();
    expect(getAllByText('resting').length).toBe(1);
    unmount();
  });
});
