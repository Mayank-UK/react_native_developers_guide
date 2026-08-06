import { ScreenScaffold, Section, Code } from '../../../../components';
import { Box, Button, Text } from '../../../../components';
import { HAPTIC_OPTIONS, useHapticsDemo, type HapticKind } from './haptics_hooks';

/**
 * HapticsView — a dumb structure. All native calls + state live in the
 * co-located hooks file; this file only renders.
 *
 * expo-haptics demo — three primitives (impact / notification / selection) the
 * user can fire live. On a physical device each is felt; on an emulator they
 * are silent no-ops (the underlying hardware is absent).
 */
export function HapticsView() {
  return (
    <ScreenScaffold
      title="Haptics"
    >
      <PrimitivesCard />
      <LiveDemoCard />
      <WhenToUseCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */

function PrimitivesCard() {
  return (
    <Section
      title="The three primitives"
      explanation="expo-haptics exposes exactly three call shapes that cover every standard RN haptic: a weighted physical impact, a semantic notification pattern, and a tiny selection tick for discrete changes."
    >
      <Code language="ts" caption="the entire expo-haptics surface">{`import * as Haptics from 'expo-haptics';

// 1. A physical collision, weighted by style.
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);   // .Medium / .Heavy / .Soft / .Rigid

// 2. A semantic notification (success / warning / error pattern).
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// 3. A tiny tick for discrete selection changes (pickers, toggles).
await Haptics.selectionAsync();`}</Code>
    </Section>
  );
}

function LiveDemoCard() {
  const { trigger, last } = useHapticsDemo();
  return (
    <Section
      title="Haptics — LIVE"
      explanation="Fire each kind. On a physical device you will feel each one; on an emulator they are silent no-ops (the underlying hardware is absent)."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {(Object.keys(HAPTIC_OPTIONS) as readonly HapticKind[]).map((kind) => (
            <Button
              key={kind}
              title={HAPTIC_OPTIONS[kind]}
              variant="outline"
              onPress={() => trigger(kind)}
            />
          ))}
        </Box>
        <Text variant="small" tone="muted">
          Last fired:{' '}
          <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
            {last ?? '—'}
          </Text>
        </Text>
        <Code language="ts" caption="haptics_hooks.ts — the real hook">{`export const HAPTIC_OPTIONS = {
  impactLight: 'Impact · Light',
  impactMedium: 'Impact · Medium',
  impactHeavy: 'Impact · Heavy',
  notificationSuccess: 'Notification · Success',
  notificationWarning: 'Notification · Warning',
  notificationError: 'Notification · Error',
  selection: 'Selection',
} as const;

export function useHapticsDemo() {
  const [last, setLast] = useState<string | null>(null);
  const trigger = useCallback((kind: HapticKind) => {
    void (async () => {
      switch (kind) {
        case 'impactLight':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
        case 'notificationSuccess':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
        case 'selection':
          await Haptics.selectionAsync(); break;
        // … Medium / Heavy / Warning / Error
      }
      setLast(HAPTIC_OPTIONS[kind]);
    })();
  }, []);
  return { trigger, last };
}`}</Code>
      </Box>
    </Section>
  );
}

function WhenToUseCard() {
  return (
    <Section
      title="When to use which"
      explanation="Haptics are feedback, not decoration. Tie them to genuine state transitions the user can't already see — otherwise they become noise."
    >
      <Code language="ts" caption="rule-of-thumb mapping">{`// selection    → pickers, segmented controls, toggles, sliders snapping
// impact*      → drag-and-drop landing, pull-to-refresh trigger, collisions
// notification → result of an async action (saved ✓ / failed ✗ / warning ⚠)`}</Code>
      <Text variant="caption" tone="muted">
        Prefer the semantic <Text style={{ fontFamily: 'monospace' }}>notification*</Text>{' '}
        kinds over hand-rolled impact sequences — the OS tune is already calibrated
        to mean success/warning/error to a user of that platform.
      </Text>
    </Section>
  );
}
