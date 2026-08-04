import { useState } from 'react';

/**
 * Responsive view logic — the pure breakpoint/column math (the RN-standard
 * JS-driven responsiveness the screen teaches) plus the keyboard-demo text
 * state. The view stays a dumb structure.
 *
 * `useWindowDimensions` is a platform context hook (analogous to `useTheme`),
 * so it stays in the view per the exemplar's presentational exception; only
 * this screen's own state and pure derivations live here.
 */

export type Breakpoint = 'sm' | 'md' | 'lg';

/** Map a window width to its breakpoint bucket. */
export function breakpoint(width: number): Breakpoint {
  if (width < 480) return 'sm';
  if (width < 900) return 'md';
  return 'lg';
}

/** Responsive grid column count for a window width. */
export function columnsFor(width: number): number {
  const bp = breakpoint(width);
  if (bp === 'sm') return 1;
  if (bp === 'md') return 2;
  return 3;
}

/** Orientation derived from width vs height. */
export function orientationOf(width: number, height: number): 'portrait' | 'landscape' {
  return width >= height ? 'landscape' : 'portrait';
}

/** KeyboardAvoidingView demo text (KeyboardAvoidingCard). */
export function useKeyboardDemoText(initial = '') {
  const [text, setText] = useState(initial);
  return { text, setText };
}
