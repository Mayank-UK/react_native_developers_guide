import { Pressable } from 'react-native';
import { Box, Text, useTheme } from '../design-system';
import type { ToastEntry } from '../hooks/use-failure-toast';

/**
 * Toast — renders the non-blocking failure queue. Mirrors the web guide's
 * snackbar stack. Severity colour drives the affordance (warning = amber,
 * info = blue, danger-tagged text stays readable).
 */
export interface ToastStackProps {
  entries: ToastEntry[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ entries, onDismiss }: ToastStackProps) {
  const { theme } = useTheme();
  if (entries.length === 0) return null;
  return (
    <Box
      gap="sm"
      style={{
        position: 'absolute',
        left: theme.spacing.md,
        right: theme.spacing.md,
        bottom: theme.spacing.xl,
      }}
    >
      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          onPress={() => onDismiss(entry.id)}
          style={{
            backgroundColor:
              entry.failure.severity === 'warning'
                ? theme.colors.warning
                : theme.colors.info,
            borderRadius: theme.radii.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          }}
        >
          <Text
            variant="small"
            tone="onPrimary"
            style={{ flexShrink: 1 }}
          >
            {entry.failure.message}
          </Text>
        </Pressable>
      ))}
    </Box>
  );
}
