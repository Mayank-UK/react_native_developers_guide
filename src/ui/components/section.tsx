import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Box, Card, Text } from '.';
import { useTheme } from '../design-system';

/**
 * Section — a titled content block, the structural unit every topic screen is
 * built from. Ports the sibling web guide's `SectionWrapper`: a surface card
 * whose heading carries a short coloured accent bar on the left (a 24×4 pill in
 * the primary colour) so the hierarchy reads at a glance.
 *
 * Replaces the per-screen `Section` helper that was duplicated across 18 screens.
 */
export interface SectionProps {
  title: string;
  /** One-line muted explainer rendered under the title. */
  explanation?: string;
  children: ReactNode;
}

export function Section({ title, explanation, children }: SectionProps) {
  const { theme } = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.md }}>
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center' }}>
          {/* Left accent bar — the visual cue that this is a section heading. */}
          <View
            style={{
              height: theme.spacing.lg,
              width: theme.spacing.xs,
              borderRadius: theme.radii.full,
              backgroundColor: theme.colors.primary,
            }}
          />
          <Text variant="h2">{title}</Text>
        </Box>
        {explanation ? (
          <Text variant="small" tone="muted">
            {explanation}
          </Text>
        ) : null}
        {children}
      </Box>
    </Card>
  );
}
