import { useFonts } from 'expo-font';

/**
 * Font assets + loader. The app bundles three Google Font families so its
 * typography matches the sibling `react_developers_guide` (Inter for body,
 * Montserrat for display/headings, JetBrains Mono for code) instead of the
 * generic system font.
 *
 * `useFonts` loads the `.ttf`s from `src/assets/fonts/` and resolves to a
 * `[loaded, error]` tuple. The root layout gates first paint on `loaded` so no
 * text ever flashes the system font. Each family is registered under multiple
 * PostScript names so `fontWeight` on a `<Text>` picks the matching weight
 * file (RN selects by family + weight).
 *
 * The `Fonts` object maps a logical role → the family name to pass to
 * `fontFamily` in the typography tokens (`tokens.ts`).
 */
export const Fonts = {
  body: 'Inter',
  display: 'Montserrat',
  mono: 'JetBrainsMono',
} as const;

const FONT_ASSETS = {
  // Inter — body (4 weights)
  Inter_400Regular: require('../../assets/fonts/Inter_400Regular.ttf'),
  Inter_500Medium: require('../../assets/fonts/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('../../assets/fonts/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('../../assets/fonts/Inter_700Bold.ttf'),
  // Montserrat — display/headings (2 weights)
  Montserrat_600SemiBold: require('../../assets/fonts/Montserrat_600SemiBold.ttf'),
  Montserrat_700Bold: require('../../assets/fonts/Montserrat_700Bold.ttf'),
  // JetBrains Mono — code (2 weights)
  JetBrainsMono_400Regular: require('../../assets/fonts/JetBrainsMono_400Regular.ttf'),
  JetBrainsMono_500Medium: require('../../assets/fonts/JetBrainsMono_500Medium.ttf'),
};

export type FontsLoaded = [boolean, Error | null];

/** Hook used once in the root layout; returns `[loaded, error]`. */
export function useAppFonts(): FontsLoaded {
  return useFonts(FONT_ASSETS);
}
