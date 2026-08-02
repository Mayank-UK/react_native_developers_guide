import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext, type ThemeContextValue } from './theme';
import { buildTheme, type ThemeMode } from './tokens';

/**
 * ThemeProvider owns light/dark mode, mirroring the sibling guides'
 * `ThemeProvider`. The active mode is persisted in AsyncStorage (the RN
 * analogue of the web guide's `localStorage`) and falls back to the system
 * preference via `useColorScheme`.
 *
 * Note (RN vs web): the web guide writes a `data-theme` attribute that CSS
 * variables resolve. RN has no CSS variables, so the active `Theme` object is
 * passed through context and consumed by `StyleSheet.create`-driven components.
 */

const STORAGE_KEY = 'rndg-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(
    system === 'dark' ? 'dark' : 'light',
  );

  // Restore the persisted preference once on mount.
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setMode(stored);
    });
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      theme: buildTheme(mode),
      setMode,
      toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
