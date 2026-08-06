import { Image } from 'react-native';
import { ScreenScaffold, Section, Code, Pill } from '../../../../components';
import { Box, Button, Text } from '../../../../components';
import { Radii } from '../../../../design-system/tokens';
import { permissionLabel } from '../../device_features_hooks';
import { useCameraDemo } from './camera_hooks';

/** One-off illustration dimension: the picked/captured asset preview height. */
const DEMO_ASSET_PREVIEW_HEIGHT = 180;

/**
 * CameraView — a dumb structure. All native calls + state live in the
 * co-located hooks file; this file only renders.
 *
 * expo-image-picker demo: TWO capabilities behind TWO permission hooks — the
 * system media-library picker AND the device camera for capture. The picked /
 * captured asset comes back as a URI the RN Image component can render
 * directly — no base64 round-trip, no manual file copy.
 */
export function CameraView() {
  return (
    <ScreenScaffold
      title="Camera & Media Library"
    >
      <LiveDemoCard />
      <TwoPermissionsCard />
      <DevBuildNoteCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */

function LiveDemoCard() {
  const { mediaStatus, cameraStatus, asset, pick, capture } = useCameraDemo();
  return (
    <Section
      title="Camera & media — LIVE"
      explanation="Pick from the media library or capture with the camera. Each path has its own permission; the asset URI is rendered directly by the RN Image."
    >
      <Box gap="sm">
        <Box row gap="xs" center style={{ flexWrap: 'wrap' }}>
          <Pill
            label="Media"
            value={permissionLabel(mediaStatus)}
            tone={mediaStatus === 'granted' ? 'success' : mediaStatus === 'blocked' ? 'danger' : 'muted'}
          />
          <Pill
            label="Camera"
            value={permissionLabel(cameraStatus)}
            tone={cameraStatus === 'granted' ? 'success' : cameraStatus === 'blocked' ? 'danger' : 'muted'}
          />
        </Box>
        {asset ? (
          <Box gap="xs">
            <Image
              source={{ uri: asset.uri }}
              style={{ width: '100%', height: DEMO_ASSET_PREVIEW_HEIGHT, borderRadius: Radii.md }}
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
            No asset yet.
          </Text>
        )}
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Button
            title={mediaStatus === 'blocked' ? 'Picker blocked' : 'Pick from library'}
            variant={mediaStatus === 'blocked' ? 'ghost' : 'outline'}
            disabled={mediaStatus === 'blocked'}
            onPress={() => void pick()}
          />
          <Button
            title={cameraStatus === 'blocked' ? 'Camera blocked' : 'Capture with camera'}
            variant={cameraStatus === 'blocked' ? 'ghost' : 'filled'}
            disabled={cameraStatus === 'blocked'}
            onPress={() => void capture()}
          />
        </Box>
        <Code language="ts" caption="camera_hooks.ts — two permissions, two launch paths">{`export function useCameraDemo() {
  const [mediaPerm, requestMediaPerm] = ImagePicker.useMediaLibraryPermissions();
  const [cameraPerm, requestCameraPerm] = ImagePicker.useCameraPermissions();
  const [asset, setAsset] = useState<PickedAsset | null>(null);

  // Media-library picker.
  const pick = useCallback(async () => {
    let current = mediaPerm;
    if (current?.status !== 'granted') current = await requestMediaPerm();
    if (current.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',     // literal-union form — no runtime enum import
      quality: 0.8,
    });
    if (result.canceled) return;
    const first = result.assets[0];
    if (!first) return;
    setAsset({ uri: first.uri, width: first.width, height: first.height });
  }, [mediaPerm, requestMediaPerm]);

  // Camera capture (same shape, different permission + launch call).
  // const capture = useCallback(async () => { … launchCameraAsync(…) }, […]);

  return { mediaStatus, cameraStatus, asset, pick, capture };
}`}</Code>
      </Box>
    </Section>
  );
}

function TwoPermissionsCard() {
  return (
    <Section
      title="Why two permissions"
      explanation="Reading existing media and capturing new media are different OS-level concerns. iOS surfaces NSPhotoLibraryUsageDescription and NSCameraUsageDescription separately; Android surfaces READ_MEDIA_IMAGES and CAMERA separately. expo-image-picker wires each behind its own permission hook so you request only what you use."
    >
      <Code language="ts" caption="the two permission hooks (each its own lifecycle)">{`const [mediaPerm,  askMedia]  = ImagePicker.useMediaLibraryPermissions();
const [cameraPerm, askCamera] = ImagePicker.useCameraPermissions();`}</Code>
    </Section>
  );
}

function DevBuildNoteCard() {
  return (
    <Section
      title="When you need more than capture"
      explanation="expo-image-picker hands you a single captured/picked asset as a URI — the right choice for avatars, attachments, and most apps. If you need a live camera texture (scanner overlays, real-time frame processing, barcode scanning), reach for expo-camera (a dev-build-only module) instead."
    >
      <Text variant="caption" tone="muted">
        This screen uses only the picker's capture path, which runs inside Expo
        Go. The full <Text style={{ fontFamily: 'monospace' }}>expo-camera</Text>{' '}
        view (live preview, frame callbacks) needs a development build — see the
        build & deployment topic.
      </Text>
    </Section>
  );
}
