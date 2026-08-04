import { UiHubView } from '../../src/ui/views/ui_hub/ui_hub_view';

/**
 * UI section index — Expo Router file for `/ui`. Landing screen that lists the
 * five UI sub-screens. The view (dumb UI) + spec live under
 * `src/ui/views/ui_hub/`; this route is a thin wrapper. The hub is static (no
 * hooks file).
 */
export default function Route() {
  return <UiHubView />;
}
