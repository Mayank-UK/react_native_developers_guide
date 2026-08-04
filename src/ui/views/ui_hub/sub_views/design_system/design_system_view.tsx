import { Pressable, View } from 'react-native';
import { ScreenScaffold } from '../../../../components/screen-scaffold';
import { Box, Button, Card, Text, useTheme } from '../../../../design-system';
import {
  Spacing,
  Radii,
  LightPalette,
  DarkPalette,
  typography,
} from '../../../../design-system/tokens';
import { Section, Code } from '../../../../components';
import { paletteSwatches, modeWord, usePressedState } from './design_system_hooks';

/**
 * DesignSystemView — a dumb structure. The only non-presentational state (the
 * Button-anatomy pressed flag) and the pure swatch/mode helpers live in the
 * co-located hooks (design_system_hooks.ts); this file only renders.
 *
 * Design System screen — a tour of THIS app's own design system. The tokens,
 * the theme, the primitives, and the single-source-of-truth principle that
 * ties them together. Every concept has a live visualization (swatches, scale
 * bars, a Button anatomy, a theme toggle).
 *
 * The pipeline, referenced throughout:
 *   tokens.ts  →  theme.ts / theme-provider.tsx  →  primitives  →  screens
 *   (data)        (context: useTheme)               (Text/Box/…)    (consumers)
 *
 * `useTheme` (design-system context, no state) is kept in the view per the
 * exemplar's presentational exception. No `any`; strict + erasure-clean.
 */
