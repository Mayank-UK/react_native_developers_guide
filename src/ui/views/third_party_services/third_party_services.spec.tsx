import { act, render, renderHook, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { ThirdPartyServicesView } from './third_party_services_view';

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
  INTEGRATION_STATUS,
  SERVICE_CATEGORIES,
  MockAnalytics,
  integrationMaturity,
  redactSecret,
  serviceCategoryLabel,
  useAnalyticsPlayground,
} from './third_party_services_hooks';

/**
 * Tests for the third-party services view's LOGIC (pure helpers + the
 * useAnalyticsPlayground hook + the MockAnalytics port adapter) and a smoke
 * render of the dumb view. No module mocks needed — no third-party SDK is
 * imported; MockAnalytics is pure JS.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('serviceCategoryLabel (pure)', () => {
  it('labels each category', () => {
    expect(serviceCategoryLabel(SERVICE_CATEGORIES.analytics)).toBe('Analytics');
    expect(serviceCategoryLabel(SERVICE_CATEGORIES.crashReporting)).toBe('Crash reporting');
    expect(serviceCategoryLabel(SERVICE_CATEGORIES.auth)).toBe('Auth (OAuth)');
    expect(serviceCategoryLabel(SERVICE_CATEGORIES.payments)).toBe('Payments');
  });
});

describe('redactSecret (pure)', () => {
  it('masks the middle of a long token, preserving head + tail', () => {
    expect(redactSecret('sk_live_AbC123XyZ987secret')).toBe('sk…et');
  });

  it('fully masks short or empty input so length does not leak', () => {
    expect(redactSecret('')).toBe('(empty)');
    expect(redactSecret('ab')).toBe('••••');
    expect(redactSecret('abcd')).toBe('••••');
  });

  it('handles a 5-char token by keeping first 2 + last 2', () => {
    expect(redactSecret('abcde')).toBe('ab…de');
  });
});

describe('integrationMaturity (pure)', () => {
  it('flags configured as success', () => {
    const m = integrationMaturity(INTEGRATION_STATUS.configured);
    expect(m.label).toBe('configured');
    expect(m.tone).toBe('success');
  });

  it('flags missing-key as danger', () => {
    const m = integrationMaturity(INTEGRATION_STATUS.missingKey);
    expect(m.label).toBe('missing key');
    expect(m.tone).toBe('danger');
  });

  it('flags dev-build-only as muted', () => {
    const m = integrationMaturity(INTEGRATION_STATUS.devBuildOnly);
    expect(m.label).toBe('dev-build only');
    expect(m.tone).toBe('muted');
  });
});

describe('MockAnalytics (port adapter)', () => {
  it('captures track events with their props', () => {
    const a = new MockAnalytics();
    a.track('post_viewed', { id: 7 });
    const events = a.captured();
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('post_viewed');
    expect(events[0]?.detail).toContain('"id":7');
    expect(events[0]?.detail).not.toContain('"source"'); // source is added by the playground, not the port
  });

  it('captures identify with the userId merged into traits', () => {
    const a = new MockAnalytics();
    a.identify('user_42', { plan: 'demo' });
    const ev = a.captured()[0];
    expect(ev?.kind).toBe('identify');
    expect(ev?.detail).toContain('"userId":"user_42"');
    expect(ev?.detail).toContain('"plan":"demo"');
  });

  it('captures reset and assigns monotonic ids', () => {
    const a = new MockAnalytics();
    a.track('a');
    a.track('b');
    a.reset();
    const events = a.captured();
    expect(events.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(events[2]?.kind).toBe('reset');
  });

  it('caps the ring buffer at 25 (newest kept, oldest dropped)', () => {
    const a = new MockAnalytics();
    for (let i = 0; i < 30; i++) {
      a.track('event_' + String(i));
    }
    const events = a.captured();
    expect(events).toHaveLength(25);
    // Oldest five dropped; newest last.
    expect(events[0]?.kind).toBe('event_5');
    expect(events[24]?.kind).toBe('event_29');
  });

  it('flush clears the buffer', () => {
    const a = new MockAnalytics();
    a.track('x');
    a.flush();
    expect(a.captured()).toHaveLength(0);
  });

  it('produces stable (key-sorted) detail JSON', () => {
    const a = new MockAnalytics();
    a.track('e', { z: 1, a: 2, m: 3 });
    // Keys are sorted alphabetically regardless of insertion order.
    expect(a.captured()[0]?.detail).toBe('{"a":2,"m":3,"z":1}');
  });
});

describe('useAnalyticsPlayground', () => {
  it('starts empty with empty drafts', () => {
    const { result } = renderHook(() => useAnalyticsPlayground(), { wrapper });
    expect(result.current.events).toEqual([]);
    expect(result.current.draft).toBe('');
    expect(result.current.userIdDraft).toBe('');
  });

  it('track() captures the drafted event, attaches demo props, and clears the draft', () => {
    const { result } = renderHook(() => useAnalyticsPlayground(), { wrapper });
    act(() => result.current.setDraft('post_viewed'));
    expect(result.current.draft).toBe('post_viewed');

    act(() => result.current.track());
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]?.kind).toBe('post_viewed');
    expect(result.current.events[0]?.detail).toContain('"source":"playground"');
    expect(result.current.events[0]?.detail).toContain('"count":11');
    expect(result.current.draft).toBe('');
  });

  it('track() is a no-op on an empty/whitespace draft', () => {
    const { result } = renderHook(() => useAnalyticsPlayground(), { wrapper });
    act(() => result.current.setDraft('   '));
    act(() => result.current.track());
    expect(result.current.events).toEqual([]);
  });

  it('identify() captures the userId + plan trait and clears the draft', () => {
    const { result } = renderHook(() => useAnalyticsPlayground(), { wrapper });
    act(() => result.current.setUserIdDraft('user_42'));
    act(() => result.current.identify());
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]?.kind).toBe('identify');
    expect(result.current.events[0]?.detail).toContain('"userId":"user_42"');
    expect(result.current.events[0]?.detail).toContain('"plan":"demo"');
    expect(result.current.userIdDraft).toBe('');
  });

  it('reset() and clear() work as expected', () => {
    const { result } = renderHook(() => useAnalyticsPlayground(), { wrapper });
    act(() => result.current.setDraft('e1'));
    act(() => result.current.track());
    act(() => result.current.reset());
    expect(result.current.events.map((e) => e.kind)).toEqual(['e1', 'reset']);

    act(() => result.current.clear());
    expect(result.current.events).toEqual([]);
  });
});

describe('ThirdPartyServicesView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ThirdPartyServicesView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });

  it('renders the keystone PORT section + the live playground', () => {
    const { getByText } = render(<ThirdPartyServicesView />, { wrapper });
    expect(getByText('Why every SDK needs a PORT')).toBeTruthy();
    expect(getByText('LIVE — analytics event-logger playground')).toBeTruthy();
  });

  it('the Track button captures a drafted event through the UI', () => {
    const { getByPlaceholderText, getByText } = render(
      <ThirdPartyServicesView />,
      { wrapper },
    );
    const input = getByPlaceholderText('event name e.g. post_viewed');
    fireEvent.changeText(input, 'ui_tap');
    fireEvent.press(getByText('Track'));
    // The captured event kind renders in a Pill.
    expect(getByText('ui_tap')).toBeTruthy();
  });
});
