import { type ReactNode } from 'react';
import { Box, Text, useTheme } from '../design-system';

/**
 * Pill — a compact rounded chip. Supports two shapes used across the app:
 *  - `<Pill tone="primary">mounted</Pill>`            → a single label/value
 *  - `<Pill label="typeof" value="number" />`          → a labelled value pair
 *
 * Replaces the per-screen `Pill` helper duplicated across 12 screens.
 */
export type PillTone = 'default' | 'muted' | 'primary' | 'danger' | 'success';

export interface PillProps {
  /** Optional label rendered before the value (muted). */
  label?: string;
  /** The main value text (used with `label`, or alone if no children). */
  value?: string;
  children?: ReactNode;
  tone?: PillTone;
}

export function Pill({ label, value, children, tone = 'muted' }: PillProps) {
  const { theme } = useTheme();
  const bg =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'danger'
        ? theme.colors.danger
        : tone === 'success'
          ? theme.colors.success
          : theme.colors.surfaceVariant;
  const fg = tone === 'muted' || tone === 'default' ? theme.colors.text : theme.colors.onPrimary;

  return (
    <Box
      row
      center
      gap="xs"
      px="sm"
      py="xxs"
      radius="full"
      style={{
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: tone === 'default' || tone === 'muted' ? theme.colors.border : 'transparent',
      }}
    >
      {label ? (
        <Text variant="caption" tone={tone === 'muted' || tone === 'default' ? 'muted' : 'onPrimary'}>
          {label}
        </Text>
      ) : null}
      {value ? (
        <Text variant="caption" style={{ fontWeight: '600', color: fg }}>
          {value}
        </Text>
      ) : null}
      {children ? (
        <Text variant="caption" style={{ fontWeight: '600', color: fg }}>
          {children}
        </Text>
      ) : null}
    </Box>
  );
}
