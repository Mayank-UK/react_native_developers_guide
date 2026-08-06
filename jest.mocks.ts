/**
 * Native-module mocks registered before any test file (or the DI container)
 * imports them. Runs via Jest `setupFiles`, which executes before the test
 * framework + before each test file's module graph is evaluated.
 */

// In-memory AsyncStorage mock — AsyncStorage has no JS-only implementation
// under node/jsdom, so the DI container's app-database import would crash
// without this.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      setItem: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      }),
      removeItem: jest.fn((k: string) => {
        store.delete(k);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
      multiGet: jest.fn((keys: string[]) =>
        Promise.resolve(
          keys.map(
            (k) => [k, store.get(k) ?? null] as [string, string | null],
          ),
        ),
      ),
      multiSet: jest.fn((entries: [string, string][]) => {
        for (const [k, v] of entries) store.set(k, v);
        return Promise.resolve();
      }),
    },
  };
});

// react-native-reanimated v3 — its worklet runtime + JS proxy machinery does
// not behave under jsdom without the worklet babel transform. Mock the surface
// this app actually consumes; `useSharedValue` returns a plain `{ value }` so
// hook tests can read/mutate it, and the animation drivers are identity fns.
// The shipped `react-native-reanimated/mock` uses a Proxy + timer setup that
// requires `setUpTests()`/`withReanimatedTimer`; this lighter mock avoids that
// ceremony for the teaching-screen hooks (which only need shape + triggers).
jest.mock('react-native-reanimated', () => {
  const NOOP = () => {};
  const ID = <T>(t: T) => t;
  return {
    __esModule: true,
    default: {
      View: require('react-native').View,
      Text: require('react-native').Text,
    },
    useSharedValue: <T>(init: T) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    useAnimatedReaction: NOOP,
    useAnimatedScrollHandler: () => NOOP,
    useDerivedValue: <T>(processor: () => T) => ({ value: processor() }),
    useAnimatedRef: () => ({ current: null }),
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    runOnUI: (fn: (...args: unknown[]) => unknown) => fn,
    withTiming: (toValue: unknown) => toValue,
    withSpring: (toValue: unknown) => toValue,
    withDecay: (_config: unknown, finish?: (finished: boolean) => void) => {
      finish?.(true);
      return 0;
    },
    withSequence: (...next: unknown[]) => next[next.length - 1],
    withRepeat: ID,
    withDelay: (_delay: number, next: unknown) => next,
    cancelAnimation: NOOP,
    interpolate: NOOP,
    interpolateColor: NOOP,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Easing: {
      linear: ID,
      ease: ID,
      in: ID,
      out: ID,
      inOut: ID,
      sin: ID,
      circle: ID,
      exp: ID,
      bounce: ID,
      back: ID,
      elastic: ID,
      bezier: () => ID,
      bezierFn: () => ID,
    },
    FadeIn: { duration: 0 },
    FadeOut: { duration: 0 },
    SlideInUp: { duration: 0 },
    SlideInDown: { duration: 0 },
    SlideInLeft: { duration: 0 },
    SlideInRight: { duration: 0 },
    ReduceMotion: { Never: 0, Always: 1, System: 2 },
  };
});

// expo-haptics — native module with no JS implementation under jest. Mock the
// small surface this app's device-features screen consumes; the three triggers
// are jest.fns returning resolved promises so hook tests can await them, and
// the feedback-style const-objects mirror the runtime enum values.
jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Soft: 'soft',
    Rigid: 'rigid',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// expo-location — native geolocation. `useForegroundPermissions` is a hook, so
// it must return the array tuple shape unconditionally (a plain function
// returning a tuple is hook-call-compatible). Returning a pre-granted response
// keeps the permissioned hooks deterministic in tests; `getCurrentPositionAsync`
// returns fixed coords.
jest.mock('expo-location', () => {
  const PermissionStatus = {
    GRANTED: 'granted',
    UNDETERMINED: 'undetermined',
    DENIED: 'denied',
  };
  const granted = {
    status: 'granted',
    expires: 'never',
    granted: true,
    canAskAgain: true,
  };
  return {
    __esModule: true,
    PermissionStatus,
    useForegroundPermissions: () => [
      granted,
      () => Promise.resolve(granted),
      () => Promise.resolve(granted),
    ],
    getCurrentPositionAsync: jest.fn(() =>
      Promise.resolve({
        coords: { latitude: 1, longitude: 2, accuracy: 5 },
        timestamp: 0,
      }),
    ),
    reverseGeocodeAsync: jest.fn(() => Promise.resolve([])),
    geocodeAsync: jest.fn(() => Promise.resolve([])),
  };
});

