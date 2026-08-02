import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { ScreenScaffold } from '../components/screen-scaffold';
import { Box, Text, useTheme } from '../design-system';
import { Section, Code } from '../components';

/**
 * Responsive Layout screen — the RN-standard way to do responsiveness. Every
 * concept ships a LIVE demo, several of which respond to the window dimensions
 * live (resize the web window to see breakpoints/columns reflow).
 *
 * IMPORTANT RN-vs-web distinction: React Native does NOT use Bootstrap or
 * Tailwind's responsive prefixes. The standard is JS-driven: read the live
 * window size with useWindowDimensions / Dimensions and apply conditional
 * styles. There is no CSS media query in core RN.
 */
export function ResponsiveScreen() {
  return (
    <ScreenScaffold
      title="Responsive Layout"
      subtitle="useWindowDimensions + conditional styles (the RN way)"
    >
      <NoTailwindCard />
      <WindowDimensionsCard />
      <BreakpointColumnsCard />
      <OrientationCard />
      <KeyboardAvoidingCard />
      <SafeAreaAndScreensCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers (local)                                              */
/* ------------------------------------------------------------------ */

function breakpoint(width: number): 'sm' | 'md' | 'lg' {
  if (width < 480) return 'sm';
  if (width < 900) return 'md';
  return 'lg';
}

function columnsFor(width: number): number {
  const bp = breakpoint(width);
  if (bp === 'sm') return 1;
  if (bp === 'md') return 2;
  return 3;
}

/* ------------------------------------------------------------------ */
/* 1. No Tailwind/Bootstrap — the RN way                               */
/* ------------------------------------------------------------------ */

function NoTailwindCard() {
  return (
    <Section
      title="No Tailwind / Bootstrap — JS-driven responsiveness"
      explanation="The web commonly leans on Bootstrap's grid or Tailwind's sm:/lg: prefixes, powered by CSS media queries. React Native core has no CSS media queries and ships no built-in grid system (NativeWind is opt-in, not standard). The RN-standard way is to read the live viewport and switch styles in JS."
    >
      <Box gap="xs">
        <Code>{`const { width } = useWindowDimensions();
const cols = width < 480 ? 1 : width < 900 ? 2 : 3;`}</Code>
        <Text variant="caption" tone="muted">
          This is more flexible than CSS breakpoints (any JS expression, not
          just width) and works identically on iOS, Android, and web.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. useWindowDimensions (live)                                       */
/* ------------------------------------------------------------------ */

function WindowDimensionsCard() {
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const bp = breakpoint(width);
  return (
    <Section
      title="useWindowDimensions — live"
      explanation="The hook subscribes to window/viewport changes and re-renders on resize (and on device rotation). The values below update live — if you're on web, resize the browser window now."
    >
      <Box gap="xs">
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            flexWrap: 'wrap',
          }}
        >
          <Stat label="width" value={`${Math.round(width)} dp`} />
          <Stat label="height" value={`${Math.round(height)} dp`} />
          <Stat label="breakpoint" value={bp} />
          <Stat label="fontScale" value={useWindowDimensions().fontScale.toFixed(2)} />
        </View>
        <Text variant="caption" tone="muted">
          `Dimensions.get('window')` is the one-shot, non-reactive sibling; use
          `useWindowDimensions` in components so you re-render on change.
        </Text>
      </Box>
    </Section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: theme.radii.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      }}
    >
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="body" tone="primary" style={{ fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Breakpoint column demo (live)                                    */
/* ------------------------------------------------------------------ */

function BreakpointColumnsCard() {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const cols = columnsFor(width);
  const tiles = Array.from({ length: 9 }, (_, i) => i + 1);
  // Compute an explicit dp width per tile: window minus the two layers of
  // horizontal padding around this grid (ScrollView + Card) minus the inter-tile
  // gaps. RN width accepts numbers/percentages only (no CSS calc()), so we do
  // the arithmetic in JS — which is the RN-standard responsive technique.
  const outerPadding = theme.spacing.md * 2; // ScrollView horizontal
  const cardPadding = theme.spacing.md * 2; // Card horizontal
  const gap = theme.spacing.sm;
  const available = width - outerPadding - cardPadding;
  const tileWidth = Math.max(60, (available - gap * (cols - 1)) / cols);
  return (
    <Section
      title="Breakpoints — live column reflow"
      explanation="A real responsive grid built only from useWindowDimensions. At < 480 dp it's 1 column; 480–900 it's 2; 900+ it's 3. Resize the window (or rotate a tablet) and the tiles reflow into the new column count. RN width accepts a number or a %, not CSS calc() — so the per-tile width is computed in JS."
    >
      <Box gap="sm">
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            columns:
          </Text>
          <Text variant="body" tone="primary" style={{ fontWeight: '700' }}>
            {cols}
          </Text>
          <Text variant="small" tone="muted">
            (width {Math.round(width)} dp → breakpoint {breakpoint(width)})
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap,
          }}
        >
          {tiles.map((n) => (
            <View
              key={n}
              style={{
                width: tileWidth,
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radii.md,
                paddingVertical: theme.spacing.lg,
                alignItems: 'center',
              }}
            >
              <Text variant="h3" tone="onPrimary" style={{ fontWeight: '700' }}>
                {n}
              </Text>
            </View>
          ))}
        </View>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Orientation (live)                                               */
/* ------------------------------------------------------------------ */

function OrientationCard() {
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const orientation: 'portrait' | 'landscape' = width >= height ? 'landscape' : 'portrait';
  return (
    <Section
      title="Orientation — portrait / landscape"
      explanation="There's no special API: derive orientation from width vs height each render. Below, the toolbar's layout swaps direction (row in landscape, stacked in portrait) live as you rotate."
    >
      <Box gap="sm">
        <Text variant="small" tone="muted">
          orientation:{' '}
          <Text variant="small" tone="primary" style={{ fontWeight: '700' }}>
            {orientation}
          </Text>{' '}
          ({Math.round(width)} × {Math.round(height)})
        </Text>
        <View
          style={{
            flexDirection: orientation === 'landscape' ? 'row' : 'column',
            gap: theme.spacing.sm,
          }}
        >
          {['Back', 'Edit', 'Share'].map((t) => (
            <View
              key={t}
              style={{
                flex: orientation === 'landscape' ? 1 : 0,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.radii.md,
                paddingVertical: theme.spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text variant="small" tone="primary" style={{ fontWeight: '600' }}>
                {t}
              </Text>
            </View>
          ))}
        </View>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. KeyboardAvoidingView                                            */
/* ------------------------------------------------------------------ */

function KeyboardAvoidingCard() {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  return (
    <Section
      title="KeyboardAvoidingView — keyboard-aware layouts"
      explanation="On native, the on-screen keyboard covers the bottom of the screen. KeyboardAvoidingView shifts its content up when the keyboard opens (behavior differs by OS: 'padding' on iOS, usually 'height' or nothing on Android, which already resizes). Pair it with SafeAreaView for the inset."
    >
      <Box gap="xs">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Focus me on a phone…"
            placeholderTextColor={theme.colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              color: theme.colors.text,
              backgroundColor: theme.colors.background,
            }}
          />
        </KeyboardAvoidingView>
        <Text variant="caption" tone="muted">
          On web this is a no-op (no on-screen keyboard). On native, focusing the
          field will push this card above the keyboard.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. SafeArea + react-native-screens                                  */
/* ------------------------------------------------------------------ */

function SafeAreaAndScreensCard() {
  return (
    <Section
      title="SafeArea + react-native-screens"
      explanation="Two more pieces every responsive layout leans on: (1) SafeAreaProvider/useSafeAreaInsets (from react-native-safe-area-context) gives the per-edge insets past notches and home indicators — this app's ScreenScaffold uses it for the top inset. (2) react-native-screens powers native navigation; on the device the OS sizes the screen, so your JS breakpoints don't need to know about safe-area chrome."
    >
      <Box gap="xs">
        <Code>{`const insets = useSafeAreaInsets();
paddingBottom: insets.bottom + spacing`}</Code>
        <Text variant="caption" tone="muted">
          Multi-platform takeaway: the device sizes the window for you; for
          adaptiveness across phones, tablets, and web you drive everything from
          useWindowDimensions + conditional styles — there's no separate tablet
          layout API.
        </Text>
      </Box>
    </Section>
  );
}
