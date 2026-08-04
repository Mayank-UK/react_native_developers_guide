import { act, render, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { PlatformSpecificView } from './platform_specific_view';

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
  platformFacts,
  selectByPlatform,
  usePlatformDemo,
  PLATFORM_LABELS,
} from './platform_specific_hooks';
import { platformMessage, nativeGreeting } from './platform_message';

/**
 * Tests for the platform-specific view's LOGIC (pure helpers + the demo hook)
 * and a smoke render of the dumb view. `Platform.OS` is 'ios' under jest-expo
 * by default; the pure helpers take an explicit `os` so the android/web branches
 * are reachable without mocking the module.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

/* ------------------------------------------------------------------ */
/* pure helpers — platformFacts                                        */
/* ------------------------------------------------------------------ */

describe('platformFacts', () => {
  it('reads the real Platform.OS when no override is passed', () => {
    const facts = platformFacts({ os: 'ios' });
    expect(facts.os).toBe('ios');
    expect(typeof facts.pixelRatio).toBe('number');
    expect(facts.window).toHaveProperty('width');
    expect(facts.window).toHaveProperty('height');
  });

  it('honours explicit overrides (deterministic for tests)', () => {
    const facts = platformFacts({ os: 'android', version: 34 });
    expect(facts.os).toBe('android');
    expect(facts.version).toBe(34);
  });

  it('accepts an injected window so Dimensions does not have to be mocked', () => {
    const facts = platformFacts({}, { width: 400, height: 800, scale: 2, fontScale: 1 });
    expect(facts.window).toEqual({ width: 400, height: 800, scale: 2, fontScale: 1 });
  });
});

/* ------------------------------------------------------------------ */
/* pure helpers — selectByPlatform                                     */
/* ------------------------------------------------------------------ */

describe('selectByPlatform', () => {
  it('returns the ios value on ios', () => {
    expect(selectByPlatform('I', 'A', 'W', 'ios')).toBe('I');
  });

  it('returns the android value on android', () => {
    expect(selectByPlatform('I', 'A', 'W', 'android')).toBe('A');
  });

  it('returns the web value on web when provided', () => {
    expect(selectByPlatform('I', 'A', 'W', 'web')).toBe('W');
  });

  it('returns undefined on web when no web value is given', () => {
    expect(selectByPlatform('I', 'A', undefined, 'web')).toBeUndefined();
  });

  it('returns undefined for an unknown platform', () => {
    expect(selectByPlatform('I', 'A', 'W', 'macos')).toBeUndefined();
  });

  it('uses the live Platform.OS by default', () => {
    const live = selectByPlatform(PLATFORM_LABELS.ios, PLATFORM_LABELS.android, PLATFORM_LABELS.web);
    // jest-expo defaults Platform.OS to 'ios'.
    expect(live).toBe(PLATFORM_LABELS.ios);
    expect(Platform.OS).toBe('ios');
  });
});

/* ------------------------------------------------------------------ */
/* usePlatformDemo                                                     */
/* ------------------------------------------------------------------ */

describe('usePlatformDemo', () => {
  it('exposes resolved platform facts + a per-platform example label', () => {
    const { result } = renderHook(() => usePlatformDemo(), { wrapper });
    expect(result.current.facts.os).toBe('ios');
    expect(result.current.example).toBe(PLATFORM_LABELS.ios);
  });

  it('surfaces the resolved platform_message.* import (the extension demo)', () => {
    const { result } = renderHook(() => usePlatformDemo(), { wrapper });
    // Under jest the plain .ts fallback resolves; on a device build Metro picks
    // the .ios/.android sibling. Both export the same names.
    expect(typeof result.current.resolvedMessage).toBe('string');
    expect(result.current.resolvedGreeting).toBe(nativeGreeting);
    expect(result.current.resolvedMessage).toBe(platformMessage);
  });

  it('toggle starts false and flips via setToggle', () => {
    const { result } = renderHook(() => usePlatformDemo(), { wrapper });
    expect(result.current.toggle).toBe(false);
    act(() => result.current.setToggle(true));
    expect(result.current.toggle).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* platform_message extension pair                                     */
/* ------------------------------------------------------------------ */

describe('platform_message module', () => {
  it('exports the two documented names', () => {
    expect(typeof platformMessage).toBe('string');
    expect(typeof nativeGreeting).toBe('string');
  });
});

/* ------------------------------------------------------------------ */
/* view smoke test                                                     */
/* ------------------------------------------------------------------ */

describe('PlatformSpecificView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<PlatformSpecificView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
