import { useState } from 'react';

/**
 * Layout view logic — owns each interactive demo's picker state so the view
 * stays a dumb structure. Each card has a small, focused hook. The option
 * arrays below are the canonical picker sets; the view maps over them to render
 * the chip rows. No `any`; strict + erasure-clean.
 */

export const DIRECTIONS = ['row', 'column', 'row-reverse', 'column-reverse'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const JUSTIFY = [
  'flex-start',
  'center',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
] as const;
export type Justify = (typeof JUSTIFY)[number];

export const ALIGN = ['flex-start', 'center', 'flex-end', 'stretch'] as const;
export type Align = (typeof ALIGN)[number];

export const GAPS = ['xxs', 'xs', 'sm', 'md', 'lg'] as const;
export type GapKey = (typeof GAPS)[number];

/** flexDirection picker (FlexDirectionCard). */
export function useFlexDirection(initial: Direction = 'row') {
  const [dir, setDir] = useState<Direction>(initial);
  return { dir, setDir };
}

/** justifyContent + alignItems pickers (JustifyAlignCard). */
export function useJustifyAlign(initialJustify: Justify = 'center', initialAlign: Align = 'center') {
  const [justify, setJustify] = useState<Justify>(initialJustify);
  const [align, setAlign] = useState<Align>(initialAlign);
  return { justify, setJustify, align, setAlign };
}

/** flexGrow on/off toggle (FlexGrowShrinkCard). */
export function useFlexGrowToggle(initial = true) {
  const [growMiddle, setGrowMiddle] = useState(initial);
  return { growMiddle, toggle: () => setGrowMiddle((v) => !v) };
}

/** gap token picker (GapCard). */
export function useGapPicker(initial: GapKey = 'md') {
  const [gap, setGap] = useState<GapKey>(initial);
  return { gap, setGap };
}

/** position absolute/relative toggle (PositionZIndexCard). */
export function useStackToggle(initial = false) {
  const [stack, setStack] = useState(initial);
  return { stack, toggle: () => setStack((v) => !v) };
}
