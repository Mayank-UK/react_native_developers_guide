import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Box, Text } from '.';
import { useTheme } from '../design-system';

/**
 * Code — a collapsible code block. Ports the sibling web guide's `CodeBlock`:
 * collapsed by default (tap the language label to expand), a copy button that
 * works whether open or not, and a horizontally-scrollable body that renders the
 * raw string verbatim so indentation and arrows survive.
 *
 * Replaces the per-screen `Code` helper duplicated across 18 screens. The code
 * is passed as `children` (a template literal) to match the established call
 * convention.
 *
 * `tone` tints ONLY the expanded body text (default uses the mono colour). It
 * is intentionally kept narrow ('primary' | 'default') because the only view
 * that meaningfully uses it is the React-fundamentals alphabet screen, which
 * highlights inline RN tokens in the primary hue. Keep it limited to that
 * affordance — don't grow it into a general palette mapper (use <Text tone>
 * for that).
 */
export interface CodeProps {
  children: string;
  /** Language label shown on the toggle (also the copy affordance row). */
  language?: string;
  /** Optional footer note shown under the code when expanded. */
  caption?: string;
  /** Start expanded instead of collapsed. */
  defaultOpen?: boolean;
  /** Tints the expanded body text only ('primary' highlights inline tokens). */
  tone?: 'primary' | 'default';
}

export function Code({
  children,
  language = 'code',
  caption,
  defaultOpen = false,
  tone = 'default',
}: CodeProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    await Clipboard.setStringAsync(children);
    setCopied(true);
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.sm,
        backgroundColor: theme.colors.surfaceVariant,
        overflow: 'hidden',
      }}
    >
      <Box row gap="sm" center style={{ justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs }}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${language} code`}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Box row gap="xs" center>
            <Text variant="caption" tone="muted" style={{ width: 10 }}>
              {open ? '▾' : '▸'}
            </Text>
            <Text variant="caption" tone="muted">
              {language}
            </Text>
          </Box>
        </Pressable>
        <Pressable
          onPress={copy}
          accessibilityRole="button"
          accessibilityLabel="Copy code"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text variant="caption" tone={copied ? 'primary' : 'muted'}>
            {copied ? '✓ copied' : 'copy'}
          </Text>
        </Pressable>
      </Box>
      {open ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
            }}
          >
            <Text variant="mono" tone={tone}>
              {children}
            </Text>
          </ScrollView>
          {caption ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
              }}
            >
              <Text variant="caption" tone="muted">
                {caption}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
