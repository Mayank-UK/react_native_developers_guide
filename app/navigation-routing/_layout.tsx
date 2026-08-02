import { Stack } from 'expo-router';

/**
 * Navigation & Routing navigator. A Stack so the dynamic detail route
 * (`/navigation-routing/[id]`) sits on a back-stack behind the section screen
 * (`/navigation-routing`) — back from the detail pops to the section, not home.
 * `headerShown:false` — ScreenScaffold owns the per-screen chrome.
 */
export default function NavigationRoutingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
