/**
 * Design tokens — the single source of truth for the visual language. Mirrors
 * the sibling guides' tokens (color/spacing/typography/radii/shadows), exposed
 * as a typed TS object so the theme can be consumed via StyleSheet + a Theme
 * context.
 *
 * Note (RN vs web reference): the web guide bridges CSS custom properties to
 * Tailwind via `@theme inline`. RN has no CSS variables / Tailwind is optional,
 * so the RN-standard is a plain TS theme object consumed directly by
 * `StyleSheet.create` and read through a `ThemeProvider` context (see
 * `theme.ts` / `theme-provider.tsx`). This is the most dependency-light,
 * RN-native approach and the one most instructive for a teaching app.
 *
 * `ThemeMode` selects a palette set; both light + dark live here as data.
 */

export type ThemeMode = 'light' | 'dark';

/** Spacing scale (px). Use via `theme.spacing[size]`. */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
/** The literal value union (e.g. for passing numbers around). */
export type Spacing = (typeof Spacing)[keyof typeof Spacing];
/** The key union used to index the spacing object. */
export type SpacingKey = keyof typeof Spacing;

/** Radii scale (px). */
export const Radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  full: 9999,
} as const;
export type Radii = (typeof Radii)[keyof typeof Radii];
export type RadiusKey = keyof typeof Radii;

export interface Palette {
  background: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export const LightPalette: Palette = {
  background: '#f7f8fb',
  surface: '#ffffff',
  surfaceVariant: '#eef1f6',
  border: '#d7dce5',
  primary: '#2b6cb0',
  primaryPressed: '#1f4f86',
  onPrimary: '#ffffff',
  text: '#0f172a',
  textMuted: '#5a6478',
  success: '#1f9d55',
  warning: '#b7791f',
  danger: '#c53030',
  info: '#2b6cb0',
};

export const DarkPalette: Palette = {
  background: '#0b1220',
  surface: '#121a2b',
  surfaceVariant: '#1c2740',
  border: '#28344f',
  primary: '#4c9be8',
  primaryPressed: '#7ab6f2',
  onPrimary: '#06121f',
  text: '#e6ecf5',
  textMuted: '#9aa6bd',
  success: '#48bb78',
  warning: '#e2b34a',
  danger: '#f0686b',
  info: '#4c9be8',
};

/**
 * Per-variant type style. RN applies `lineHeight`/`letterSpacing` as absolute
 * numbers (not em), so they are pre-multiplied here. The airy, "not congested"
 * feel comes from generous line-heights (body 1.7, small 1.625) and a tracked
 * uppercase overline — ported from the sibling web guide's tokens.css.
 *
 * `fontFamily` points at a SPECIFIC registered weight file (loaded in
 * `fonts.ts`), so each variant renders the exact weight intended rather than
 * relying on the synthesizer.
 */
export interface TypeVariant {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  fontWeight: '400' | '500' | '600' | '700';
  uppercase?: boolean;
}

export type TextVariantName =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'small'
  | 'caption'
  | 'overline'
  | 'mono';

export type Typography = Record<TextVariantName, TypeVariant>;

export const typography: Typography = {
  // Page title — Montserrat, bold.
  h1: { fontFamily: 'Montserrat_700Bold', fontSize: 22, lineHeight: 28, fontWeight: '700' },
  // Section heading — Montserrat, semibold.
  h2: { fontFamily: 'Montserrat_600SemiBold', fontSize: 20, lineHeight: 26, fontWeight: '600' },
  // Subsection — Inter, semibold.
  h3: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 22, fontWeight: '600' },
  // Body — Inter regular, line-height 1.7 (the readability lever).
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 27, fontWeight: '400' },
  // Secondary body — 14px, line-height 1.625.
  small: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 23, fontWeight: '400' },
  // Caption — 12px.
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, fontWeight: '400' },
  // Overline — uppercase, tracked label.
  overline: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    fontWeight: '600',
    uppercase: true,
  },
  // Code — JetBrains Mono.
  mono: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, lineHeight: 21, fontWeight: '400' },
};

export interface Theme {
  mode: ThemeMode;
  colors: Palette;
  spacing: typeof Spacing;
  radii: typeof Radii;
  typography: Typography;
}

export function buildTheme(mode: ThemeMode): Theme {
  return {
    mode,
    colors: mode === 'dark' ? DarkPalette : LightPalette,
    spacing: Spacing,
    radii: Radii,
    typography,
  };
}
