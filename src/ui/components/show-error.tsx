import { Button, Card, Text } from '.';
import { useTheme } from '../design-system';

/**
 * ShowError — full-screen blocking error. Shown when a Failure is *critical*
 * (the screen has no data to render). Mirrors the sibling guides' `ShowError`.
 * Non-blocking failures go through the toast instead.
 */
export interface ShowErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ShowError({ message, onRetry }: ShowErrorProps) {
  useTheme(); // ensure theme context is available (purely for Fast Refresh guard)
  return (
    <Card style={{ alignItems: 'center', gap: 12 }}>
      <Text variant="h3" tone="danger">
        Something went wrong
      </Text>
      <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      {onRetry ? <Button title="Retry" onPress={onRetry} /> : null}
    </Card>
  );
}
