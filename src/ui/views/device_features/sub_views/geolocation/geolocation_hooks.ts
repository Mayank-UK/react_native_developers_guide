import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import {
  statusOfPermission,
  type PermStatus,
} from '../../device_features_hooks';

/**
 * Geolocation — view logic. expo-location: request foreground permission, then
 * take a single fix. Reuses the shared permission kernel (`statusOfPermission`)
 * so the lifecycle is the same four-way branch as every other permissioned
 * feature.
 */

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
 * expo-location demo. `useForegroundPermissions` is the idiomatic Expo
 * permission hook — it returns `[permResponse, requestPermission, getPermission]`,
 * mirrors the OS permission state into React, and exposes a `request()` that
 * triggers the system prompt (one shot — `canAskAgain` flips false after a hard
 * denial). On grant, we call `getCurrentPositionAsync` for a single fix.
 */
export function useLocationDemo(): LocationDemo {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [position, setPosition] = useState<GeoPosition | null>(null);

  const status = statusOfPermission(permission);

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
