import { useState } from 'react';
import { TextInput } from 'react-native';
import { ScreenScaffold, Section, Code } from '../../../../components';
import { Box, Button, Card, Text } from '../../../../components';
import { useSecureStoreDemo } from './secure_storage_hooks';

const SECURE_STORE_KEY_LABEL = 'rndg.demo_secret';

/**
 * SecureStorageView — a dumb structure. All storage calls + state live in the
 * co-located hooks file; this file only renders.
 *
 * expo-secure-store demo: write/read/delete a single secret through the OS
 * keychain (iOS) / Keystore (Android). The contrast with plain AsyncStorage
 * (unencrypted) is the teaching point.
 */
export function SecureStorageView() {
  return (
    <ScreenScaffold
      title="Secure Storage"
    >
      <WhySecureStoreCard />
      <LiveDemoCard />
      <LimitsCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */

function WhySecureStoreCard() {
  return (
    <Section
      title="Why secure storage exists"
      explanation="expo-secure-store writes the value through the OS keychain (iOS) / Keystore (Android) — encrypted at rest, tied to the app's key. This is the RN-standard home for auth tokens, refresh tokens, and other secrets, in contrast to plain AsyncStorage (unencrypted plaintext) used for non-sensitive cache."
    >
      <Code language="ts" caption="secure storage vs AsyncStorage — when to use which">{`import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SECRET (auth token, refresh token) — OS-encrypted at rest.
await SecureStore.setItemAsync('refresh_token', token);
const token = await SecureStore.getItemAsync('refresh_token');

// NON-SECRET (feature flags, last-viewed tab, JSON cache) — plaintext is fine.
await AsyncStorage.setItem('last_tab', 'home');`}</Code>
    </Section>
  );
}

function LiveDemoCard() {
  const { value, save, read, clear } = useSecureStoreDemo();
  const [draft, setDraft] = useState('super-secret-token');

  return (
    <Section
      title="Secure storage — LIVE"
      explanation="Write, read, and delete a single secret. The value is encrypted at rest by the OS; this screen is the same shape an auth-token store would take."
    >
      <Box gap="sm">
        <Text variant="caption" tone="muted">
          Demo key:{' '}
          <Text style={{ fontFamily: 'monospace' }}>{SECURE_STORE_KEY_LABEL}</Text>
        </Text>
        <Box row gap="sm" style={{ alignItems: 'stretch' }}>
          <SecretInput draft={draft} onChange={setDraft} />
        </Box>
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Button title="Save" variant="filled" onPress={() => void save(draft)} />
          <Button title="Read" variant="outline" onPress={() => void read()} />
          <Button title="Delete" variant="ghost" onPress={() => void clear()} />
        </Box>
        <Card>
          <Text variant="caption" tone="muted">
            Stored value:
          </Text>
          <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }} mt="xxs">
            {value ?? '(empty)'}
          </Text>
        </Card>
        <Code language="ts" caption="secure_storage_hooks.ts — the real hook">{`const SECURE_KEY = 'rndg.demo_secret';

export function useSecureStoreDemo() {
  const [value, setValue] = useState<string | null>(null);

  const save = useCallback(async (next: string) => {
    await SecureStore.setItemAsync(SECURE_KEY, next);   // OS-encrypted at rest
    setValue(next);
  }, []);

  const read = useCallback(async () => {
    const stored = await SecureStore.getItemAsync(SECURE_KEY);
    setValue(stored);                                   // null if missing
  }, []);

  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(SECURE_KEY);
    setValue(null);
  }, []);

  return { value, save, read, clear };
}`}</Code>
      </Box>
    </Section>
  );
}

/** A minimal inline text input for the secret draft (kept local — single use). */
function SecretInput({ draft, onChange }: { draft: string; onChange: (v: string) => void }) {
  // A plain TextInput with a stable local style. Kept inline so the screen
  // stays self-contained; not promoted to the components barrel (single use).
  return (
    <Box flex={1}>
      <TextInput value={draft} onChangeText={onChange} />
    </Box>
  );
}

function LimitsCard() {
  return (
    <Section
      title="Limits & platform notes"
      explanation="The OS keychain/Keystore is sized for secrets, not blobs. There's a per-value size cap (~2KB on iOS after which the value is split), no multi-key queries, and the value is wiped when the app is uninstalled. For anything larger or queryable, use a real store (expo-sqlite / WatermelonDB) and keep only the encryption key here."
    >
      <Text variant="caption" tone="muted">
        On Android, expo-secure-store requires the device to have a secure
        lockscreen keystore; on emulators without one, the API may throw. Always
        guard secret access defensively.
      </Text>
    </Section>
  );
}
