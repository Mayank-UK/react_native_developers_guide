import { ScreenScaffold, Section, Code, Pill } from '../../../../components';
import { Box, Button, Text } from '../../../../components';
import { UPDATE_INTERVALS, useAccelerometerDemo, type UpdateInterval } from './sensors_hooks';

/**
 * SensorsView — a dumb structure. All subscription logic + state live in the
 * co-located hooks file; this file only renders.
 *
 * expo-sensors demo: a live accelerometer stream. The same subscription shape
 * powers gyroscope / magnetometer / barometer (each exports the same surface).
 */
export function SensorsView() {
  return (
    <ScreenScaffold
      title="Sensors"
    >
      <SubscriptionModelCard />
      <LiveDemoCard />
      <OtherSensorsCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */

function SubscriptionModelCard() {
  return (
    <Section
      title="The subscription model"
      explanation="expo-sensors streams high-frequency device-motion data via a subscription: set the cadence with setUpdateInterval(ms), register a listener with addListener(cb) that returns a subscription, and call .remove() to tear it down. The pattern is identical across every sensor the package exposes."
    >
      <Code language="ts" caption="the whole expo-sensors surface shape">{`import { Accelerometer } from 'expo-sensors';

Accelerometer.setUpdateInterval(100);          // ms between samples
const sub = Accelerometer.addListener((data) => {
  // data: { x, y, z }  → device tilt + linear acceleration (incl. gravity)
});
sub.remove();                                   // teardown (on unmount / pause)`}</Code>
    </Section>
  );
}

function LiveDemoCard() {
  const { reading, active, interval, setInterval, pause, resume } = useAccelerometerDemo();
  return (
    <Section
      title="Accelerometer — LIVE"
      explanation="Pick a cadence and watch the stream. With the device flat, gravity (~9.81 m/s²) reads along one axis; tilt the device and the vector moves between axes. Pause stops the subscription; resume recreates it."
    >
      <Box gap="sm">
        <Box row gap="xs" center style={{ flexWrap: 'wrap' }}>
          <Pill label="State" value={active ? 'streaming' : 'paused'} tone={active ? 'success' : 'muted'} />
          <Pill label="Cadence" value={`${String(UPDATE_INTERVALS[interval])}ms`} />
        </Box>
        {reading ? (
          <Box row gap="sm" center>
            <Axis label="x" value={reading.x} />
            <Axis label="y" value={reading.y} />
            <Axis label="z" value={reading.z} />
          </Box>
        ) : (
          <Text variant="caption" tone="muted">
            Waiting for first sample…
          </Text>
        )}
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {(Object.keys(UPDATE_INTERVALS) as readonly UpdateInterval[]).map((key) => (
            <Button
              key={key}
              title={`${key} (${UPDATE_INTERVALS[key]}ms)`}
              variant={interval === key ? 'filled' : 'outline'}
              onPress={() => setInterval(key)}
            />
          ))}
        </Box>
        <Box row gap="sm">
          {active ? (
            <Button title="Pause" variant="ghost" onPress={pause} />
          ) : (
            <Button title="Resume" variant="outline" onPress={resume} />
          )}
        </Box>
        <Code language="ts" caption="sensors_hooks.ts — the real hook">{`export function useAccelerometerDemo() {
  const [reading, setReading] = useState<AccelReading | null>(null);
  const [active, setActive] = useState(true);
  const [interval, setIntervalKey] = useState<UpdateInterval>('ui');

  useEffect(() => {
    Accelerometer.setUpdateInterval(UPDATE_INTERVALS[interval]);
  }, [interval]);

  useEffect(() => {
    if (!active) return;
    const sub = Accelerometer.addListener((data) => {
      setReading({ x: data.x, y: data.y, z: data.z });
    });
    return () => { sub.remove(); };
  }, [active]);

  return { reading, active, interval, setInterval: setIntervalKey, pause, resume };
}`}</Code>
      </Box>
    </Section>
  );
}

/** A single axis readout (kept local — single use). */
function Axis({ label, value }: { label: string; value: number }) {
  return (
    <Box flex={1} p="sm" radius="sm" bg="surfaceVariant" center>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }} mt="xxs">
        {value.toFixed(2)}
      </Text>
    </Box>
  );
}

function OtherSensorsCard() {
  return (
    <Section
      title="The other sensors"
      explanation="Each sensor in the package exposes the same surface — only the data shape differs. Swap the import and the body of the listener; the subscription lifecycle above is unchanged."
    >
      <Code language="ts" caption="the rest of the expo-sensors exports">{`import { Gyroscope, Magnetometer, Barometer, Pedometer } from 'expo-sensors';

// Gyroscope       → { x, y, z }     rotation rate (rad/s)
// Magnetometer    → { x, y, z }     magnetic field (μT) — compass heading
// Barometer       → { pressure, relativeAltitude }  hPa + metres
// Pedometer       → step count via getStepCountAsync(start, end)`}</Code>
      <Text variant="caption" tone="muted">
        Sensor availability varies by device — call{' '}
        <Text style={{ fontFamily: 'monospace' }}>isAvailableAsync()</Text> before
        subscribing so a missing sensor (common on emulators) doesn't crash the
        screen.
      </Text>
    </Section>
  );
}
