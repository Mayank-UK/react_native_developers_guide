import { Stack } from 'expo-router';

/**
 * UI section navigator. A Stack so the section hub (`/ui`) and its sub-screens
 * (`/ui/layout`, `/ui/styling`, …) form a real back-stack: back from a
 * sub-screen pops to the section hub, then to home. Without this layout the
 * folder's routes flatten into the root Drawer and "back" jumps straight to
 * home, skipping the section hub. `headerShown:false` — ScreenScaffold owns
 * the per-screen chrome.
 */
export default function UiLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