export function DesignSystemView() {
  return (
    <ScreenScaffold
      title="Design System"
      subtitle="tokens → theme → primitives → screens"
    >
      <PipelineCard />
      <TokensCard />
      <ThemeCard />
      <PrimitivesCard />
      <ButtonAnatomyCard />
      <PrincipleCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers (local)                                              */
/* ------------------------------------------------------------------ */

const SPACING_KEYS = Object.keys(Spacing) as (keyof typeof Spacing)[];
const RADIUS_KEYS = Object.keys(Radii).filter((k) => k !== 'full') as (
  | 'none'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
)[];
const TYPE_KEYS = ['h1', 'h2', 'h3', 'body', 'small', 'caption', 'overline', 'mono'] as const;

/* ------------------------------------------------------------------ */
/* 1. The pipeline                                                     */
/* ------------------------------------------------------------------ */

function PipelineCard() {
  return (
    <Section
      title="The pipeline"
      explanation="Four layers, each consuming the one below. Read top-to-bottom: tokens are pure data; the theme wraps them with the active palette and is published through React context; primitives call useTheme() so they always render in the current palette; screens use only primitives, never raw tokens."
    >
      <Code>{`tokens.ts           Theme = { colors, spacing, radii, typography }
   ↓
theme.ts            useTheme() → { theme, mode, toggle }
theme-provider.tsx  <ThemeProvider>  (AsyncStorage + useColorScheme)
   ↓
components/         Text · Box · Button · Card   (read useTheme)
   ↓
screens/            consume primitives only`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Tokens (live scales)                                             */
/* ------------------------------------------------------------------ */

function TokensCard() {
  const { theme } = useTheme();
  const palette = theme.mode === 'dark' ? DarkPalette : LightPalette;
  const swatches = paletteSwatches(palette);
  return (
    <Section
      title="Token scales — the single source of truth"
      explanation="Everything visual in this app is defined once here in tokens.ts and referenced everywhere else. Change a token once and the whole app follows. Below: the live colour palette, the spacing scale (visualized to scale), the radius scale, and the typography scale."
    >
      <Box gap="md">
        <Box gap="xs">
          <Text variant="small" tone="muted">
            Colours ({theme.mode}):
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {swatches.map(([name, hex]) => (
              <View key={name} style={{ gap: theme.spacing.xxs }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: theme.radii.md,
                    backgroundColor: hex,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                />
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  {name}
                </Text>
                <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace', fontSize: 10 }}>
                  {hex}
                </Text>
              </View>
            ))}
          </View>
        </Box>

        <Box gap="xs">
          <Text variant="small" tone="muted">
            Spacing scale:
          </Text>
          <View style={{ gap: theme.spacing.xs }}>
            {SPACING_KEYS.map((k) => (
              <View key={k} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
                <Text variant="caption" tone="muted" style={{ width: 36 }}>
                  {k}
                </Text>
                <Text variant="caption" style={{ width: 28 }}>
                  {String(Spacing[k])}
                </Text>
                <View style={{ height: 12, width: Spacing[k] * 2, backgroundColor: theme.colors.primary }} />
              </View>
            ))}
          </View>
        </Box>

        <Box gap="xs">
          <Text variant="small" tone="muted">
            Radii scale:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {RADIUS_KEYS.map((k) => (
              <View
                key={k}
                style={{
                  width: 52,
                  height: 52,
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

        <Box gap="xs">
          <Text variant="small" tone="muted">
            Typography scale (Inter · Montserrat · JetBrains Mono):
          </Text>
          <View style={{ gap: theme.spacing.xs }}>
            {TYPE_KEYS.map((k) => {
              const v = typography[k];
              return (
                <View key={k}>
                  <Text variant={k}>{k} — {v.fontSize}dp / lh {v.lineHeight}</Text>
                  <Text variant="caption" tone="muted">
                    {v.fontFamily} · {v.fontWeight}
                    {v.letterSpacing !== undefined ? ` · tracking ${v.letterSpacing}` : ''}
                    {v.uppercase ? ' · UPPERCASE' : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Theme (live toggle)                                              */
/* ------------------------------------------------------------------ */

function ThemeCard() {
  const { theme, mode, toggle } = useTheme();
  return (
    <Section
      title="ThemeProvider — light / dark (live)"
      explanation="The provider holds the active ThemeMode, persisted to AsyncStorage and seeded from useColorScheme(). Every primitive calls useTheme(), so toggling re-colours the entire tree synchronously — no CSS variables to swap, just a new theme object through context."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            mode:
          </Text>
          <Text variant="body" tone="primary" style={{ fontWeight: '700' }}>
            {mode}
          </Text>
          <Button title="Toggle theme" variant="outline" onPress={toggle} />
        </Box>
        <View style={{ backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.radii.md }}>
          <Text variant="body" tone="onPrimary">
            primary @ {theme.colors.primary}
          </Text>
        </View>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Primitives                                                       */
/* ------------------------------------------------------------------ */

function PrimitivesCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="Primitives — Text · Box · Button · Card"
      explanation="Four small components are the entire vocabulary screens use. Each consumes tokens via useTheme and exposes token props (Box's p/gap/radius, Text's variant/tone, Button's variant). Screens never hard-code a colour or a spacing number."
    >
      <Box gap="md">
        <Box gap="xs">
          <Text variant="caption" tone="muted">
            Text variants:
          </Text>
          <Text variant="h3">h3 heading</Text>
          <Text variant="body">body — the default prose size.</Text>
          <Text variant="small" tone="muted">
            small muted caption
          </Text>
          <Text variant="caption" tone="primary">
            caption primary
          </Text>
        </Box>
        <Box gap="xs">
          <Text variant="caption" tone="muted">
            Box (token props) + Card:
          </Text>
          <Box row gap="sm" p="md" bg="surfaceVariant" radius="md">
            <Box p="sm" bg="primary" radius="sm" style={{ width: 24, height: 24 }} />
            <Text variant="small">Box p=&quot;md&quot; gap=&quot;sm&quot; radius=&quot;md&quot;</Text>
          </Box>
          <Card>
            <Text variant="small">A Card — surface + border + radius, always.</Text>
          </Card>
        </Box>
        <Box gap="xs">
          <Text variant="caption" tone="muted">
            Button variants (all from tokens):
          </Text>
          <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
            <Button title="filled" variant="filled" onPress={() => {}} />
            <Button title="outline" variant="outline" onPress={() => {}} />
            <Button title="ghost" variant="ghost" onPress={() => {}} />
            <Button title="disabled" variant="filled" disabled onPress={() => {}} />
          </Box>
        </Box>
        <Text variant="caption" tone="muted">
          Notice the whole card follows the {modeWord(theme.mode)} palette without
          any screen-level colour — that's the point.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Button anatomy — how a primitive consumes tokens                 */
/* ------------------------------------------------------------------ */

function ButtonAnatomyCard() {
  const { theme } = useTheme();
  const { pressed, onPressIn, onPressOut } = usePressedState();
  return (
    <Section
      title="Anatomy: how a Button consumes tokens"
      explanation="A live dissection of the app's Button. It reads useTheme() for the palette + radii + spacing; a Pressable render-prop drives the pressed state; the variant picks which token colours apply. No hard-coded hex anywhere — change a token and every button updates."
    >
      <Box gap="sm" style={{ alignItems: 'stretch' }}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={{
            backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary,
            opacity: 1,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radii.md,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="small" tone="onPrimary" style={{ fontWeight: '600' }}>
            {pressed ? 'primaryPressed (held)' : 'primary (rest)'}
          </Text>
        </Pressable>
        <Code>{`function Button({ title, variant }) {
  const { theme } = useTheme();
  return (
    <Pressable style={({ pressed }) => [
      { paddingHorizontal: theme.spacing.lg,   // ← spacing token
        borderRadius: theme.radii.md,          // ← radius token
        backgroundColor: theme.colors.primary, // ← colour token
        opacity: pressed ? 0.7 : 1 },
    ]}>
      <Text tone="onPrimary">{title}</Text>
    </Pressable>
  );
}`}</Code>
        <Text variant="caption" tone="muted">
          Hold the button: it swaps `colors.primary` for `colors.primaryPressed`
          — both come from tokens, so the interaction is themable for free.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. The principle                                                    */
/* ------------------------------------------------------------------ */

function PrincipleCard() {
  return (
    <Section
      title="The principle: single source of truth"
      explanation="This is the design-system expression of the project-wide principle in agentic_development.md: tokens are the one place colour/spacing/radii/typography live; primitives enforce consistency by consuming them; screens hard-code nothing. The win is that a re-skin, a dark mode, or a spacing tweak is a one-line token change — never a find-and-replace across screens."
    >
      <Box gap="xs">
        <Code>{`// DO   ✅   <Box p="md" bg="surface">  <Text tone="primary">
// DON'T ❌   <View style={{ padding: 16, backgroundColor: '#fff' }}>`}</Code>
        <Text variant="caption" tone="muted">
          If you ever type a hex or a raw spacing number in a screen, treat it as
          a smell: there should be a token (or a new primitive) for that.
        </Text>
      </Box>
    </Section>
  );
}
