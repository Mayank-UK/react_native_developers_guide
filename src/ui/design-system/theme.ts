import { createContext, useContext } from 'react';
import type { Theme, ThemeMode } from './tokens';

/**
 * Theme context + hook, split from <ThemeProvider/> so the provider file only
 * exports a component (keeps React Fast Refresh happy). Mirrors the web
 * guide's `theme.ts` split.
 */

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

/** Convenience: just the active theme object. */
export function useThemeTokens(): Theme {
  return useTheme().theme;
}
