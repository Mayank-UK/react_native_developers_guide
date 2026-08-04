import { Stack } from 'expo-router';

/**
 * State-management section navigator. A Stack so the section hub
 * (`/state-management`) and its sub-screens (`/state-management/local-state`,
 * `/state-management/zustand`, …) form a real back-stack: back from a sub-screen
 * pops to the section hub, then to home. Without this layout the folder's routes
 * flatten into the root Drawer and "back" jumps straight to home, skipping the
 * section hub. `headerShown:false` — ScreenScaffold owns the per-screen chrome.
 */
export default function StateManagementLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
