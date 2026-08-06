import { ScreenScaffold, LinkCard, Section } from '../../components';
import { Box, Pill, Text } from '../../components';
import { ROUTES, RoutePaths } from '../../navigation/routes';
import { deviceInfo } from './device_features_hooks';

/**
 * DeviceFeaturesView — the section HUB (dumb structure). It lists the six
 * per-feature sub-screens as `LinkCard`s (sourced from the route SSOT) and
 * carries two supporting, feature-agnostic cards that don't belong to any
 * single feature: the live device-info readout (pure data, no permission) and
 * the Expo Go vs dev-build matrix (the cross-cutting "what runs where" rule).
 *
 * Static + a pure derivation over ROUTES — no state/effects, so no hooks file
 * beyond the shared `device_features_hooks.ts` kernel (deviceInfo +
 * permission primitives) that the sub-views reuse.
 */
export function DeviceFeaturesView() {
  const subRoutes = ROUTES.filter(
    (r) =>
      r.enabled &&
      r.path !== RoutePaths.deviceFeatures &&
      (r.path === RoutePaths.devicePermissions ||
        r.path === RoutePaths.deviceCamera ||
        r.path === RoutePaths.deviceGeolocation ||
        r.path === RoutePaths.deviceHaptics ||
        r.path === RoutePaths.deviceSensors ||
        r.path === RoutePaths.deviceSecureStorage),
  );

  return (
    <ScreenScaffold
      title="Native Device Features"
    >
      <Section
        title="Native capabilities, one screen each"
        explanation="Every capability that touches a sensor or user data gets its own screen and its own working sample. Tap a card to open it."
      >
        <Box gap="sm">
          {subRoutes.map((route) => (
            <LinkCard
              key={route.path}
              title={route.title}
              description={route.description}
              href={route.path}
            />
          ))}
        </Box>
      </Section>

      <DeviceInfoCard />
      <ExpoGoVsDevBuildCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* Supporting card: device info (live, pure — no permission)          */
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
        <Text variant="caption" tone="muted">
          This readout needs no permission — it's pure runtime metadata. The
          per-feature screens below each demonstrate a permissioned capability.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Supporting card: Expo Go vs dev build matrix                       */
/* ------------------------------------------------------------------ */

const DEV_BUILD_MATRIX: ReadonlyArray<{ feature: string; expoGo: boolean; note: string }> = [
  { feature: 'Haptics', expoGo: true, note: 'Works in Expo Go' },
  { feature: 'Location (foreground)', expoGo: true, note: 'Works in Expo Go' },
  { feature: 'Image picker / media library', expoGo: true, note: 'Works in Expo Go' },
  { feature: 'Camera (capture)', expoGo: true, note: 'Works in Expo Go' },
  { feature: 'Sensors (accelerometer / gyro)', expoGo: true, note: 'Works in Expo Go' },
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
      explanation="Expo Go ships a fixed set of native modules; every feature on the sub-screens runs inside it. Capabilities that need their OWN native code (a config plugin, a custom pod, or a permission Expo Go can't surface) require a development build — `npx expo run:ios` / `npx expo run:android` — or an EAS build."
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
