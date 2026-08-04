import { StateManagementHubView } from '../../src/ui/views/state_management/state_management_view';

/**
 * State-management section index — Expo Router file for `/state-management`.
 * Landing screen that lists the four state sub-screens. The hub view (dumb UI)
 * + spec live under `src/ui/views/state_management/`; this route is a thin
 * wrapper. The hub is static (no hooks file).
 */
export default function Route() {
  return <StateManagementHubView />;
}
