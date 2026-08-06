import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

/**
 * Internationalization view logic — owns the LIVE demos' state so the view stays
 * a dumb structure. Grounded in the real RN-standard stack:
 *   expo-localization  → device locale detection (getLocales / useLocales)
 *   i18n-js            → the translation engine expo-localization documents
 *   Intl.NumberFormat / DateTimeFormat / PluralRules → JS built-ins (RN ships)
 *   react-native I18nManager → RTL direction + forceRTL
 *
 * No `enum` (erasableSyntaxOnly): locale keys are a const-object + literal union.
 */

/* -------------------------------------------------------------------------- */
/* Locale catalogue — the set of languages THIS screen demonstrates.          */
/* `ar` is included to demonstrate RTL.                                       */
/* -------------------------------------------------------------------------- */

export const LOCALES = {
  en: { tag: 'en-US', label: 'English', rtl: false },
  es: { tag: 'es-ES', label: 'Español', rtl: false },
  ar: { tag: 'ar-SA', label: 'العربية', rtl: true },
} as const;

export type Locale = keyof typeof LOCALES; // 'en' | 'es' | 'ar'

export const LOCALE_OPTIONS: ReadonlyArray<{ key: Locale; label: string }> = (
  Object.keys(LOCALES) as Locale[]
).map((key) => ({ key, label: LOCALES[key].label }));

/* -------------------------------------------------------------------------- */
/* Translation tables — what i18n-js consumes. Nested objects carry plurals.   */
/* -------------------------------------------------------------------------- */

const en = {
  greeting: 'Hello',
  welcome: 'Welcome to the React Native guide',
  posts: 'You have %{count} posts',
  tagline: 'Learn i18n the standard way',
};

const es = {
  greeting: 'Hola',
  welcome: 'Bienvenido a la guía de React Native',
  posts: 'Tienes %{count} publicaciones',
  tagline: 'Aprende i18n de forma estándar',
};

const ar = {
  greeting: 'مرحبًا',
  welcome: 'مرحبًا بك في دليل React Native',
  posts: 'لديك %{count} منشورات',
  tagline: 'تعلّم التدويل بالطريقة القياسية',
};

export const TRANSLATIONS = { en, es, ar } as const;

// Instantiate the engine once. i18n-js v4 dropped the global singleton, so the
// standard pattern is to construct an `I18n` with translations + options and
// keep a handle to it. `enableFallback` makes a missing key for one locale fall
// through to `defaultLocale`.
const i18n = new I18n(TRANSLATIONS, {
  locale: deviceLocale().key,
  defaultLocale: 'en',
  enableFallback: true,
});

export type TranslateOptions = Record<string, string | number>;

// i18n-js v4 emits a "[missing \"<locale>.<key>\" translation]" string for
// unresolved keys (its `missingBehavior: 'message'` default). We treat that as
// a miss and return the bare key — a cleaner, locale-neutral fallback that
// surfaces the gap in QA without crashing.
const MISSING_RE = /^\[missing ".*" translation\]$/;

function resolve(raw: unknown, key: string): string {
  if (typeof raw !== 'string') return key;
  return MISSING_RE.test(raw) ? key : raw;
}

/**
 * Translate a key for an EXPLICIT locale (pure: saves/restores the engine
 * locale). Use this in tests and anywhere a specific locale's rendering is
 * needed without mutating global state.
 */
export function translate(key: string, locale: Locale, options?: TranslateOptions): string {
  const previous = i18n.locale;
  i18n.locale = locale;
  const raw = i18n.t(key, options);
  i18n.locale = previous;
  return resolve(raw, key);
}

/**
 * Translate using the engine's CURRENT locale (the convenience wrapper the view
 * hands to JSX). Missing keys fall back to the key string — never throw.
 */
export function t(key: string, options?: TranslateOptions): string {
  return resolve(i18n.t(key, options), key);
}

/* -------------------------------------------------------------------------- */
/* Device locale detection — expo-localization.getLocales()                    */
/* -------------------------------------------------------------------------- */

export interface DeviceLocaleInfo {
  /** Full BCP-47 language tag, e.g. 'en-US', 'ar-SA'. */
  tag: string;
  /** One of THIS screen's supported locale keys (falls back to 'en'). */
  key: Locale;
  /** Text direction derived from the OS locale. */
  textDirection: 'ltr' | 'rtl';
  /** Region code if the OS exposed one. */
  region: string | null;
}

/** Read the OS's preferred locale and map it onto our supported set. */
export function deviceLocale(): DeviceLocaleInfo {
  const first = getLocales()[0];
  const tag = first?.languageTag ?? 'en-US';
  const code = first?.languageCode ?? 'en';
  const key: Locale = code in LOCALES ? (code as Locale) : 'en';
  const direction = first?.textDirection;
  return {
    tag,
    key,
    textDirection: direction === 'rtl' ? 'rtl' : 'ltr',
    region: first?.regionCode ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Number & date formatting — Intl built-ins (Hermes ships full Intl).         */
/* -------------------------------------------------------------------------- */

export interface FormatSample {
  number: string;
  currency: string;
  date: string;
}

const CURRENCY_FOR: Record<Locale, string> = {
  en: 'USD',
  es: 'EUR',
  ar: 'SAR',
};

const SAMPLE_DATE = new Date('2026-08-04T12:00:00Z');

/** Format a number + currency + date per the given locale's conventions. */
export function formatDemo(locale: Locale, value: number, date: Date = SAMPLE_DATE): FormatSample {
  const tag = LOCALES[locale].tag;
  return {
    number: new Intl.NumberFormat(tag).format(value),
    currency: new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: CURRENCY_FOR[locale],
      maximumFractionDigits: 2,
    }).format(value),
    date: new Intl.DateTimeFormat(tag, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date),
  };
}

