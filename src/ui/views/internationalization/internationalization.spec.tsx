import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { InternationalizationView } from './internationalization_view';
import {
  LOCALES,
  formatDemo,
  isRTL,
  pluralize,
  t,
  translate,
  useI18nPlayground,
} from './internationalization_hooks';

// The dumb view is wrapped in ScreenScaffold, which needs expo-router nav +
// SafeAreaProvider contexts. For this smoke test we only care that the view's
// own composition renders, so mock the scaffold to pass children through.
jest.mock('../../components/screen-scaffold', () => {
  const { View } = require('react-native');
  return {
    ScreenScaffold: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

/**
 * Tests for the internationalization view's LOGIC (pure helpers + the
 * useI18nPlayground hook) and a smoke render of the dumb view. The global
 * jest.mocks.ts wires expo-localization to a stable en-US locale before any
 * test file loads.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('translate / t (pure)', () => {
  it('resolves the same key under each locale', () => {
    expect(translate('greeting', 'en')).toBe('Hello');
    expect(translate('greeting', 'es')).toBe('Hola');
    expect(translate('greeting', 'ar')).toBe('مرحبًا');
  });

  it('falls back to the key string when a key is missing', () => {
    // missing in every locale -> i18n-js returns the raw key
    expect(translate('nope.notreal', 'en')).toBe('nope.notreal');
    expect(translate('nope.notreal', 'es')).toBe('nope.notreal');
  });

  it('interpolates %{count}-style placeholders', () => {
    expect(translate('posts', 'en', { count: 5 })).toBe('You have 5 posts');
    expect(translate('posts', 'es', { count: 5 })).toBe('Tienes 5 publicaciones');
  });

  it('t() resolves at the engine locale set by the playground', () => {
    // The hook sets the engine locale to its current selection on each render,
    // so after switching to 'ar' the global t() reads Arabic.
    const { result } = renderHook(() => useI18nPlayground(), { wrapper });
    act(() => result.current.setLocale('ar'));
    expect(t('greeting')).toBe('مرحبًا');
  });
});

describe('formatDemo (Intl built-ins)', () => {
  it('formats numbers + currency + date per locale without throwing', () => {
    const en = formatDemo('en', 1234567.89, new Date('2026-08-04T12:00:00Z'));
    expect(en.number).toMatch(/1[, ]234[, ]567/);
    expect(en.currency).toContain('$');
    expect(en.date.length).toBeGreaterThan(0);
  });

  it('produces a different shape between en and es', () => {
    const en = formatDemo('en', 1234567.89);
    const es = formatDemo('es', 1234567.89);
    // es-ES uses a comma as the decimal separator; en-US uses a dot.
    expect(es.number).toContain(',');
    expect(en.number).toContain('.');
    expect(es.currency).not.toBe(en.currency);
  });

  it('returns an object with number/currency/date keys', () => {
    const sample = formatDemo('ar', 1000, new Date('2026-01-02T00:00:00Z'));
    expect(sample).toEqual(
      expect.objectContaining({
        number: expect.any(String),
        currency: expect.any(String),
        date: expect.any(String),
      }),
    );
  });
});

describe('pluralize (Intl.PluralRules)', () => {
  it('classifies one vs other in English', () => {
    expect(pluralize(1, 'en').category).toBe('one');
    expect(pluralize(0, 'en').category).toBe('other'); // English has no "zero"
    expect(pluralize(5, 'en').category).toBe('other');
  });

  it('uses Arabic six-form rules (zero/one/two/few/many/other)', () => {
    expect(pluralize(0, 'ar').category).toBe('zero');
    expect(pluralize(1, 'ar').category).toBe('one');
    expect(pluralize(2, 'ar').category).toBe('two');
    expect(pluralize(5, 'ar').category).toBe('few');
    expect(pluralize(15, 'ar').category).toBe('many');
  });

  it('substitutes the count into the phrase', () => {
    expect(pluralize(3, 'en').text).toBe('3 posts');
    expect(pluralize(1, 'en').text).toBe('1 post');
  });
});

describe('isRTL', () => {
  it('flags Arabic as RTL and the Latin locales as LTR', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('en')).toBe(false);
    expect(isRTL('es')).toBe(false);
  });

  it('matches the catalogue metadata', () => {
    (Object.keys(LOCALES) as Array<keyof typeof LOCALES>).forEach((key) => {
      expect(isRTL(key)).toBe(LOCALES[key].rtl);
    });
  });
});

describe('useI18nPlayground', () => {
  it('initialises from the mocked device locale (en-US -> en)', () => {
    const { result } = renderHook(() => useI18nPlayground(), { wrapper });
    expect(result.current.device.tag).toBe('en-US');
    expect(result.current.device.key).toBe('en');
    expect(result.current.locale).toBe('en');
    expect(result.current.isRTL).toBe(false);
  });

  it('setLocale changes the active locale, translations, formatting, and RTL flag', () => {
    const { result } = renderHook(() => useI18nPlayground(), { wrapper });
    act(() => result.current.setLocale('ar'));
    expect(result.current.locale).toBe('ar');
    expect(result.current.isRTL).toBe(true);
    expect(result.current.t('greeting')).toBe('مرحبًا');
    // Arabic formatting uses Arabic-Indic digits (U+0660..U+0669 range).
    expect(result.current.formatted.number).toMatch(/[٠-٩]/);

    act(() => result.current.setLocale('es'));
    expect(result.current.locale).toBe('es');
    expect(result.current.isRTL).toBe(false);
    expect(result.current.t('greeting')).toBe('Hola');
  });

  it('exposes a plural category for the current locale', () => {
    const { result } = renderHook(() => useI18nPlayground(), { wrapper });
    // playground count is 3 -> "other" in en, "few" in ar.
    expect(result.current.plural.category).toBe('other');
    expect(result.current.plural.text).toContain('3');
  });
});

describe('InternationalizationView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<InternationalizationView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
