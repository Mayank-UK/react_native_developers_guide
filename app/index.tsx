import { Box } from '../src/ui/design-system';
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
      // keep the `/ui` hub, drop its sub-screens (`/ui/...`)
      !(r.path !== RoutePaths.ui && r.path.startsWith('/ui/')),
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
