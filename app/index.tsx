import { Box } from '../src/ui/components';
import { ScreenScaffold, LinkCard } from '../src/ui/components';
import { ROUTES, RoutePaths } from '../src/ui/navigation/routes';

/**
 * Hub — the home grid. A FLAT list of topic cards (no section headings, per the
 * review: "list normally"). About is NOT shown here (drawer-only), and the five
 * UI sub-screens live only under the `/ui` section hub — so home shows a single
 * "UI Section" card rather than re-listing them.
 *
 * Tapping a not-yet-built route resolves to the catch-all placeholder.
 */
export default function HubScreen() {
  const items = ROUTES.filter(
    (r) =>
      r.path !== RoutePaths.about &&
      // keep section hubs, drop their sub-screens (`/ui/...`, `/state-management/...`, `/device-features/...`)
      !(r.path !== RoutePaths.ui && r.path.startsWith('/ui/')) &&
      !(r.path !== RoutePaths.stateManagement && r.path.startsWith('/state-management/')) &&
      !(r.path !== RoutePaths.deviceFeatures && r.path.startsWith('/device-features/')) &&
      // images/assets lives under the UI section hub, not on home (see ui_hub_view)
      r.path !== RoutePaths.imagesAssets,
  );

  return (
    <ScreenScaffold title="React Native Developer's Guide">
      <Box gap="sm">
        {items.map((r) => (
          <LinkCard
            key={r.path}
            title={r.title}
            description={r.description}
            href={r.enabled ? r.path : undefined}
          />
        ))}
      </Box>
    </ScreenScaffold>
  );
}
