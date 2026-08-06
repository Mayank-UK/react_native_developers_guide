import { ScreenScaffold, Section, Code, Pill } from '../../../../components';
import { Box, Text } from '../../../../components';
import { PERMISSION_STATUS, type PermStatus } from '../../device_features_hooks';

/**
 * PermissionsView — a dumb structure. This screen teaches the PERMISSIONS
 * MODEL that every other per-feature screen (camera, geolocation) relies on.
 * Pure teaching content — no state/effects — so there is no `_hooks.ts` file;
 * the permission primitives live in the shared `device_features_hooks.ts`
 * kernel and are imported by the camera/geolocation sub-views.
 */
export function PermissionsView() {
  return (
    <ScreenScaffold
      title="The Permissions Model"
    >
      <WhyPermissionsCard />
      <LifecycleCard />
      <PermissionHookShapeCard />
      <UsageStringsCard />
    </ScreenScaffold>
  );
}

const PERMISSION_LIFECYCLE: readonly PermStatus[] = [
  'undetermined',
  'granted',
  'denied',
  'blocked',
];

/* ------------------------------------------------------------------ */

function WhyPermissionsCard() {
  return (
    <Section
      title="Why permissions exist"
      explanation="RN gates any capability that touches user data or sensors — camera, location, media, contacts, bluetooth. The OS, not your JS, owns the prompt; your app asks, the user decides, and the result is mirrored into a React state machine."
    >
      <Text variant="caption" tone="muted">
        The prompt itself is rendered by the operating system (iOS springboard /
        Android system UI). Your JS can only <Text style={{ fontFamily: 'monospace' }}>request()</Text>{' '}
        it once per denial cycle and then read back the resulting state — it can
        never force a grant, never re-show a hard-denied prompt, and never read
        the underlying sensor until the OS says granted.
      </Text>
    </Section>
  );
}

function LifecycleCard() {
  return (
    <Section
      title="The four-way lifecycle"
      explanation="A permission starts undetermined. Your app calls request() once — the OS shows its native dialog. The user grants or denies. After a hard deny (with 'don't ask again'), the state becomes blocked — the in-app prompt can never show again; the only path back is the OS Settings screen."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {PERMISSION_LIFECYCLE.map((step) => (
            <Pill
              key={step}
              tone={step === 'granted' ? 'success' : step === 'blocked' ? 'danger' : 'muted'}
              value={step}
            />
          ))}
        </Box>
        <Code language="ts" caption="the four branches the UI switches on">{`// status === 'granted'                 → use the feature
// status === 'denied' && canAskAgain   → show a "Request again" button
// status === 'denied' && !canAskAgain  → BLOCKED → "Open OS Settings"
// permission === null / 'undetermined' → "Request" CTA (first run)`}</Code>
      </Box>
    </Section>
  );
}

function PermissionHookShapeCard() {
  return (
    <Section
      title="The idiomatic Expo permission hook"
      explanation="Each Expo module ships its own permission hook — useForegroundPermissions, useMediaLibraryPermissions, useCameraPermissions, etc. They all return the SAME [response, request] tuple shape, so the lifecycle code is identical across capabilities."
    >
      <Code language="ts" caption="a useState-shaped tuple mirrored from OS state">{`const [permission, requestPermission] = Location.useForegroundPermissions();
// permission: { status, granted, canAskAgain, expires } | null
// requestPermission(): Promise<PermissionResponse>  → triggers the OS prompt

// Collapse any module's response into the four-way PermStatus via the shared
// kernel helper (see device_features_hooks.ts):
import { statusOfPermission } from '@/views/device_features/device_features_hooks';
const status = statusOfPermission(permission);`}</Code>
      <Text variant="caption" tone="muted">
        The hook mirrors the OS permission state into React and exposes a{' '}
        <Text style={{ fontFamily: 'monospace' }}>request()</Text> that triggers
        the system prompt (one shot —{' '}
        <Text style={{ fontFamily: 'monospace' }}>canAskAgain</Text> flips false
        after a hard denial).
      </Text>
    </Section>
  );
}

function UsageStringsCard() {
  return (
    <Section
      title="Usage strings — required for real builds"
      explanation="Expo Go pre-wires the permission prompts, so the flows work without these keys during development. They become mandatory the moment you ship a real dev / EAS build — that is what the build & deployment topic teaches."
    >
      <Code language="ts" caption="declarative usage strings — Info.plist + app.config.ts plugin">{`// iOS — Info.plist (NSLocationWhenInUseUsageDescription):
//   <key>NSLocationWhenInUseUsageDescription</key>
//   <string>This app reads your location to demo the permissions model.</string>

// Android — app.config.ts plugin permission:
//   plugins: [
//     ['expo-location', { locationWhenInUsePermission: 'Location to demo perms.' }],
//   ]`}</Code>
    </Section>
  );
}