// expo-image-picker — same shape as expo-location: a permission hook returning
// a stable granted tuple + the launch function returning a single mock asset.
jest.mock('expo-image-picker', () => {
  const PermissionStatus = {
    GRANTED: 'granted',
    UNDETERMINED: 'undetermined',
    DENIED: 'denied',
  };
  const MediaTypeOptions = { Images: 'Images', Videos: 'Videos', All: 'All' };
  const granted = {
    status: 'granted',
    expires: 'never',
    granted: true,
    canAskAgain: true,
  };
  return {
    __esModule: true,
    PermissionStatus,
    MediaTypeOptions,
    useMediaLibraryPermissions: () => [
      granted,
      () => Promise.resolve(granted),
      () => Promise.resolve(granted),
    ],
    useCameraPermissions: () => [
      granted,
      () => Promise.resolve(granted),
      () => Promise.resolve(granted),
    ],
    requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve(granted)),
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve(granted)),
    launchImageLibraryAsync: jest.fn(() =>
      Promise.resolve({
        canceled: false,
        assets: [{ uri: 'mock://img.jpg', width: 100, height: 100 }],
      }),
    ),
    launchCameraAsync: jest.fn(() =>
      Promise.resolve({
        canceled: false,
        assets: [{ uri: 'mock://img.jpg', width: 100, height: 100 }],
      }),
    ),
  };
});

// expo-secure-store — backed by an in-memory Map (mirrors the AsyncStorage mock
// pattern above). Key/value demo save/read/delete all resolve through this.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    setItemAsync: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
    deleteItemAsync: jest.fn((k: string) => {
      store.delete(k);
      return Promise.resolve();
    }),
  };
});

// expo-sensors — native motion sensors; no JS implementation under jest. Mock
// the small surface the sensors screen consumes: `setUpdateInterval` records
// the cadence (so tests can assert it applied), `addListener` returns a
// subscription with a `.remove()` teardown, and `isAvailableAsync` resolves
// true. A passive listener list is kept so tests can drive a sample.
jest.mock('expo-sensors', () => {
  let intervalMs = 0;
  // The jest-hoist babel plugin disallows out-of-scope identifiers in factory
  // type annotations, so the listener callback's parameter name is mock-prefixed
  // (the only name shape the plugin permits) and typed at runtime call sites.
  const listeners = new Set<(mockReading: { x: number; y: number; z: number }) => void>();
  return {
    __esModule: true,
    Accelerometer: {
      setUpdateInterval: jest.fn((ms: number) => {
        intervalMs = ms;
      }),
      getUpdateInterval: jest.fn(() => intervalMs),
      addListener: jest.fn((cb: (reading: { x: number; y: number; z: number }) => void) => {
        listeners.add(cb);
        return { remove: jest.fn(() => { listeners.delete(cb); }) };
      }),
      removeAllListeners: jest.fn(() => { listeners.clear(); }),
      isAvailableAsync: jest.fn(() => Promise.resolve(true)),
    },
    __emit(reading: { x: number; y: number; z: number }) {
      listeners.forEach((cb) => cb(reading));
    },
  };
});

// expo-localization — backed by a native module; under jest there is no OS
// locale. Return a stable en-US primary locale with the full Locale shape
// (textDirection — NOT a boolean isRTL — region, separators, currency) so the
// i18n screen's detection + formatting logic is deterministic in tests. Hook
// variants (useLocales/useCalendars) return the same list.
jest.mock('expo-localization', () => {
  const locale = {
    languageTag: 'en-US',
    languageCode: 'en',
    languageScriptCode: null,
    regionCode: 'US',
    languageRegionCode: 'US',
    currencyCode: 'USD',
    currencySymbol: '$',
    languageCurrencyCode: 'USD',
    languageCurrencySymbol: '$',
    decimalSeparator: '.',
    digitGroupingSeparator: ',',
    textDirection: 'ltr',
    measurementSystem: 'us',
    temperatureUnit: 'fahrenheit',
  };
  const calendar = {
    calendar: 'gregory',
    timeZone: 'UTC',
    uses24hourClock: true,
    firstWeekday: 1,
  };
  return {
    __esModule: true,
    getLocales: () => [locale],
    useLocales: () => [locale],
    getCalendars: () => [calendar],
    useCalendars: () => [calendar],
  };
});

