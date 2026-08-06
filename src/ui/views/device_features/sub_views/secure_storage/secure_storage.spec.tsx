import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { SecureStorageView } from './secure_storage_view';
import { useSecureStoreDemo } from './secure_storage_hooks';
import * as SecureStore from 'expo-secure-store';

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

describe('useSecureStoreDemo', () => {
  it('save writes through SecureStore and exposes the value, then clear deletes it', async () => {
    const { result } = renderHook(() => useSecureStoreDemo(), { wrapper });
    expect(result.current.value).toBeNull();

    await act(async () => {
      await result.current.save('token-123');
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('demo_secret'),
      'token-123',
    );
    expect(result.current.value).toBe('token-123');

    await act(async () => {
      await result.current.clear();
    });
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('demo_secret'),
    );
    expect(result.current.value).toBeNull();
  });

  it('read returns the stored value via SecureStore.getItemAsync', async () => {
    const { result } = renderHook(() => useSecureStoreDemo(), { wrapper });
    await act(async () => {
      await result.current.save('abc');
    });
    await act(async () => {
      await result.current.read();
    });
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('demo_secret'),
    );
    expect(result.current.value).toBe('abc');
  });
});

describe('SecureStorageView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<SecureStorageView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
