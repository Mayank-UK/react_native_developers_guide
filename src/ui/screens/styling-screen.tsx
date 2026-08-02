import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ScreenScaffold } from '../components/screen-scaffold';
import { Box, Button, Card, Text, useTheme } from '../design-system';
import { Spacing, Radii, LightPalette, DarkPalette } from '../design-system/tokens';
import { Section, Code } from '../components';

/**
 * Styling screen — how RN components are styled, and how THIS app turns design
 * tokens into consistent styles. Each concept has a LIVE demo: a swatch grid
 * of the actual tokens, a theme toggle that re-colours the live surface, etc.
 *
 * RN-standard notes woven through the cards:
 *  - StyleSheet.create is the perf-conscious standard (referential identity).
 *  - Units are unitless "dp" — no px/rem/vw.
 *  - No CSS cascade, no pseudo-selectors, no whiteSpace shorthand — styles are
 *    plain JS objects merged by the bridge.
 */
export function StylingScreen() {
  return (
    <ScreenScaffold title="Styling" subtitle="Plain JS objects, tokens, and themes">
      <IntroCard />
      <StyleSheetCard />
      <InlineVsStyleSheetCard />
      <TokenScaleCard />
      <ThemeToggleCard />
      <PitfallsCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers (local, per convention)                              */
/* ------------------------------------------------------------------ */

function IntroCard() {
  return (
    <Section
      title="Styling in React Native"
      explanation="There is no CSS file and no className. A style is a plain object of camelCased properties (backgroundColor, fontSize, paddingHorizontal). Pass it via the `style` prop. The bridge turns those objects into native style records."
    >
      <Code>{`<View style={{ padding: 16, backgroundColor: '#fff' }} />`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. StyleSheet.create                                                */
/* ------------------------------------------------------------------ */

const created = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
});

function StyleSheetCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="StyleSheet.create — the standard"
      explanation="StyleSheet.create is the idiomatic, perf-conscious way to define styles. It converts the objects once (into native style records) and gives each a stable identity. Referential identity matters: `style={[a, b]}` merges arrays, and React's shallow-compare of style props relies on the same object reference to skip work."
    >
      <Box gap="xs">
        <View style={created.row}>
          <View style={[created.pill, { backgroundColor: theme.colors.primary }]}>
            <Text variant="caption" tone="onPrimary" style={{ fontWeight: '600' }}>
              defined once
            </Text>
          </View>
        </View>
        <Code>{`const styles = StyleSheet.create({
  pill: { paddingHorizontal: 12, borderRadius: 9999 },
});
<View style={styles.pill} />   // stable identity across renders`}</Code>
        <Text variant="caption" tone="muted">
          Compare: an inline `{`{{ padding: 12 }}`}` literal builds a NEW object
          every render — fine for one-offs, but for hot paths prefer StyleSheet.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Inline vs StyleSheet vs design-system merging                    */
/* ------------------------------------------------------------------ */

function InlineVsStyleSheetCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="Inline vs StyleSheet vs design-system"
      explanation="Three layers in this app: (1) inline objects for one-off tweaks; (2) StyleSheet.create for reusable per-screen styles; (3) design-system primitives (Box/Button/Text/Card) that bake token spacing/colour into props. The primitives merge an internal token style with your `style` prop, so you compose rather than hard-code."
    >
      <Box gap="xs">
        <Code>{`<Box p="md" bg="surface" radius="lg" style={{ borderWidth: 1 }}>
   // token prop  ↑              your one-off ↑`}</Code>
        <View
          style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="small">
            This card uses the same merge the Box primitive performs internally.
          </Text>
        </View>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Token scale (live swatches of THIS app's tokens)                 */
/* ------------------------------------------------------------------ */

const SPACING_KEYS = Object.keys(Spacing) as (keyof typeof Spacing)[];
const RADIUS_KEYS = Object.keys(Radii).filter((k) => k !== 'full') as (
  | 'none'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
)[];

function TokenScaleCard() {
  const { theme } = useTheme();
  const palette = theme.mode === 'dark' ? DarkPalette : LightPalette;
  const swatches: ReadonlyArray<readonly [string, string]> = [
    ['background', palette.background],
    ['surface', palette.surface],
    ['surfaceVariant', palette.surfaceVariant],
    ['border', palette.border],
    ['primary', palette.primary],
    ['text', palette.text],
    ['textMuted', palette.textMuted],
    ['success', palette.success],
    ['warning', palette.warning],
    ['danger', palette.danger],
    ['info', palette.info],
  ];
  return (
    <Section
      title="Design tokens — the live scale"
      explanation="These are the ACTUAL tokens from this app's design-system/tokens.ts, read at runtime via useTheme. Tap a swatch to copy its hex (visual only). Spacing and radii scales are visualised to scale below."
    >
      <Box gap="md">
        <Box gap="xs">
          <Text variant="small" tone="muted">
            Colour palette ({theme.mode}):
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
            {swatches.map(([name, hex]) => (
              <ColorSwatch key={name} name={name} hex={hex} />
            ))}
          </View>
        </Box>
        <Box gap="xs">
          <Text variant="small" tone="muted">
            Spacing scale (px, to scale):
          </Text>
          <View style={{ gap: theme.spacing.xs }}>
            {SPACING_KEYS.map((k) => (
              <View key={k} style={[created.row, { gap: theme.spacing.sm }]}>
                <Text variant="caption" tone="muted" style={{ width: 36 }}>
                  {k}
                </Text>
                <Text variant="caption" style={{ width: 28 }}>
                  {String(Spacing[k])}
                </Text>
                <View
                  style={{
                    height: 12,
                    width: Spacing[k] * 2,
                    backgroundColor: theme.colors.primary,
                  }}
                />
              </View>
            ))}
          </View>
        </Box>
        <Box gap="xs">
          <Text variant="small" tone="muted">
            Radii scale (visualised):
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {RADIUS_KEYS.map((k) => (
              <View
                key={k}
                style={{
                  width: 56,
                  height: 56,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: Radii[k],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="caption" tone="muted">
                  {k}
                </Text>
                <Text variant="caption">{String(Radii[k])}</Text>
              </View>
            ))}
          </View>
        </Box>
      </Box>
    </Section>
  );
}

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  return (
    <Pressable
      onPress={() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 800);
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={{ gap: theme.spacing.xxs }}>
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: theme.radii.md,
            backgroundColor: hex,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        />
        <Text variant="caption" style={{ fontWeight: '600' }}>
          {copied ? '✓' : name}
        </Text>
        <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace', fontSize: 10 }}>
          {hex}
        </Text>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Light/dark theme (live)                                          */
/* ------------------------------------------------------------------ */

function ThemeToggleCard() {
  const { theme, toggle, mode } = useTheme();
  return (
    <Section
      title="Light / dark theme (live)"
      explanation="The ThemeProvider holds the active ThemeMode (light/dark), persisted in AsyncStorage and falling back to useColorScheme(). Every primitive reads useTheme(), so flipping the mode re-colours the whole tree in one render. Toggle it and watch this surface swap."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            Active mode:
          </Text>
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            {mode}
          </Text>
          <Button title="Toggle theme" variant="outline" onPress={toggle} />
        </Box>
        <View
          style={{
            backgroundColor: theme.colors.primary,
            padding: theme.spacing.md,
            borderRadius: theme.radii.md,
          }}
        >
          <Text variant="body" tone="onPrimary">
            primary @ {theme.colors.primary}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            padding: theme.spacing.md,
            borderRadius: theme.radii.md,
          }}
        >
          <Text variant="small">
            surfaceVariant @ {theme.colors.surfaceVariant}
          </Text>
          <Text variant="caption" tone="muted">
            text @ {theme.colors.text}
          </Text>
        </View>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Pitfalls                                                         */
/* ------------------------------------------------------------------ */

const PITFALLS: ReadonlyArray<readonly [string, string]> = [
  [
    'No CSS cascade',
    'Styles do not inherit or cascade like CSS. A parent text colour does not flow to a child View; only <Text> nested inside <Text> inherits text styles.',
  ],
  [
    'Units are unitless dp',
    'No px/rem/em/vw. Every number is a device-independent pixel (dp). Fonts size in dp too.',
  ],
  [
    'No pseudo-classes',
    'There is no :hover/:focus/:active selector. Use Pressable\'s `pressed` render-prop and event handlers instead (see the Interactive screen).',
  ],
  [
    'No whiteSpace / textOverflow',
    'Use `numberOfLines` + `ellipsizeMode` to truncate, not CSS white-space/overflow.',
  ],
  [
    'Colours are strings',
    'No colour functions like rgba() blending helpers in styles — pass hex or rgba() strings the bridge parses.',
  ],
];

function PitfallsCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="Pitfalls coming from CSS"
      explanation="The web-to-RN style mismatches that bite most often. None are deep — just things that quietly don't exist."
    >
      <Box gap="xs">
        {PITFALLS.map(([head, body]) => (
          <View
            key={head}
            style={{
              padding: theme.spacing.sm,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.radii.sm,
            }}
          >
            <Text variant="small" tone="primary" style={{ fontWeight: '600' }}>
              {head}
            </Text>
            <Text variant="caption" tone="muted">
              {body}
            </Text>
          </View>
        ))}
      </Box>
    </Section>
  );
}
