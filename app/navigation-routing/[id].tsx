import { useLocalSearchParams } from 'expo-router';
import { Box, Card, Text } from '../../src/ui/design-system';
import { ScreenScaffold } from '../../src/ui/components/screen-scaffold';

/**
 * Dynamic-route detail screen for `/navigation-routing/:id`.
 *
 * Minimal, on-topic: exists purely to demonstrate that a `[id].tsx` file
 * captures the URL segment and surfaces it via useLocalSearchParams. The
 * Navigation & Routing screen navigates here from the dynamic-params demo.
 * The AppBar back-arrow returns to the section screen.
 */
export default function NavigationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ScreenScaffold title="Dynamic Route Detail">
      <Card>
        <Box gap="sm">
          <Text variant="body">
            This screen is rendered by app/navigation-routing/[id].tsx.
          </Text>
          <Box gap="xxs">
            <Text variant="caption" tone="muted">
              useLocalSearchParams read the [id] segment:
            </Text>
            <Text variant="h2" tone="primary" style={{ fontFamily: 'monospace' }}>
              {id ?? '(none)'}
            </Text>
          </Box>
          <Text variant="small" tone="muted">
            Try navigating back, changing the id on the previous screen, and
            pushing again — the value here updates from the URL each time.
          </Text>
        </Box>
      </Card>
    </ScreenScaffold>
  );
}
