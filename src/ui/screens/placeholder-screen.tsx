import { useRouter } from 'expo-router';
import { ScreenScaffold } from '../../ui/components/screen-scaffold';
import { Box, Button, Card, Text } from '../../ui/design-system';

/**
 * PlaceholderScreen — shown for topic routes that are on the backlog but not
 * built yet. Every hub route resolves either to its dedicated screen or to this
 * placeholder via the `[...rest]` catch-all, so navigation is always valid.
 */
export interface PlaceholderScreenProps {
  title: string;
}

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  const router = useRouter();
  return (
    <ScreenScaffold title={title} subtitle="Coming soon">
      <Card>
        <Box gap="sm">
          <Text variant="body">
            This topic screen is part of the upcoming content build-out.
          </Text>
          <Text variant="small" tone="muted">
            The architecture, error pipeline, DI, design system, and the live
            API-handling demo are already in place — open the API Handling tile
            on the hub to see the full clean-architecture flow.
          </Text>
          <Box mt="sm">
            <Button title="Back to hub" onPress={() => router.replace('/')} />
          </Box>
        </Box>
      </Card>
    </ScreenScaffold>
  );
}
