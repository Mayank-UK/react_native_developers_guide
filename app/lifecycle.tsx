import { LifecycleScreen } from '../src/ui/screens/lifecycle-screen';

/**
 * Lifecycle route — Expo Router file for `/lifecycle`.
 * The screen component lives under `src/ui/screens/` so it mirrors the
 * topic-screen convention and stays testable in isolation.
 */
export default function Route() {
  return <LifecycleScreen />;
}
