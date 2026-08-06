import { useCallback, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage — view logic. expo-secure-store writes the value through the
 * OS keychain (iOS) / Keystore (Android) — encrypted at rest, tied to the app's
 * key. This is the RN-standard home for auth tokens, refresh tokens, and other
 * secrets, in contrast to plain AsyncStorage (unencrypted plaintext) used for
 * non-sensitive cache.
 */

const SECURE_KEY = 'rndg.demo_secret';

export interface SecureStoreDemo {
  /** Last value read for the demo key (null if never saved or after clear). */
  value: string | null;
  /** Persist a value under the demo key (encrypted at rest by the OS keychain). */
  save: (value: string) => Promise<void>;
  /** Re-read the demo key into `value`. */
  read: () => Promise<void>;
  /** Delete the demo key. */
  clear: () => Promise<void>;
}

/**
 * expo-secure-store demo. The shape mirrors the DAO behind AsyncStorage used
 * elsewhere in this app, but scoped to a single sensitive value rather than a
 * JSON document collection.
 */
export function useSecureStoreDemo(): SecureStoreDemo {
  const [value, setValue] = useState<string | null>(null);

  const save = useCallback(async (next: string) => {
    await SecureStore.setItemAsync(SECURE_KEY, next);
    setValue(next);
  }, []);

  const read = useCallback(async () => {
    const stored = await SecureStore.getItemAsync(SECURE_KEY);
    setValue(stored);
  }, []);

  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(SECURE_KEY);
    setValue(null);
  }, []);

  return { value, save, read, clear };
}
