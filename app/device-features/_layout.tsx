import { Stack } from 'expo-router';

/**
 * Native Device Features section navigator. A Stack so the section hub
 * (`/device-features`) and its per-feature sub-screens (`/device-features/camera`,
 * `/device-features/geolocation`, …) form a real back-stack: back from a
 * sub-screen pops to the section hub, then to home. Without this layout the
 * folder's routes flatten into the root Drawer and "back" jumps straight to
 * home, skipping the hub. `headerShown:false` — ScreenScaffold owns the
 * per-screen chrome.
 */
export default function DeviceFeaturesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