/* -------------------------------------------------------------------------- */
/* Pluralization — Intl.PluralRules selects the category; we map to a string.  */
/* -------------------------------------------------------------------------- */

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

const PLURAL_TEXT: Record<Locale, Record<PluralCategory, string>> = {
  en: {
    zero: 'no posts',
    one: '%{count} post',
    two: '%{count} posts',
    few: '%{count} posts',
    many: '%{count} posts',
    other: '%{count} posts',
  },
  es: {
    zero: 'ninguna publicación',
    one: '%{count} publicación',
    two: '%{count} publicaciones',
    few: '%{count} publicaciones',
    many: '%{count} publicaciones',
    other: '%{count} publicaciones',
  },
  ar: {
    zero: 'لا منشورات',
    one: 'منشور واحد',
    two: 'منشوران',
    few: '%{count} منشورات',
    many: '%{count} منشورًا',
    other: '%{count} منشور',
  },
};

export interface PluralSample {
  /** The Intl.PluralRules category — the standard, locale-aware choice. */
  category: PluralCategory;
  /** The resolved phrase with %{count} substituted. */
  text: string;
}

/**
 * Whether the JS engine provides `Intl.PluralRules`. Hermes (as of RN 0.79 /
 * Expo SDK 53) ships `Intl.NumberFormat` + `Intl.DateTimeFormat` but NOT
 * `Intl.PluralRules` — so `new Intl.PluralRules(tag)` throws
 * "Cannot read property 'prototype' of undefined" on-device. Node and modern
 * browsers do provide it. We prefer the real engine when present and fall back
 * to the CLDR cardinal rules for the locales THIS screen teaches otherwise.
 * Standard prod fix: register `@formatjs/intl-pluralrules` once at app root.
 */
export const HAS_INTL_PLURAL_RULES =
  typeof Intl !== 'undefined' && typeof Intl.PluralRules === 'function';

/**
 * CLDR cardinal plural category for `count` under the engine's own rules.
 * Exported so the fallback path is unit-testable independent of the engine.
 */
export function selectPluralCategory(tag: string, count: number): PluralCategory {
  if (HAS_INTL_PLURAL_RULES) {
    return new Intl.PluralRules(tag).select(count) as PluralCategory;
  }
  return fallbackPluralCategory(tag, count);
}

/**
 * Engine-independent CLDR cardinal rules for the three locales this screen
 * teaches. Used ONLY when `Intl.PluralRules` is unavailable (Hermes). English
 * and Spanish share the one/other split; Arabic uses the full six-form rules.
 */
export function fallbackPluralCategory(tag: string, count: number): PluralCategory {
  const n = Math.trunc(Number(count));
  if (!tag.startsWith('ar')) {
    return n === 1 ? 'one' : 'other';
  }
  // Arabic (CLDR cardinal): zero/one/two/few/many/other.
  if (n === 0) return 'zero';
  if (n === 1) return 'one';
  if (n === 2) return 'two';
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 3 && mod100 <= 10) return 'few';
  if (mod100 >= 11 && mod100 <= 99) return 'many';
  return 'other';
}

/** Pick the correct plural phrase for `count` under `locale`'s rules. */
export function pluralize(count: number, locale: Locale): PluralSample {
  const tag = LOCALES[locale].tag;
  const category = selectPluralCategory(tag, count);
  const template = PLURAL_TEXT[locale][category] ?? PLURAL_TEXT[locale].other;
  return { category, text: template.replace('%{count}', String(count)) };
}

/* -------------------------------------------------------------------------- */
/* RTL helpers.                                                                */
/* -------------------------------------------------------------------------- */

/** True when a locale renders right-to-left. */
export function isRTL(locale: Locale): boolean {
  return LOCALES[locale].rtl;
}

/**
 * Whether the RUNNING app is in RTL mode. Comes from react-native's I18nManager
 * (the source expo-localization's own RTL detection feeds into). Under jest the
 * jest-expo preset reports `false`.
 */
export function appIsRTL(): boolean {
  return I18nManager.isRTL;
}

/* -------------------------------------------------------------------------- */
/* The playground hook — live state for the interactive demos.                 */
/* -------------------------------------------------------------------------- */

export interface I18nPlayground {
  /** OS locale, read once (expo-localization.getLocales()[0]). */
  device: DeviceLocaleInfo;
  /** Currently-selected demo locale. */
  locale: Locale;
  /** Swap the active locale (drives every live demo on the screen). */
  setLocale: (next: Locale) => void;
  /** Translate at the current locale. */
  t: (key: string, options?: TranslateOptions) => string;
  /** Per-locale formatted outputs for the current value/date. */
  formatted: FormatSample;
  /** Per-locale plural output for the current count. */
  plural: PluralSample;
  /** Whether the selected locale is RTL. */
  isRTL: boolean;
}

const PLAYGROUND_VALUE = 1234567.89;
const PLAYGROUND_COUNT = 3;

export function useI18nPlayground(): I18nPlayground {
  const device = useMemo(() => deviceLocale(), []);
  const [locale, setLocaleState] = useState<Locale>(device.key);

  // The engine's current locale follows React state. The i18n-js instance is a
  // plain data holder, but mutating it is a side effect — keep it OUT of the
  // render body (the project enforces pure render; setState/mutation belongs in
  // an effect) and apply it from a useEffect keyed on the selected locale.
  useEffect(() => {
    i18n.locale = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const formatted = useMemo(() => formatDemo(locale, PLAYGROUND_VALUE), [locale]);
  const plural = useMemo(() => pluralize(PLAYGROUND_COUNT, locale), [locale]);

  return {
    device,
    locale,
    setLocale,
    t,
    formatted,
    plural,
    isRTL: isRTL(locale),
  };
}
