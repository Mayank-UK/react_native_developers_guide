import { type ReactNode } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { ScreenScaffold } from '../../../../components/screen-scaffold';
import { Box, Text } from '../../../../components';
import { useTheme } from '../../../../design-system';
import { Section, Code } from '../../../../components';
import {
  DIRECTIONS,
  JUSTIFY,
  ALIGN,
  GAPS,
  useFlexDirection,
  useJustifyAlign,
  useFlexGrowToggle,
  useGapPicker,
  useStackToggle,
} from './layout_hooks';

/** One-off illustration dimensions for the LIVE flexbox demos. */
const FLEX_PLAYGROUND_HEIGHT = 180;
const FLEX_GROW_TRACK_HEIGHT = 60;
const POSITION_PLAYGROUND_HEIGHT = 110;

/**
 * LayoutView — a dumb structure. All picker state lives in the co-located hooks
 * (layout_hooks.ts); this file only renders.
 *
 * Layout & Structure — RN layout fundamentals. Every concept ships a LIVE,
 * interactive demo: the user toggles/picks and watches the boxes reflow.
 *
 * RN-standard note: flexbox is THE layout system in React Native — there is no
 * CSS grid, no float, no inline-block. Everything below is flexbox + absolute
 * positioning, which is the RN-native way.
 *
 * `useTheme` (design-system context, no state) is kept in the view per the
 * exemplar's presentational exception. Single-file helpers (Chip, ChipRow,
 * DemoBox, demo sub-components) stay local per convention. No `any`; strict +
 * erasure-clean.
 */
