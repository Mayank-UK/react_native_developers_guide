import { ScreenScaffold } from '../src/ui/components/screen-scaffold';
import { Box, Card, Text } from '../src/ui/design-system';

/**
 * About — project overview + architecture summary. Linked from the hub and the
 * future drawer.
 */
export default function AboutScreen() {
  return (
    <ScreenScaffold title="About" subtitle="React Native Developer's Guide">
      <Card>
        <Box gap="sm">
          <Text variant="body">
            A teaching app whose own codebase demonstrates how a React Native
            app can be structured: domain → data → ui with a hand-rolled service
            locator, a two-stage error pipeline, and a token-driven design
            system.
          </Text>
          <Text variant="small" tone="muted">
            Built with Expo + Expo Router + TypeScript. See ARCHITECTURE.md for
            the full rationale and the RN-vs-web-reference decision log.
          </Text>
        </Box>
      </Card>
    </ScreenScaffold>
  );
}