// expo-notifications — native module; no JS implementation under jest. Mock
// the small surface the notifications screen consumes: scheduling resolves to
// a string id, permission fns resolve to a granted status, listener
// registrations return an EventSubscription-shaped `{ remove }` so the hooks'
// cleanup returns are callable, and `setNotificationHandler` is a noop. The
// const-objects mirror the runtime enum values (SchedulableTriggerInputTypes
// + IosAuthorizationStatus) so source referencing them type-checks.
jest.mock('expo-notifications', () => {
  const granted = {
    status: 'granted',
    expires: 'never',
    granted: true,
    canAskAgain: true,
  };
  const subscription = () => ({ remove: jest.fn() });
  return {
    __esModule: true,
    // Permission API
    getPermissionsAsync: jest.fn(() => Promise.resolve(granted)),
    requestPermissionsAsync: jest.fn(() => Promise.resolve(granted)),
    // Scheduling API
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('notif-id')),
    cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
    cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
    // Listeners — return an EventSubscription-shaped object
    addNotificationReceivedListener: jest.fn(() => subscription()),
    addNotificationResponseReceivedListener: jest.fn(() => subscription()),
    addNotificationsDroppedListener: jest.fn(() => subscription()),
    removeNotificationSubscription: jest.fn(),
    getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
    getLastNotificationResponse: jest.fn(() => null),
    clearLastNotificationResponseAsync: jest.fn(() => Promise.resolve()),
    clearLastNotificationResponse: jest.fn(),
    // Foreground handler — noop
    setNotificationHandler: jest.fn(),
    // Push token — resolves with an illustrative token shape
    getExpoPushTokenAsync: jest.fn(() =>
      Promise.resolve({
        type: 'expo',
        data: 'ExponentPushToken[mock-token]',
      }),
    ),
    getDevicePushTokenAsync: jest.fn(() =>
      Promise.resolve({ type: 'firebase', data: 'mock-fcm-token' }),
    ),
    // Android channels
    setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
    getNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
    getNotificationChannelsAsync: jest.fn(() => Promise.resolve([])),
    deleteNotificationChannelAsync: jest.fn(() => Promise.resolve()),
    // Badge
    getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
    setBadgeCountAsync: jest.fn(() => Promise.resolve()),
    // Hook
    useLastNotificationResponse: () => ({ data: null }),
    // Tasks
    registerTaskAsync: jest.fn(() => Promise.resolve()),
    unregisterTaskAsync: jest.fn(() => Promise.resolve()),
    setAutoServerRegistrationEnabledAsync: jest.fn(() => Promise.resolve()),
    // Const-objects mirroring the runtime enums (erasable-syntax consumers
    // read these as plain object property accesses).
    DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
    SchedulableTriggerInputTypes: {
      CALENDAR: 'calendar',
      DAILY: 'daily',
      WEEKLY: 'weekly',
      MONTHLY: 'monthly',
      YEARLY: 'yearly',
      DATE: 'date',
      TIME_INTERVAL: 'timeInterval',
    },
    IosAuthorizationStatus: {
      NOT_DETERMINED: 0,
      DENIED: 1,
      AUTHORIZED: 2,
      PROVISIONAL: 3,
      EPHEMERAL: 4,
    },
    AndroidNotificationPriority: {
      MIN: 'min',
      LOW: 'low',
      DEFAULT: 'default',
      HIGH: 'high',
      MAX: 'max',
    },
    IosAlertStyle: { NONE: 0, BANNER: 1, ALERT: 2 },
    IosAllowsPreviews: { NEVER: 0, ALWAYS: 1, WHEN_AUTHENTICATED: 2 },
  };
});
