import { Dimensions, Platform, PixelRatio } from 'react-native';
import Constants from 'expo-constants';

/**
 * Native Device Features — shared kernel. The pure permission model + device
 * readout that the hub AND the per-feature sub-views (camera, geolocation,
 * permissions) all build on. The actual native calls (haptics, location,
 * image-picker, secure-store, sensors) each live in their OWN sub_view hooks
 * file; this module is the SSOT for the cross-cutting permission lifecycle.
 *
 * No `enum` (erasableSyntaxOnly) — const-objects + literal unions only.
 * No `any`; strict + erasure-clean.
 */

/* ------------------------------------------------------------------ */
/* 1. The permission lifecycle (shared SSOT)                          */
/* ------------------------------------------------------------------ */

/**
 * The four lifecycle states a runtime permission can be in. The Expo native
 * APIs return only `granted` / `denied` / `undetermined`; `blocked` is the UX
 * state where the user denied with "don't ask again" (`canAskAgain === false`)
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
 * The shape every Expo permission hook response satisfies (`status`, `granted`,
 * `canAskAgain`). Used by `statusOfPermission` to collapse any module's
 * permission response into the four-way `PermStatus` the UI branches on.
 */
export interface PermissionLike {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Collapse any Expo permission response into the four-way PermStatus. Pure —
 * exported for unit testing and reused by every permissioned sub-view hook.
 * `null` (the hook's initial state before any permission fetch resolves) is
 * treated as `undetermined`; `denied + !canAskAgain` collapses to `blocked`.
 */
export function statusOfPermission(response: PermissionLike | null): PermStatus {
  if (!response) return 'undetermined';
  if (response.status === 'granted') return 'granted';
  if (!response.canAskAgain) return 'blocked';
  return 'denied';
}

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
/* 2. Device info (pure helper)                                       */
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
 * any time for a fresh readout (no React, no side-effects, no `any`). The hub's
 * <Code> block cites this helper verbatim.
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
