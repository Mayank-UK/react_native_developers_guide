import { useState } from 'react';
import type { Palette, ThemeMode } from '../../../../design-system/tokens';

/**
 * Design-system view logic — the Button-anatomy pressed state (the only
 * non-presentational state in the screen) and the pure swatch list builder +
 * mode-word helper. The view stays a dumb structure; `useTheme` (design-system
 * context, no state) is kept in the view per the exemplar's presentational
 * exception.
 */

export type Swatch = readonly [name: string, hex: string];

/** Build the canonical colour swatch list for a palette (pure, testable). */
export function paletteSwatches(p: Palette): ReadonlyArray<Swatch> {
  return [
    ['background', p.background],
    ['surface', p.surface],
    ['surfaceVariant', p.surfaceVariant],
    ['border', p.border],
    ['primary', p.primary],
    ['text', p.text],
    ['textMuted', p.textMuted],
    ['success', p.success],
    ['warning', p.warning],
    ['danger', p.danger],
  ];
}

/** Human-readable mode word for inline copy. */
export function modeWord(m: ThemeMode): string {
  return m === 'dark' ? 'dark' : 'light';
}

/** Pressed-state for the Button-anatomy demo (ButtonAnatomyCard). */
export function usePressedState(initial = false): {
  pressed: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const [pressed, setPressed] = useState(initial);
  return {
    pressed,
    onPressIn: () => setPressed(true),
    onPressOut: () => setPressed(false),
  };
}
