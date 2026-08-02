import { StateManagementScreen } from '../src/ui/screens/state-management-screen';

/**
 * State Management route — Expo Router file for `/state-management`.
 * The screen component lives under `src/ui/screens/` so it mirrors the
 * topic-screen convention and stays testable in isolation.
 */
export default function Route() {
  return <StateManagementScreen />;
}
