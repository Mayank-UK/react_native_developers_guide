import { DeviceFeaturesView } from '../../src/ui/views/device_features/device_features_view';

/**
 * Native Device Features section index — Expo Router file for
 * `/device-features`. Landing screen that lists the six per-feature
 * sub-screens. The view (dumb UI) + spec live under
 * `src/ui/views/device_features/`; this route is a thin wrapper.
 */
export default function Route() {
  return <DeviceFeaturesView />;
}
