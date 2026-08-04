import { useCallback, useState } from 'react';
import { Dimensions, Platform, PixelRatio } from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

/**
 * Native Device Features — view logic. All native calls + React state live here
 * so the view stays a dumb structure. Five concerns, five hooks + two pure
 * helpers (the artefacts the view's <Code> blocks cite):
 *
 *  - `useHapticsDemo`            — expo-haptics (impact / notification / selection)
 *  - `useLocationDemo`           — expo-location (foreground permission + fix)
 *  - `useImagePickerDemo`        — expo-image-picker (media permission + pick)
 *  - `useSecureStoreDemo`        — expo-secure-store (key/value secret store)
 *  - `deviceInfo()`              — pure read of Platform / Constants / Dimensions
 *  - `permissionLabel(status)`   — pure label for a permission lifecycle state
 *
 * The KEY teaching point is the permissions model: the `useXxxPermissions` hook
 * shape (the idiomatic Expo permission API) and the request→grant→deny→blocked
 * lifecycle encoded by `PermStatus`. No `any`; strict + erasure-clean.
 */

/* ------------------------------------------------------------------ */
/* 0. Pure const-objects + literal unions (NO enums)                  */
/* ------------------------------------------------------------------ */

/**
 * The set of haptic effects the LIVE demo can fire. A const-object + literal
 * union (NOT an `enum`) so it survives `erasableSyntaxOnly`; the hook maps each
 * key to the real `Haptics.*` call. Cited verbatim by the view's <Code> block.
 */
export const HAPTIC_OPTIONS = {
  impactLight: 'Impact · Light',
  impactMedium: 'Impact · Medium',
  impactHeavy: 'Impact · Heavy',
  notificationSuccess: 'Notification · Success',
  notificationWarning: 'Notification · Warning',
  notificationError: 'Notification · Error',
  selection: 'Selection',
} as const;

export type HapticKind = keyof typeof HAPTIC_OPTIONS;

/**
 * The four lifecycle states a runtime permission can be in. The Expo native
 * APIs return only `granted` / `denied` / `undetermined`; `blocked` is the
 * UX state where the user denied with "don't ask again" (`canAskAgain === false`)
 * — the app must then send the user to OS Settings. Pure data, no enum.
 */
export const PERMISSION_STATUS = {
  granted: 'granted',
  denied: 'denied',
  undetermined: 'undetermined',
  blocked: 'blocked',
} as const;

export type PermStatus = (typeof PERMISSION_STATUS)[keyof typeof PERMISSION_STATUS];

/**
 * Map a permission lifecycle state to a short UI label. Pure — exported for
 * unit testing. `blocked` carries the "ask in Settings" affordance because the
 * in-app request prompt can no longer be shown.
 */
export function permissionLabel(status: PermStatus): string {
  switch (status) {
    case 'granted':
      return 'Granted';
    case 'denied':
      return 'Denied — request again to retry';
    case 'undetermined':
      return 'Not yet asked';
    case 'blocked':
      return 'Blocked — enable in OS Settings';
  }
}

/* ------------------------------------------------------------------ */
/* 1. Haptics                                                          */
/* ------------------------------------------------------------------ */

export interface HapticsDemo {
  /** Fire a haptic of the given kind and record it in `last`. */
  trigger: (kind: HapticKind) => void;
  /** Human label of the most recently fired haptic (null before first fire). */
  last: string | null;
}

/**
 * Wraps `expo-haptics`. The three primitives — `impactAsync` (a physical
 * collision, weighted by style), `notificationAsync` (success/warning/error
 * semantic patterns), and `selectionAsync` (a tiny tick for discrete changes)
 * — cover every standard RN haptic. `HAPTIC_OPTIONS` is the SSOT the UI lists;
 * this hook is the only place that maps a key to the real native call.
 */
export function useHapticsDemo(): HapticsDemo {
  const [last, setLast] = useState<string | null>(null);

  const trigger = useCallback((kind: HapticKind) => {
    // Fire-and-forget: haptics are best-effort (the device may not support them,
    // e.g. Android emulators). Each call resolves void on completion.
    void (async () => {
      switch (kind) {
        case 'impactLight':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'impactMedium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'impactHeavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'notificationSuccess':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'notificationWarning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'notificationError':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
      }
      setLast(HAPTIC_OPTIONS[kind]);
    })();
  }, []);

  return { trigger, last };
}

/* ------------------------------------------------------------------ */
/* 2. Geolocation                                                      */
/* ------------------------------------------------------------------ */

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface LocationDemo {
  /** Current permission lifecycle state (derived from the permission hook). */
  status: PermStatus;
  /** Last obtained fix, or null if none yet. */
  position: GeoPosition | null;
  /** Request the permission (and, on grant, take the first fix). */
  request: () => Promise<void>;
  /** Re-take a fix without re-prompting (no-op unless already granted). */
  refresh: () => Promise<void>;
}

/**
 * Derives the PermStatus from an expo permission response. Pure internal helper
 * — `null` (the hook's initial state before any permission fetch resolves) is
 * treated as `undetermined`. `denied + !canAskAgain` collapses to `blocked`.
 */
function statusOf(response: Location.LocationPermissionResponse | null): PermStatus {
  if (!response) return 'undetermined';
  if (response.status === 'granted') return 'granted';
  if (!response.canAskAgain) return 'blocked';
  return 'denied';
}

