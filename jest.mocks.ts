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
