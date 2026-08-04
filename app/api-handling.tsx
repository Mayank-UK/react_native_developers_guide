import { ApiHandlingView } from '../src/ui/views/api_handling/api_handling_view';

/**
 * API Handling route — thin wrapper around the dumb view. All logic + teaching
 * content lives in src/ui/views/api_handling/.
 */
export default function Route() {
  return <ApiHandlingView />;
}
