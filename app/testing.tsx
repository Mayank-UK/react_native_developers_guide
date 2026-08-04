import { TestingView } from '../src/ui/views/testing/testing_view';

/**
 * Testing route — Expo Router file for `/testing`. The view lives under
 * `src/ui/views/testing/` per the view/hooks/spec convention and stays testable
 * in isolation.
 */
export default function Route() {
  return <TestingView />;
}
