import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  statusOfPermission,
  type PermStatus,
} from '../../device_features_hooks';

/**
 * Camera & media library — view logic. expo-image-picker covers BOTH the
 * system media-library picker AND launching the device camera for capture,
 * behind two separate permission hooks. Reuses the shared permission kernel
 * (`statusOfPermission`) so the lifecycle is the same four-way branch.
 */

export interface PickedAsset {
  uri: string;
  width: number;
  height: number;
}

export interface CameraDemo {
  /** Media-library permission lifecycle state (for the picker). */
  mediaStatus: PermStatus;
  /** Camera permission lifecycle state (for capture). */
  cameraStatus: PermStatus;
  /** Last-picked/captured asset, or null if none yet. */
  asset: PickedAsset | null;
  /** Request permission (if needed) then launch the system media picker. */
  pick: () => Promise<void>;
  /** Request camera permission (if needed) then launch the camera for capture. */
  capture: () => Promise<void>;
}

/**
 * expo-image-picker demo. Two capabilities, two permission hooks. `pick()`
 * ensures the media-library permission is granted, then launches the system
 * picker. `capture()` ensures the camera permission is granted, then launches
 * the camera. `mediaTypes` is passed as the plain string 'images' (the
 * package's literal-union form) to avoid importing the runtime enum.
 */
export function useCameraDemo(): CameraDemo {
  const [mediaPerm, requestMediaPerm] = ImagePicker.useMediaLibraryPermissions();
  const [cameraPerm, requestCameraPerm] = ImagePicker.useCameraPermissions();
  const [asset, setAsset] = useState<PickedAsset | null>(null);

  const mediaStatus = statusOfPermission(mediaPerm);
  const cameraStatus = statusOfPermission(cameraPerm);

  const pick = useCallback(async () => {
    let current = mediaPerm;
    if (current?.status !== 'granted') {
      current = await requestMediaPerm();
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
  }, [mediaPerm, requestMediaPerm]);

  const capture = useCallback(async () => {
    let current = cameraPerm;
    if (current?.status !== 'granted') {
      current = await requestCameraPerm();
    }
    if (current.status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled) return;
    const first = result.assets[0];
    if (!first) return;
    setAsset({ uri: first.uri, width: first.width, height: first.height });
  }, [cameraPerm, requestCameraPerm]);

  return { mediaStatus, cameraStatus, asset, pick, capture };
}
