import { ScreenScaffold, Section, Code, Pill } from '../../../../components';
import { Box, Button, Card, Text } from '../../../../components';
import { permissionLabel } from '../../device_features_hooks';
import { useLocationDemo } from './geolocation_hooks';

/**
 * GeolocationView — a dumb structure. All native calls + state live in the
 * co-located hooks file; this file only renders.
 *
 * expo-location demo: request foreground permission, then take a single fix.
 * The card reflects each lifecycle state explicitly — granted, denied
 * (re-askable), or blocked (must use OS Settings).
 */
export function GeolocationView() {
  return (
    <ScreenScaffold
      title="Geolocation"
    >
      <ForegroundVsBackgroundCard />
      <LiveDemoCard />
      <ReverseGeocodeCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */

function ForegroundVsBackgroundCard() {
  return (
    <Section
      title="Foreground vs background location"
      explanation="expo-location splits location access into two permissions. Foreground (the common case) is granted while the app is visible; background needs a SEPARATE, stricter permission and on iOS requires the special 'always' usage string plus a runtime prompt — Apple reviews it carefully."
    >
      <Code language="ts" caption="the two permission hooks">{`// Foreground — the demo on this screen.
const [perm, ask] = Location.useForegroundPermissions();

// Background — stricter; needs extra Info.plist keys + a runtime prompt.
// const [bgPerm, askBg] = Location.useBackgroundPermissions();`}</Code>
    </Section>
  );
}

function LiveDemoCard() {
  const { status, position, request, refresh } = useLocationDemo();
  return (
    <Section
      title="Geolocation — LIVE"
      explanation="Request foreground permission, then take a single fix. The UI branches on the four-way permission lifecycle — the same shape every permissioned feature uses."
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
        <Code language="ts" caption="geolocation_hooks.ts — the real permissioned hook">{`export function useLocationDemo() {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const status = statusOfPermission(permission);   // granted | denied | undetermined | blocked

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

function ReverseGeocodeCard() {
  return (
    <Section
      title="Beyond a single fix"
      explanation="getCurrentPositionAsync takes a one-shot fix. For continuous tracking, use watchPositionAsync; to turn coords into an address, use reverseGeocodeAsync; to geocode an address to coords, use geocodeAsync."
    >
      <Code language="ts" caption="the rest of the expo-location surface">{`// Continuous tracking (returns a subscription to remove on unmount).
const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced }, (pos) => {
  // pos.coords.{latitude, longitude, accuracy, ...}
});
// sub.remove();

// Coordinates → human address.
const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });

// Address → coordinates.
const hits = await Location.geocodeAsync('1600 Amphitheatre Pkwy, Mountain View');`}</Code>
    </Section>
  );
}