export function LayoutView() {
  return (
    <ScreenScaffold
      title="Layout & Structure"
    >
      <FlexboxIsTheSystemCard />
      <FlexDirectionCard />
      <JustifyAlignCard />
      <FlexGrowShrinkCard />
      <GapCard />
      <PositionZIndexCard />
      <SafeAreaCard />
      <ScrollVsFlatListCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
      <View
        style={{
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radii.full,
          borderWidth: 1,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.primary : 'transparent',
        }}
      >
        <Text
          variant="caption"
          tone={selected ? 'onPrimary' : 'muted'}
          style={{ fontWeight: '600' }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
      {children}
    </Box>
  );
}

/** A labelled demo box used to visualise flex children. */
function DemoBox({
  label,
  color,
  size,
}: {
  label: string;
  color: string;
  size?: number;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: size ?? 56,
        height: size ?? 56,
        backgroundColor: color,
        borderRadius: theme.radii.sm,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="caption" tone="onPrimary" style={{ fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Flexbox is the system                                             */
/* ------------------------------------------------------------------ */

function FlexboxIsTheSystemCard() {
  return (
    <Section
      title="Flexbox is THE layout system"
      explanation="React Native has no CSS grid, no float, no display:block/inline. Every View is a flex container (default flexDirection: 'column'), so learning flexbox is learning RN layout. The web maps grid + flow + flexbox onto CSS; RN collapses all of that to flexbox + absolute positioning only."
    >
      <Box gap="xs">
        <Code>{`<View>  {/* default: flexDirection 'column', flex */}</View>`}</Code>
        <Text variant="caption" tone="muted">
          Two axes: the main axis (set by flexDirection) and the cross axis
          (perpendicular). justify arranges along the main axis; align arranges
          along the cross axis. Everything below explores those two knobs.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. flexDirection                                                    */
/* ------------------------------------------------------------------ */

function FlexDirectionCard() {
  const { theme } = useTheme();
  const { dir, setDir } = useFlexDirection();
  return (
    <Section
      title="flexDirection — the main axis"
      explanation="`row` lays children left-to-right; `column` (the default in RN, opposite of web's default) top-to-bottom. Reverse variants flip the order. Toggle live and watch the three boxes reflow."
    >
      <Box gap="sm">
        <ChipRow>
          {DIRECTIONS.map((d) => (
            <Chip key={d} label={d} selected={dir === d} onPress={() => setDir(d)} />
          ))}
        </ChipRow>
        <View
          style={{
            flexDirection: dir,
            gap: theme.spacing.sm,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.radii.md,
          }}
        >
          <DemoBox label="A" color={theme.colors.primary} />
          <DemoBox label="B" color={theme.colors.success} />
          <DemoBox label="C" color={theme.colors.warning} />
        </View>
        <Text variant="caption" tone="muted">
          Note: web CSS defaults to `row`; RN defaults to `column`. Forgetting
          this is the #1 RN layout surprise.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. justifyContent + alignItems                                      */
/* ------------------------------------------------------------------ */

function JustifyAlignCard() {
  const { theme } = useTheme();
  const { justify, setJustify, align, setAlign } = useJustifyAlign();
  return (
    <Section
      title="justifyContent & alignItems"
      explanation="justifyContent arranges children along the MAIN axis; alignItems arranges them along the CROSS axis. Pick any combination and watch the cluster move. (Reminder: with the default flexDirection 'column', main = vertical, cross = horizontal.)"
    >
      <Box gap="sm">
        <Text variant="small" tone="muted">
          justifyContent (main axis):
        </Text>
        <ChipRow>
          {JUSTIFY.map((j) => (
            <Chip key={j} label={j} selected={justify === j} onPress={() => setJustify(j)} />
          ))}
        </ChipRow>
        <Text variant="small" tone="muted">
          alignItems (cross axis):
        </Text>
        <ChipRow>
          {ALIGN.map((a) => (
            <Chip key={a} label={a} selected={align === a} onPress={() => setAlign(a)} />
          ))}
        </ChipRow>
        <View
          style={{
            height: FLEX_PLAYGROUND_HEIGHT,
            flexDirection: 'column',
            justifyContent: justify,
            alignItems: align,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.radii.md,
          }}
        >
          <DemoBox label="1" color={theme.colors.primary} size={44} />
          <DemoBox label="2" color={theme.colors.success} size={44} />
        </View>
        <Text variant="caption" tone="muted">
          `alignItems: 'stretch'` resizes children to fill the cross axis (the
          boxes here keep a fixed height, so you see it most when their
          cross-size is unset).
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. flex / flexGrow / flexShrink / flexBasis                         */
/* ------------------------------------------------------------------ */

function FlexGrowShrinkCard() {
  const { theme } = useTheme();
  const { growMiddle, toggle } = useFlexGrowToggle();
  return (
    <Section
      title="flex, flexGrow, flexShrink, flexBasis"
      explanation="`flex: 1` makes a child fill available space along the main axis (shorthand for flexGrow:1 / flexShrink:1 / flexBasis:0). flexGrow divides leftover space proportionally; flexShrink decides who shrinks when space is tight; flexBasis is the starting size. Toggle the middle box's flexGrow and watch it absorb free space."
    >
      <Box gap="sm">
        <ChipRow>
          <Chip
            label={growMiddle ? "middle flexGrow: 1" : "middle flexGrow: 0"}
            selected={growMiddle}
            onPress={toggle}
          />
        </ChipRow>
        <View
          style={{
            flexDirection: 'row',
            height: FLEX_GROW_TRACK_HEIGHT,
            gap: theme.spacing.xs,
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.radii.md,
          }}
        >
          <View style={{ flex: 1, backgroundColor: theme.colors.primary, borderRadius: 4 }} />
          <View
            style={{
              flexGrow: growMiddle ? 1 : 0,
              width: growMiddle ? undefined : 60,
              backgroundColor: theme.colors.success,
              borderRadius: 4,
            }}
          />
          <View style={{ flex: 1, backgroundColor: theme.colors.warning, borderRadius: 4 }} />
        </View>
        <Code>{`<View style={{ flex: 1 }} />           // fill
<View style={{ flexGrow: 1 }} />      // absorb extra
<View style={{ flexShrink: 1 }} />    // shrink when tight
<View style={{ flexBasis: 80 }} />    // starting size`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. gap                                                              */
/* ------------------------------------------------------------------ */

function GapCard() {
  const { theme } = useTheme();
  const { gap, setGap } = useGapPicker();
  return (
    <Section
      title="gap — spacing between children"
      explanation="React Native supports `gap`/`rowGap`/`columnGap` (since 0.71) — the clean way to space flex children without margin tricks. Pick a token from this app's spacing scale and watch the gaps update."
    >
      <Box gap="sm">
        <ChipRow>
          {GAPS.map((g) => (
            <Chip key={g} label={`gap: ${g}`} selected={gap === g} onPress={() => setGap(g)} />
          ))}
        </ChipRow>
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing[gap],
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.radii.md,
          }}
        >
          <DemoBox label="1" color={theme.colors.primary} size={40} />
          <DemoBox label="2" color={theme.colors.primary} size={40} />
          <DemoBox label="3" color={theme.colors.primary} size={40} />
          <DemoBox label="4" color={theme.colors.primary} size={40} />
        </View>
        <Text variant="caption" tone="muted">
          {`The app's Box primitive exposes \`gap\` as a token key (<Box row gap="md">) so spacing stays on the design-system scale.`}
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. position: absolute/relative + zIndex                             */
/* ------------------------------------------------------------------ */

function PositionZIndexCard() {
  const { theme } = useTheme();
  const { stack, toggle } = useStackToggle();
  return (
    <Section
      title="position: absolute/relative + zIndex"
      explanation="`position: 'relative'` (the RN default) keeps a box in flow; `position: 'absolute'` takes it out and pins it relative to its nearest positioned ancestor. zIndex stacks siblings — higher paints on top. Use these for badges, overlays, FABs."
    >
      <Box gap="sm">
        <ChipRow>
          <Chip
            label={stack ? 'absolute badge (zIndex 10)' : 'relative (in flow)'}
            selected={stack}
            onPress={toggle}
          />
        </ChipRow>
        <View style={{ padding: theme.spacing.md }}>
          <View
            style={{
              position: 'relative',
              height: POSITION_PLAYGROUND_HEIGHT,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.radii.md,
              padding: theme.spacing.md,
              overflow: 'hidden',
            }}
          >
            <Text variant="body">Card content underneath.</Text>
            <View
              style={{
                position: stack ? 'absolute' : 'relative',
                top: stack ? 8 : undefined,
                right: stack ? 8 : undefined,
                zIndex: 10,
                alignSelf: stack ? undefined : 'flex-end',
                backgroundColor: theme.colors.danger,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xxs,
                borderRadius: theme.radii.full,
              }}
            >
              <Text variant="caption" tone="onPrimary" style={{ fontWeight: '700' }}>
                BADGE
              </Text>
            </View>
          </View>
        </View>
        <Text variant="caption" tone="muted">
          When absolute, the badge is pinned to the top-right corner of the
          relative parent regardless of the content beside it.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. SafeArea / insets                                                */
/* ------------------------------------------------------------------ */

function SafeAreaCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="SafeAreaView & insets"
      explanation="Modern phones have notches, home indicators, and status bars. React Native's SafeAreaView (or, more flexibly, `react-native-safe-area-context`'s `useSafeAreaInsets`) lets you pad content past those OS chrome elements. This app uses useSafeAreaInsets inside ScreenScaffold — every screen's title sits below the status bar automatically."
    >
      <Box gap="xs">
        <Code>{`const insets = useSafeAreaInsets();
paddingTop: insets.top + theme.spacing.sm`}</Code>
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.radii.md,
            padding: theme.spacing.md,
          }}
        >
          <Text variant="small">
            This screen's top inset (status-bar avoidance) is already applied by
            ScreenScaffold — the title above isn't under the clock.
          </Text>
        </View>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. ScrollView vs FlatList                                          */
/* ------------------------------------------------------------------ */

const FLAT_DATA = Array.from({ length: 6 }, (_, i) => ({
  id: String(i),
  label: `Row #${i + 1}`,
}));

function ScrollVsFlatListCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="ScrollView vs FlatList"
      explanation="ScrollView renders ALL children up front — fine for small, fixed lists. FlatList virtualizes: it only renders the rows currently on screen (plus a window), recycling views as you scroll — essential for long lists. Rule of thumb: reach for FlatList once a list could exceed ~20 items."
    >
      <Box gap="sm">
        <Text variant="small" tone="muted">
          A FlatList rendering 6 rows (set `scrollEnabled={false}` here so it
          doesn't fight the screen's own scroll):
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
            overflow: 'hidden',
          }}
        >
          <FlatList
            data={FLAT_DATA}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View
                style={{
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  backgroundColor: index % 2 === 0 ? theme.colors.surface : theme.colors.surfaceVariant,
                }}
              >
                <Text variant="small">{item.label}</Text>
              </View>
            )}
          />
        </View>
        <Code>{`<FlatList
  data={items}
  keyExtractor={(i) => i.id}
  renderItem={({ item }) => <Row {...item} />}
/>`}</Code>
      </Box>
    </Section>
  );
}
