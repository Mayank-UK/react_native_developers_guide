import { DependencyManagementView } from '../src/ui/views/dependency_management/dependency_management_view';

/**
 * Dependency Management route — Expo Router file for `/dependency-management`.
 * The view (dumb UI) + its hooks (logic) + spec live under
 * `src/ui/views/dependency_management/`, mirroring react_developers_guide.
 */
export default function Route() {
  return <DependencyManagementView />;
}
