import { useState } from 'react';
import { Image, TextInput } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Section, Code, Pill } from '../../components';
import { Box, Button, Card, Text } from '../../design-system';
import {
  HAPTIC_OPTIONS,
  PERMISSION_STATUS,
  deviceInfo,
  permissionLabel,
  useHapticsDemo,
  useImagePickerDemo,
  useLocationDemo,
  useSecureStoreDemo,
  type HapticKind,
  type PermStatus,
} from './device_features_hooks';

/**
 * DeviceFeaturesView — a dumb structure. All native calls + state live in the
 * co-located hooks file; this file only renders. The screen teaches the
 * PERMISSIONS MODEL (Expo's `useXxxPermissions` hook pattern + the
 * request→grant→deny→blocked lifecycle) and reaches native device capabilities
 * the RN-standard (Expo Go) way: haptics, geolocation, media library, and
 * OS-encrypted secure storage, plus a live device-info readout.
 */
export function DeviceFeaturesView() {
  return (
    <ScreenScaffold
      title="Native Device Features"
      subtitle="Permissions, haptics, location, media, secure storage."
    >
      <PermissionsModelCard />
      <DeviceInfoCard />
      <HapticsCard />
      <GeolocationCard />
      <ImagePickerCard />
      <SecureStoreCard />
      <ExpoGoVsDevBuildCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. The permissions model                                            */
/* ------------------------------------------------------------------ */

function PermissionsModelCard() {
  return (
    <Section
      title="The permissions model"
      explanation="RN gates any capability that touches user data or sensors — camera, location, media, contacts, bluetooth. The OS, not your JS, owns the prompt; your app asks, the user decides, and the result is mirrored into a React state machine."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {PERMISSION_LIFECYCLE.map((step) => (
            <Pill key={step} tone={step === 'granted' ? 'success' : step === 'blocked' ? 'danger' : 'muted'} value={step} />
          ))}
        </Box>
        <Text variant="caption" tone="muted">
          The lifecycle: a permission starts{' '}
          <Text style={{ fontFamily: 'monospace' }}>undetermined</Text>. Your app
          calls <Text style={{ fontFamily: 'monospace' }}>request()</Text> once — the OS
          shows its native dialog. The user grants or denies. After a hard deny
          (with "don't ask again"), the state becomes{' '}
          <Text style={{ fontFamily: 'monospace' }}>blocked</Text> — the in-app prompt
          can never show again; the only path back is the OS Settings screen.
        </Text>
        <Code language="ts" caption="the idiomatic Expo permission hook — a useState-shaped tuple">{`const [permission, requestPermission] = Location.useForegroundPermissions();
// permission: { status, granted, canAskAgain, expires } | null
// requestPermission(): Promise<PermissionResponse>  → triggers the OS prompt

// Derived UI state — the four-way lifecycle the screen branches on:
//   status === 'granted'                 → use the feature
//   status === 'denied' && canAskAgain   → show a "Request again" button
//   status === 'denied' && !canAskAgain  → BLOCKED → "Open OS Settings"
//   permission === null / 'undetermined' → "Request" CTA (first run)`}</Code>
        <Text variant="caption" tone="muted">
          Each Expo module ships its own permission hook —{' '}
          <Text style={{ fontFamily: 'monospace' }}>useForegroundPermissions</Text>,{' '}
          <Text style={{ fontFamily: 'monospace' }}>useMediaLibraryPermissions</Text>,
          etc. They all return the SAME <Text style={{ fontFamily: 'monospace' }}>[response, request]</Text> tuple
          shape, so the lifecycle code is identical across capabilities.
        </Text>
        <Code language="ts" caption="declarative usage strings — required for real iOS / Android builds">{`// iOS — Info.plist (NSLocationWhenInUseUsageDescription):
//   <key>NSLocationWhenInUseUsageDescription</key>
//   <string>This app reads your location to demo the permissions model.</string>

// Android — app.config.ts plugin permission:
//   plugins: [
//     ['expo-location', { locationWhenInUsePermission: 'Location to demo perms.' }],
//   ]

// Expo Go: the permission flows work WITHOUT these keys (the prompts are
// pre-wired into the Expo Go binary). They become mandatory the moment you
// ship a real dev / EAS build — that is what section 7 teaches.`}</Code>
      </Box>
    </Section>
  );
}

const PERMISSION_LIFECYCLE: readonly PermStatus[] = [
  'undetermined',
  'granted',
  'denied',
  'blocked',
];

/* ------------------------------------------------------------------ */
/* 2. Device info (live)                                              */
/* ------------------------------------------------------------------ */

function DeviceInfoCard() {
  const info = deviceInfo();
  return (
    <Section
      title="Device info — LIVE"
      explanation="A live readout from the three portable RN sources: Platform (OS + version), expo-constants (build/runtime identity), and Dimensions/PixelRatio (screen geometry). Pure data — no permission required."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Pill label="Platform" value={String(info.platform)} tone="primary" />
          <Pill label="OS version" value={String(info.platformVersion)} />
          <Pill label="Pixel ratio" value={String(info.pixelRatio)} />
          <Pill label="Screen" value={info.screenWidth + 'x' + info.screenHeight} />
          <Pill label="Font scale" value={String(info.fontScale)} />
          {info.modelName ? <Pill label="Model" value={info.modelName} /> : null}
          {info.expoConfigName ? <Pill label="App" value={info.expoConfigName} /> : null}
        </Box>
        <Code language="ts" caption="device_features_hooks.ts — the real pure helper">{`export function deviceInfo(): DeviceInfo {
  const win = Dimensions.get('window');
  const osInfo = (Constants.platform ?? {})[Platform.OS];
  const expoConfig = Constants.expoConfig;
  return {
    platform: Platform.OS,
    platformVersion: Platform.Version,
    screenWidth: Math.round(win.width),
    screenHeight: Math.round(win.height),
    scale: win.scale,
    fontScale: win.fontScale,
    pixelRatio: PixelRatio.get(),
    modelName: osInfo?.model ?? null,
    expoConfigName: expoConfig?.name ?? null,
    runtimeVersion: expoConfig?.runtimeVersion ?? null,
  };
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Haptics — LIVE                                                   */
/* ------------------------------------------------------------------ */

function HapticsCard() {
  const { trigger, last } = useHapticsDemo();
  return (
    <Section
      title="Haptics — LIVE"
      explanation="expo-haptics drives the Taptic Engine (iOS) / the vibrator (Android). Three primitives cover every standard case: a weighted impact, a semantic notification, and a tiny selection tick."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {(Object.keys(HAPTIC_OPTIONS) as readonly HapticKind[]).map((kind) => (
            <Button
              key={kind}
              title={HAPTIC_OPTIONS[kind]}
              variant="outline"
              onPress={() => trigger(kind)}
            />
          ))}
        </Box>
        <Text variant="small" tone="muted">
          Last fired:{' '}
          <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
            {last ?? '—'}
          </Text>
          . On a physical device you will feel each one; on an emulator they are
          silent no-ops (the underlying hardware is absent).
        </Text>
        <Code language="ts" caption="device_features_hooks.ts — the real hook">{`export const HAPTIC_OPTIONS = {
  impactLight: 'Impact · Light',
  impactMedium: 'Impact · Medium',
  impactHeavy: 'Impact · Heavy',
  notificationSuccess: 'Notification · Success',
  notificationWarning: 'Notification · Warning',
  notificationError: 'Notification · Error',
  selection: 'Selection',
} as const;

export function useHapticsDemo() {
  const [last, setLast] = useState<string | null>(null);
  const trigger = useCallback((kind: HapticKind) => {
    void (async () => {
      switch (kind) {
        case 'impactLight':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
        case 'notificationSuccess':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
        case 'selection':
          await Haptics.selectionAsync(); break;
        // … Medium / Heavy / Warning / Error / Selection
      }
      setLast(HAPTIC_OPTIONS[kind]);
    })();
  }, []);
  return { trigger, last };
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Geolocation — LIVE                                               */
/* ------------------------------------------------------------------ */

function GeolocationCard() {
  const { status, position, request, refresh } = useLocationDemo();
  return (
    <Section
      title="Geolocation — LIVE"
      explanation="expo-location: request foreground permission, then take a single fix. The card reflects each lifecycle state explicitly — granted, denied (re-askable), or blocked (must use OS Settings)."
    >
      <Box gap="sm">
        <Box row gap="xs" center>
          <Pill
            label="Permission"
            value={permissionLabel(status)}
            tone={status === 'granted' ? 'success' : status === 'blocked' ? 'danger' : 'muted'}
          />
        </Box>
        {position ? (
          <Card>
            <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
              {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              accuracy ±{position.accuracy != null ? Math.round(position.accuracy) + 'm' : '?'}
            </Text>
          </Card>
        ) : (
          <Text variant="caption" tone="muted">
            No fix yet.
          </Text>
        )}
        <Box row gap="sm">
          {status === 'granted' ? (
            <Button title="Refresh fix" variant="outline" onPress={() => void refresh()} />
          ) : status === 'blocked' ? (
            <Button title="Open OS Settings (blocked)" variant="ghost" disabled />
          ) : (
            <Button title="Request location" onPress={() => void request()} />
          )}
        </Box>
        <Code language="ts" caption="device_features_hooks.ts — the real permissioned hook">{`export function useLocationDemo() {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const status = statusOf(permission);   // granted | denied | undetermined | blocked

  const request = useCallback(async () => {
    const result = await requestPermission();   // triggers the OS prompt ONCE
    if (result.status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    });
  }, [requestPermission]);

  return { status, position, request, refresh };
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Media library / image picker — LIVE                            */
/* ------------------------------------------------------------------ */

function ImagePickerCard() {
  const { status, asset, pick } = useImagePickerDemo();
  return (
    <Section
      title="Media library / image picker — LIVE"
      explanation="expo-image-picker: request media-library permission, then launch the system picker. The picked asset comes back as a URI the RN Image component can render directly — no base64 round-trip, no manual file copy."
    >
      <Box gap="sm">
        <Box row gap="xs" center>
          <Pill
            label="Permission"
            value={permissionLabel(status)}
            tone={status === 'granted' ? 'success' : status === 'blocked' ? 'danger' : 'muted'}
          />
        </Box>
        {asset ? (
          <Box gap="xs">
            <Image
              source={{ uri: asset.uri }}
              style={{ width: '100%', height: 180, borderRadius: 8 }}
              resizeMode="cover"
            />
            <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
              {asset.uri}
            </Text>
            <Text variant="caption" tone="muted">
              {asset.width}×{asset.height}px
            </Text>
          </Box>
        ) : (
          <Text variant="caption" tone="muted">
            No asset picked yet.
          </Text>
        )}
        <Button
          title={status === 'blocked' ? 'Open OS Settings (blocked)' : 'Pick an image'}
          variant={status === 'blocked' ? 'ghost' : 'outline'}
          disabled={status === 'blocked'}
          onPress={() => void pick()}
        />
        <Code language="ts" caption="device_features_hooks.ts — the real hook">{`export function useImagePickerDemo() {
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const [asset, setAsset] = useState<PickedAsset | null>(null);

  const pick = useCallback(async () => {
    let current = permission;
    if (current?.status !== 'granted') current = await requestPermission();
    if (current.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',     // literal-union form — no runtime enum import
      quality: 0.8,
    });
    if (result.canceled) return;
    const first = result.assets[0];
    if (!first) return;
    setAsset({ uri: first.uri, width: first.width, height: first.height });
  }, [permission, requestPermission]);

  return { status, asset, pick };
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Secure storage — LIVE                                           */
/* ------------------------------------------------------------------ */

const SECURE_STORE_KEY_LABEL = 'rndg.demo_secret';

function SecureStoreCard() {
  const { value, save, read, clear } = useSecureStoreDemo();
  const [draft, setDraft] = useState('super-secret-token');

  return (
    <Section
      title="Secure storage — LIVE"
      explanation="expo-secure-store writes the value through the OS keychain (iOS) / Keystore (Android) — encrypted at rest, tied to the app's key. This is the RN-standard home for auth tokens, refresh tokens, and other secrets, in contrast to plain AsyncStorage (unencrypted plaintext) used for non-sensitive cache."
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
        <Code language="ts" caption="device_features_hooks.ts — the real hook">{`const SECURE_KEY = 'rndg.demo_secret';

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

/* ------------------------------------------------------------------ */
/* 7. Expo Go vs dev build                                            */
/* ------------------------------------------------------------------ */

const DEV_BUILD_MATRIX: ReadonlyArray<{ feature: string; expoGo: boolean; note: string }> = [
  { feature: 'Haptics', expoGo: true, note: 'Works in Expo Go' },
  { feature: 'Location (foreground)', expoGo: true, note: 'Works in Expo Go' },
  { feature: 'Image picker / media library', expoGo: true, note: 'Works in Expo Go' },
  { feature: 'Secure storage', expoGo: true, note: 'Works in Expo Go' },
  { feature: 'Camera (full texture / frame processing)', expoGo: false, note: 'Needs a dev build' },
  { feature: 'Bluetooth (BLE)', expoGo: false, note: 'Needs a dev build' },
  { feature: 'Background tasks (fetch / task-manager)', expoGo: false, note: 'Needs a dev build' },
  { feature: 'Custom native code / config plugins', expoGo: false, note: 'Needs a dev build' },
];

function ExpoGoVsDevBuildCard() {
  return (
    <Section
      title="What lives in Expo Go vs needs a dev build"
      explanation="Expo Go ships a fixed set of native modules; everything on this screen runs inside it. Capabilities that need their OWN native code (a config plugin, a custom pod, or a permission Expo Go can't surface) require a development build — `npx expo run:ios` / `npx expo run:android` — or an EAS build."
    >
      <Box gap="xs">
        {DEV_BUILD_MATRIX.map((row) => (
          <Box key={row.feature} p="sm" radius="sm" bg="surfaceVariant" row gap="sm" center>
            <Box flex={1}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {row.feature}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {row.note}
              </Text>
            </Box>
            <Pill tone={row.expoGo ? 'success' : 'danger'} value={row.expoGo ? 'Expo Go' : 'Dev build'} />
          </Box>
        ))}
        <Text variant="caption" tone="muted">
          The rule of thumb: if the module is on Expo's "supported in Expo Go"
          list, the demo works today; if it needs a config plugin or a bare native
          dependency, it only resolves once you move off Expo Go to a dev build
          (the bridge to the `production_build_deployment` topic).
        </Text>
      </Box>
    </Section>
  );
}
