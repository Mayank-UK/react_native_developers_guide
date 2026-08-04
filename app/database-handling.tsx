import { DatabaseHandlingView } from '../src/ui/views/database_handling/database_handling_view';

/**
 * Database Handling route — Expo Router file for `/database-handling`.
 * The view lives under `src/ui/views/database_handling/` (logic↔UI separation;
 * see exception_handling for the convention).
 */
export default function Route() {
  return <DatabaseHandlingView />;
}