/**
 * expo-location demo. `useForegroundPermissions` is the idiomatic Expo
 * permission hook — it returns `[permResponse, requestPermission, getPermission]`,
 * mirrors the OS permission state into React, and exposes a `request()` that
 * triggers the system prompt (one shot — `canAskAgain` flips false after a hard
 * denial). On grant, we call `getCurrentPositionAsync` for a single fix.
 */
export function useLocationDemo(): LocationDemo {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [position, setPosition] = useState<GeoPosition | null>(null);

  const status = statusOf(permission);

  const readFix = useCallback(async () => {
    const pos = await Location.getCurrentPositionAsync({});
    const { latitude, longitude, accuracy } = pos.coords;
    setPosition({ latitude, longitude, accuracy: accuracy ?? null });
  }, []);

  const request = useCallback(async () => {
    const result = await requestPermission();
    if (result.status !== 'granted') return;
    await readFix();
  }, [requestPermission, readFix]);

  const refresh = useCallback(async () => {
    if (permission?.status !== 'granted') return;
    await readFix();
  }, [permission, readFix]);

  return { status, position, request, refresh };
}

/* ------------------------------------------------------------------ */
/* 3. Image picker / media library                                     */
/* ------------------------------------------------------------------ */

export interface PickedAsset {
  uri: string;
  width: number;
  height: number;
}

export interface ImagePickerDemo {
  /** Media-library permission lifecycle state. */
  status: PermStatus;
  /** Last-picked asset, or null if none yet. */
  asset: PickedAsset | null;
  /** Request permission (if needed) then launch the system picker. */
  pick: () => Promise<void>;
}

/**
 * expo-image-picker demo. Same permission-hook pattern as location. `pick()`
 * first ensures the media-library permission is granted (requesting it if the
 * user has not yet been asked), then launches the system picker. `MediaType` is
 * passed as the plain string 'images' (the package's literal-union form) to
 * avoid importing the runtime `MediaTypeOptions` enum.
 */
export function useImagePickerDemo(): ImagePickerDemo {
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const [asset, setAsset] = useState<PickedAsset | null>(null);

  const status = statusOfPicker(permission);

  const pick = useCallback(async () => {
    let current = permission;
    if (current?.status !== 'granted') {
      current = await requestPermission();
    }
    if (current.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled) return;
    const first = result.assets[0];
    if (!first) return;
    setAsset({ uri: first.uri, width: first.width, height: first.height });
  }, [permission, requestPermission]);

  return { status, asset, pick };
}

function statusOfPicker(
  response: ImagePicker.MediaLibraryPermissionResponse | null,
): PermStatus {
  if (!response) return 'undetermined';
  if (response.status === 'granted') return 'granted';
  if (!response.canAskAgain) return 'blocked';
  return 'denied';
}

/* ------------------------------------------------------------------ */
/* 4. Secure storage                                                   */
/* ------------------------------------------------------------------ */

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
 * expo-secure-store demo. This is the RN-standard store for auth tokens,
 * refresh tokens, and other secrets — the OS-backed keychain (iOS) / Keystore
 * (Android) encrypts the value at rest, unlike plain AsyncStorage (plaintext).
 * The shape mirrors the DAO behind AsyncStorage used elsewhere in this app, but
 * scoped to a single sensitive value rather than a JSON document collection.
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

/* ------------------------------------------------------------------ */
/* 5. Device info (pure helper)                                       */
/* ------------------------------------------------------------------ */

export interface DeviceInfo {
  platform: string;
  platformVersion: number | string;
  screenWidth: number;
  screenHeight: number;
  scale: number;
  fontScale: number;
  pixelRatio: number;
  modelName: string | null;
  deviceName: string | null;
  expoConfigName: string | null;
  runtimeVersion: string | null;
}

/**
 * Read the device/runtime identity from the three portable RN sources —
 * `Platform`, `expo-constants`, and `Dimensions`/`PixelRatio`. Pure: call it
 * any time for a fresh readout (no React, no side-effects, no `any`). The
 * view's <Code> block cites this helper verbatim.
 */
export function deviceInfo(): DeviceInfo {
  const win = Dimensions.get('window');
  // `Constants.platform` is keyed by OS; the per-OS record is loosely typed in
  // expo-constants, so read it defensively.
  const platformRecord = (Constants.platform ?? {}) as Record<
    string,
    { model?: string; buildId?: string } | undefined
  >;
  const osInfo = platformRecord[Platform.OS];
  const expoConfig = Constants.expoConfig;
  // `runtimeVersion` may be either a literal string OR a `{ policy: ... }`
  // object (fingerprint/sdkVersion policy). Collapse to a display string only
  // when it's a literal — a policy object isn't a resolved version we can show.
  const runtimeVersionRaw = expoConfig?.runtimeVersion;
  const runtimeVersion: string | null =
    typeof runtimeVersionRaw === 'string' ? runtimeVersionRaw : null;
  return {
    platform: Platform.OS,
    platformVersion: Platform.Version as number | string,
    screenWidth: Math.round(win.width),
    screenHeight: Math.round(win.height),
    scale: win.scale,
    fontScale: win.fontScale,
    pixelRatio: PixelRatio.get(),
    modelName: osInfo?.model ?? null,
    deviceName: Constants.deviceName ?? null,
    expoConfigName: expoConfig?.name ?? null,
    runtimeVersion,
  };
}
