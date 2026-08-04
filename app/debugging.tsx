import { DebuggingView } from '../src/ui/views/debugging/debugging_view';

/**
 * Debugging route — Expo Router file for `/debugging`. The view (dumb UI) +
 * its hooks (logic) + spec live under `src/ui/views/debugging/`, mirroring
 * react_developers_guide.
 */
export default function Route() {
  return <DebuggingView />;
}
