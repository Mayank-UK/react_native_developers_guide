import { BuildDeploymentView } from '../src/ui/views/build_deployment/build_deployment_view';

/**
 * Build & Deployment route — Expo Router file for `/build-deployment`.
 * The view (dumb UI) + its hooks (logic) + spec live under
 * `src/ui/views/build_deployment/`, mirroring the sibling guides.
 */
export default function Route() {
  return <BuildDeploymentView />;
}
