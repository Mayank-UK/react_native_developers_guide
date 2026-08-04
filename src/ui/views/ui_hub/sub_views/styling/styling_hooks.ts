import { useCallback, useEffect, useRef, useState } from 'react';
import type { Palette } from '../../../../design-system/tokens';

/**
 * Styling view logic — owns the swatch copy-feedback state (the only piece of
 * non-presentational state in the screen) and the pure swatch-list builder. The
 * view itself stays a dumb structure; `useTheme` (design-system context, no
 * state) is kept in the view per the exemplar's presentational exception.
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
    ['info', p.info],
  ];
}

/**
 * Copy-feedback flag for a single swatch: copy() sets `copied` true for 800ms
 * then resets it. The timeout is tracked on a ref and cleared on unmount so a
 * state update never lands on an unmounted component.
 */
export function useCopiedFlag(timeoutMs = 800): {
  copied: boolean;
  copy: () => void;
} {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(() => {
    setCopied(true);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), timeoutMs);
  }, [timeoutMs]);

  return { copied, copy };
}
