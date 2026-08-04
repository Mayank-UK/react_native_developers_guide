import { Box, Text } from '../../design-system';
import { ScreenScaffold, LinkCard, Section } from '../../components';
import { ROUTES, RoutePaths } from '../../navigation/routes';

/**
 * UiHubView — a dumb structure. The section hub is static (no state/effects),
 * so there is no `_hooks.ts` file; the `ROUTES.filter` below is a pure
 * derivation over the route table (the single source of truth), presentational.
 *
 * UI section index — the landing screen for `/ui`. Lists the five UI
 * sub-screens (sourced from the route table) as `LinkCard`s (arrow affordance),
 * each navigating to its sub-screen.
 */
export function UiHubView() {
  const subRoutes = ROUTES.filter(
    (r) =>
      r.enabled &&
      r.path !== RoutePaths.ui &&
      (r.path === RoutePaths.layoutStructure ||
        r.path === RoutePaths.styling ||
        r.path === RoutePaths.interactive ||
        r.path === RoutePaths.responsive ||
        r.path === RoutePaths.designSystem),
  );

  return (
    <ScreenScaffold title="UI Section">
      <Section
        title="UI in React Native"
        explanation="The four pillars the rest of this app is built on, plus a tour of its design system."
      >
        <Text variant="body">
          React Native renders to native views (iOS/Android) and to the DOM
          (web), but you program one declarative model. This section walks
          through the four pillars the rest of the app relies on —{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            layout
          </Text>
          ,{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            styling
          </Text>
          ,{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            interaction
          </Text>
          , and{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            responsiveness
          </Text>
          — plus a tour of this app's own design system.
        </Text>
        <Text variant="small" tone="muted">
          Every screen below ships live, interactive demos. Tap a card to open
          it; use the back arrow to return here.
        </Text>
      </Section>

      <Box gap="sm">
        {subRoutes.map((route) => (
          <LinkCard
            key={route.path}
            title={route.title}
            description={route.description}
            href={route.path}
          />
        ))}
      </Box>
    </ScreenScaffold>
  );
}
