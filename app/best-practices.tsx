import { BestPracticesView } from '../src/ui/views/best_practices/best_practices_view';

/**
 * Best Practices route — Expo Router file for `/best-practices`. The view lives
 * under `src/ui/views/best_practices/` per the view/hooks/spec convention and
 * stays testable in isolation.
 */
export default function Route() {
  return <BestPracticesView />;
}
