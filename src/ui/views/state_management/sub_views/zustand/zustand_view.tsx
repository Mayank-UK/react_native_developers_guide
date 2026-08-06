import { ScreenScaffold } from '../../../../components/screen-scaffold';
import { Box, Button, Text } from '../../../../components';
import { Section, Code, Pill } from '../../../../components';
import {
  useZustandControls,
  useZustandCountDisplay,
  useZustandParityBadge,
} from './zustand_hooks';

/**
 * ZustandView — a dumb structure. All state/behaviour lives in the co-located
 * hooks (zustand_hooks.ts); this file only renders.
 *
 * Shared client state via Zustand: a tiny (~1KB) store, one create() call, no
 * Provider boilerplate, components subscribe with a selector so they re-render
 * only when THEIR slice changes. Ships a LIVE demo with render counters that
 * prove the selector behaviour. No `any`; strict + erasableSyntaxOnly-clean.
 */
export function ZustandView() {
  return (
    <ScreenScaffold title="Zustand">
      <ZustandCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* SHARED client state — Zustand (LIVE)                             */
/* ------------------------------------------------------------------ */

/** Renders the count. Re-renders whenever count changes. */
function ZustandCountDisplay() {
  const { count, renders } = useZustandCountDisplay();
  return (
    <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" center>
      <Text variant="h3" tone="primary" style={{ fontWeight: '700' }}>
        {count}
      </Text>
      <Text variant="caption" tone="muted">
        count · renders={renders}
      </Text>
    </Box>
  );
}

/**
 * Subscribes via a selector to count % 2 — re-renders ONLY when parity flips.
 * Watch the render counter.
 */
function ZustandParityBadge() {
  const { parity, renders } = useZustandParityBadge();
  return (
    <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" center>
      <Pill tone="primary">{parity}</Pill>
      <Text variant="caption" tone="muted">
        parity (selector) · renders={renders}
      </Text>
    </Box>
  );
}

function ZustandCard() {
  const { increment, setNote, note } = useZustandControls();
  return (
    <Section
      title="Shared client state — Zustand"
      explanation="Zustand is a tiny (~1KB) store: one create() call, no Provider boilerplate, and components subscribe with a selector so they re-render only when THEIR slice changes. It is the most popular lightweight alternative to Context+useReducer for shared client state."
    >
      <Box gap="sm">
        <ZustandCountDisplay />
        <ZustandParityBadge />

        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="store.increment()" variant="filled" onPress={increment} />
          <Button
            title="toggle note"
            variant="outline"
            onPress={() => setNote(note === 'hello' ? 'world' : 'hello')}
          />
        </Box>

        <Text variant="caption" tone="muted">
          Watch the render counters: increment bumps both (count changes, parity
          may flip). But toggling the note re-renders NEITHER display component —
          each selected only the slice it cares about. That is Zustand's main win
          over Context (which would re-render all consumers on any change).
        </Text>

        <Code>{`import { create } from 'zustand';

const useCounter = create<{ count: number; inc: () => void }>((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));

// in any component, anywhere — no Provider:
const count = useCounter((s) => s.count); // selector → re-renders only on count
const inc   = useCounter((s) => s.inc);`}</Code>
      </Box>
    </Section>
  );
}
