import { ScreenScaffold } from '../../components/screen-scaffold';
import { Section, Code, Pill } from '../../components';
import { Box, Button, Text } from '../../components';
import {
  LOCALE_OPTIONS,
  appIsRTL,
  isRTL as localeIsRTL,
  pluralize,
  translate,
  useI18nPlayground,
  type Locale,
} from './internationalization_hooks';

/**
 * InternationalizationView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (internationalization_hooks.ts); this file only renders.
 *
 * Teaching artifact for the RN-standard i18n stack: `expo-localization` (device
 * locale detection), `i18n-js` (translation engine), the JS `Intl` built-ins
 * (number/date/plural formatting), and `react-native`'s `I18nManager` (RTL).
 *
 * No `any`; strict + erasure-clean. Inside `<Code>{`...`}</Code> there are no
 * nested template literals (no `\${` parse trap).
 */
export function InternationalizationView() {
  return (
    <ScreenScaffold
      title="Internationalization (i18n)"
    >
      <IntroCard />
      <DeviceLocaleCard />
      <TranslationsCard />
      <FormattingCard />
      <PluralizationCard />
      <RTLCard />
      <ProductionNotesCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. What i18n means in RN                                            */
/* ------------------------------------------------------------------ */

function IntroCard() {
  return (
    <Section
      title="What i18n means in React Native"
      explanation="Internationalization is everything that adapts your UI to a user's language and region — before you even translate a single string."
    >
      <Box gap="sm">
        <Text variant="body">
          A common confusion: <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>locale</Text> ≠{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>language</Text>. A locale is a BCP-47 tag
          like <Text style={{ fontFamily: 'monospace' }}>en-US</Text> or{' '}
          <Text style={{ fontFamily: 'monospace' }}>ar-SA</Text> — it carries BOTH a language and a region, and it
          drives formatting too (a decimal comma in Madrid, a 24-hour clock in Berlin). i18n is the five pieces below.
        </Text>
        <Box gap="xs">
          {PIECE_ROWS.map((r) => (
            <Box key={r.piece} p="sm" radius="sm" bg="surfaceVariant">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text variant="small" style={{ fontWeight: '600' }}>
                  {r.piece}
                </Text>
                <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                  {r.tool}
                </Text>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.note}
              </Text>
            </Box>
          ))}
        </Box>
        <Text variant="caption" tone="muted">
          The RN-standard stack this screen teaches:{' '}
          <Text style={{ fontFamily: 'monospace' }}>expo-localization</Text> (detection) +{' '}
          <Text style={{ fontFamily: 'monospace' }}>i18n-js</Text> (translation engine, the one{' '}
          <Text style={{ fontFamily: 'monospace' }}>expo-localization</Text> documents) + the JS{' '}
          <Text style={{ fontFamily: 'monospace' }}>Intl</Text> built-ins (formatting) +{' '}
          <Text style={{ fontFamily: 'monospace' }}>I18nManager</Text> (RTL).
        </Text>
      </Box>
    </Section>
  );
}

const PIECE_ROWS: ReadonlyArray<{ piece: string; tool: string; note: string }> = [
  {
    piece: '1. Detection',
    tool: 'expo-localization',
    note: 'Read the OS locale list (the user may have several, ordered). The only source of truth for "what language does this device want?".',
  },
  {
    piece: '2. Translation',
    tool: 'i18n-js',
    note: 'Look up a logical key ("welcome") in a per-locale dictionary so the UI never hard-codes a user-facing string.',
  },
  {
    piece: '3. Number/date formatting',
    tool: 'Intl.NumberFormat / DateTimeFormat',
    note: 'A JS built-in Hermes ships. 1,234.56 in en, 1 234,56 in es — you do NOT write these by hand.',
  },
  {
    piece: '4. Pluralization',
    tool: 'Intl.PluralRules',
    note: 'English has two plural forms (one/other); Arabic has six (zero/one/two/few/many/other). Let the engine pick.',
  },
  {
    piece: '5. RTL',
    tool: 'I18nManager',
    note: 'Right-to-left layout for Arabic/Hebrew. react-native flips the flex axis for you once I18nManager.isRTL is true.',
  },
];

/* ------------------------------------------------------------------ */
/* 2. Detecting the device locale                                      */
/* ------------------------------------------------------------------ */

function DeviceLocaleCard() {
  const { device } = useI18nPlayground();
  return (
    <Section
      title="Detecting the device locale — expo-localization"
      explanation="getLocales() returns the OS preference list; useLocales() is the reactive hook version that re-renders on settings change."
    >
      <Box gap="sm">
        <Code>{`import { getLocales, useLocales } from 'expo-localization';

// imperative — read once at startup
const [primary] = getLocales();
// primary.languageTag   -> "ar-SA"
// primary.languageCode  -> "ar"
// primary.regionCode    -> "SA"
// primary.textDirection -> "rtl"

// reactive — re-renders when the user changes system language
const locales = useLocales();
const active = locales[0];`}</Code>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            LIVE — what this device reports right now
          </Text>
          <Box gap="xs" mt="xs">
            <ReadoutRow label="languageTag" value={device.tag} mono />
            <ReadoutRow label="mapped key" value={device.key} mono tone="primary" />
            <ReadoutRow label="region" value={device.region ?? '—'} mono />
            <ReadoutRow label="textDirection" value={device.textDirection} mono tone="primary" />
          </Box>
        </Box>
        <Text variant="caption" tone="muted">
          Note the field is <Text style={{ fontFamily: 'monospace' }}>textDirection</Text>, not a boolean{' '}
          <Text style={{ fontFamily: 'monospace' }}>isRTL</Text> — it reads{' '}
          <Text style={{ fontFamily: 'monospace' }}>'ltr'</Text> /{' '}
          <Text style={{ fontFamily: 'monospace' }}>'rtl'</Text> (and may be null on some web engines). We map it onto
          our own supported-locale set; an unsupported language falls back to English.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Translation tables — i18n-js                                    */
/* ------------------------------------------------------------------ */

function TranslationsCard() {
  const { locale, setLocale, t } = useI18nPlayground();
  return (
    <Section
      title="Translation tables — i18n-js"
      explanation="Hold your strings in a per-locale dictionary keyed by a logical name; the UI only ever references the key, never a literal."
    >
      <Box gap="sm">
        <Code>{`import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

const en = { greeting: 'Hello', tagline: 'Learn i18n the standard way' };
const es = { greeting: 'Hola',  tagline: 'Aprende i18n de forma estándar' };
const ar = { greeting: 'مرحبًا', tagline: 'تعلّم التدويل بالطريقة القياسية' };

// i18n-js v4 has no global singleton — instantiate once.
const i18n = new I18n(
  { en, es, ar },
  { locale: getLocales()[0]?.languageCode ?? 'en',
    defaultLocale: 'en', enableFallback: true },
);

// the UI references keys only
<Text>{ i18n.t('greeting') }</Text>`}</Code>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            LIVE — switch locale, same key renders in each
          </Text>
          <Box row gap="xs" style={{ flexWrap: 'wrap' }} mt="xs">
            {LOCALE_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                title={opt.label}
                variant={locale === opt.key ? 'filled' : 'outline'}
                onPress={() => setLocale(opt.key)}
              />
            ))}
          </Box>
          <Box gap="xs" mt="sm">
            <TranslatedRow label="greeting" value={t('greeting')} />
            <TranslatedRow label="tagline" value={t('tagline')} />
            <TranslatedRow label="welcome" value={t('welcome')} />
          </Box>
        </Box>
        <Text variant="caption" tone="muted">
          A missing key for a locale falls through to{' '}
          <Text style={{ fontFamily: 'monospace' }}>defaultLocale</Text> ('en') thanks to{' '}
          <Text style={{ fontFamily: 'monospace' }}>enableFallback</Text>; if it is missing there too, the key itself
          is returned so the gap is obvious in QA rather than crashing.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Number & date formatting                                        */
/* ------------------------------------------------------------------ */

function FormattingCard() {
  const { locale, setLocale, formatted } = useI18nPlayground();
  return (
    <Section
      title="Number & date formatting"
      explanation="Never hand-roll separators — Intl.NumberFormat and Intl.DateTimeFormat are JS built-ins Hermes ships, and they already know every locale's conventions."
    >
      <Box gap="sm">
        <Code>{`const tag = 'es-ES';

new Intl.NumberFormat(tag).format(1234567.89);
// -> "1.234.567,89"   (es uses dot for thousands, comma for decimal)

new Intl.NumberFormat(tag, {
  style: 'currency', currency: 'EUR',
}).format(1234567.89);
// -> "1.234.567,89 €"

new Intl.DateTimeFormat(tag, {
  year: 'numeric', month: 'long', day: 'numeric',
}).format(new Date());
// -> "4 de agosto de 2026"`}</Code>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            LIVE — formatting 1,234,567.89 and today under each locale
          </Text>
          <Box row gap="xs" style={{ flexWrap: 'wrap' }} mt="xs">
            {LOCALE_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                title={opt.label}
                variant={locale === opt.key ? 'filled' : 'outline'}
                onPress={() => setLocale(opt.key)}
              />
            ))}
          </Box>
          <Box gap="xs" mt="sm">
            <ReadoutRow label="number" value={formatted.number} mono />
            <ReadoutRow label="currency" value={formatted.currency} mono tone="primary" />
            <ReadoutRow label="date" value={formatted.date} mono />
          </Box>
        </Box>
        <Text variant="caption" tone="muted">
          Same value, three locales: <Text style={{ fontFamily: 'monospace' }}>en</Text> groups with commas;{' '}
          <Text style={{ fontFamily: 'monospace' }}>es</Text> uses dots + a trailing euro sign;{' '}
          <Text style={{ fontFamily: 'monospace' }}>ar</Text> uses Arabic-Indic digits. The code is identical — only
          the tag changes.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Pluralization                                                   */
/* ------------------------------------------------------------------ */

function PluralizationCard() {
  const { locale, setLocale, plural } = useI18nPlayground();
  const previewCounts = [0, 1, 2, 3, 11];
  return (
    <Section
      title="Pluralization"
      explanation="English has two forms (one/other). Arabic has six. Intl.PluralRules selects the right category for the locale; you just supply a phrase per category."
    >
      <Box gap="sm">
        <Code>{`// the engine picks the category — you never if/else on the count
const rules = new Intl.PluralRules('ar-SA');
rules.select(0);   // -> "zero"
rules.select(1);   // -> "one"
rules.select(2);   // -> "two"
rules.select(5);   // -> "few"
rules.select(15);  // -> "many"
rules.select(100); // -> "other"

// map the category to a phrase; substitute the count back in
const phrases = { one: 'منشور واحد', few: '%{count} منشورات', /* … */ };
const text = phrases[rules.select(n)].replace('%{count}', String(n));`}</Code>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            LIVE — count = 3 under the current locale
          </Text>
          <Box row gap="xs" style={{ flexWrap: 'wrap' }} mt="xs">
            {LOCALE_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                title={opt.label}
                variant={locale === opt.key ? 'filled' : 'outline'}
                onPress={() => setLocale(opt.key)}
              />
            ))}
          </Box>
          <Box gap="xs" mt="sm">
            <ReadoutRow label="category" value={plural.category} mono tone="primary" />
            <ReadoutRow label="phrase" value={plural.text} />
          </Box>
        </Box>
        <Box gap="xs">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            category table — how each count classifies per locale
          </Text>
          {previewCounts.map((count) => {
            const row = LOCALE_OPTIONS.map((opt) => ({
              key: opt.key,
              cat: pluralize(count, opt.key).category,
            }));
            return (
              <Box key={count} p="xs" radius="sm" bg="surfaceVariant" row gap="sm" style={{ flexWrap: 'wrap' }}>
                <Text variant="caption" tone="muted" style={{ fontWeight: '600', minWidth: 28 }}>
                  {String(count)}
                </Text>
                {row.map((cell) => (
                  <Pill key={cell.key} label={cell.key} value={cell.cat} tone="muted" />
                ))}
              </Box>
            );
          })}
        </Box>
      </Box>
      <Text variant="caption" tone="muted">
        Hermes (the RN JS engine) ships <Text style={{ fontFamily: 'monospace' }}>Intl.NumberFormat</Text> and{' '}
        <Text style={{ fontFamily: 'monospace' }}>DateTimeFormat</Text> but{' '}
        <Text style={{ fontWeight: '600' }}>not</Text>{' '}
        <Text style={{ fontFamily: 'monospace' }}>Intl.PluralRules</Text> as of SDK 53 — this screen falls back to the
        CLDR cardinal rules so the demo renders on-device. In production, register the{' '}
        <Text style={{ fontFamily: 'monospace' }}>@formatjs/intl-pluralrules</Text> polyfill once at app root and the
        real engine is used everywhere.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. RTL (right-to-left)                                             */
/* ------------------------------------------------------------------ */

function RTLCard() {
  const { locale, setLocale, isRTL } = useI18nPlayground();
  return (
    <Section
      title="RTL (right-to-left)"
      explanation="react-native ships an RTL-aware layout. I18nManager.isRTL flips the primary flex axis; for Arabic the whole UI mirrors."
    >
      <Box gap="sm">
        <Code>{`import { I18nManager } from 'react-native';

// I18nManager.isRTL reflects the current direction.
// To FORCE RTL (e.g. an in-app language switch to Arabic):
I18nManager.forceRTL(true);

// Then layout mirrors automatically — but on Android a direction
// change needs a reload to take effect for the running JS bundle.
// Production pattern: set direction BEFORE first paint from
// getLocales()[0].textDirection, not after mount.`}</Code>
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {LOCALE_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              title={opt.label}
              variant={locale === opt.key ? 'filled' : 'outline'}
              onPress={() => setLocale(opt.key)}
            />
          ))}
        </Box>
        <Box
          p="sm"
          radius="md"
          bg="surfaceVariant"
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text variant="small" style={{ fontWeight: '600' }}>
            {translate('greeting', locale)}
          </Text>
          <Pill tone={isRTL ? 'primary' : 'muted'}>
            {isRTL ? 'row-reverse →' : '← row'}
          </Pill>
        </Box>
        <Box gap="xs">
          <ReadoutRow label="LOCALES[locale].rtl" value={String(localeIsRTL(locale))} mono />
          <ReadoutRow label="I18nManager.isRTL (running app)" value={String(appIsRTL())} mono tone="primary" />
          <ReadoutRow
            label="reload needed to apply?"
            value={localeIsRTL(locale) !== appIsRTL() ? 'yes (Android) / partial (iOS)' : 'no — already in sync'}
          />
        </Box>
        <Text variant="caption" tone="muted">
          The preview block above uses{' '}
          <Text style={{ fontFamily: 'monospace' }}>flexDirection: isRTL ? 'row-reverse' : 'row'</Text> so you can see
          the flip in-app. The whole-app mirror relies on{' '}
          <Text style={{ fontFamily: 'monospace' }}>I18nManager.forceRTL</Text>, which{' '}
          <Text style={{ fontWeight: '600' }}>does not fully apply mid-session on Android</Text> — set it before the
          first render from the device locale, or restart the JS bundle after an in-app switch.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Production notes                                                */
/* ------------------------------------------------------------------ */

function ProductionNotesCard() {
  return (
    <Section
      title="Production notes"
      explanation="The decisions that matter once you ship: bundle size, ICU vs i18n-js, testing, and missing-translation handling."
    >
      <Box gap="xs">
        {PRODUCTION_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.title}
              </Text>
              {r.pills.map((p) => (
                <Pill key={p} tone="muted">
                  {p}
                </Pill>
              ))}
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

const PRODUCTION_ROWS: ReadonlyArray<{ title: string; pills: string[]; body: string }> = [
  {
    title: 'Bundle only the locales you need',
    pills: ['lazy-load', 'Metro', 'size'],
    body: 'Every locale dictionary ships in the JS bundle. For many languages, split dictionaries by file and require() them on demand, or strip unused locales via the Metro serializer — a 15-locale app can otherwise bloat the bundle by hundreds of KB.',
  },
  {
    title: 'i18n-js vs ICU MessageFormat',
    pills: ['trade-off', 'FormatJS'],
    body: 'i18n-js (this screen) is lightweight and covers interpolation + simple plurals. For gender, embedded markup, or complex CLDR plural rules across MANY locales, reach for FormatJS (react-intl / @formatjs/intl) — heavier, but the gold standard for correctness.',
  },
  {
    title: 'Reactive detection',
    pills: ['useLocales', 'useCalendars'],
    body: 'expo-localization ships hooks (useLocales, useCalendars) that re-render on OS settings change. Prefer them over a one-time getLocales() read if the user might switch system language while your app runs.',
  },
  {
    title: 'Test under multiple locales',
    pills: ['jest', 'mock', 'fallback'],
    body: 'In jest, mock expo-localization to return a target locale (see jest.mocks.ts) and assert that t() resolves and that missing keys fall back to defaultLocale — never silently render a raw key in prod.',
  },
  {
    title: 'Missing-translation fallback',
    pills: ['enableFallback', 'QA'],
    body: 'Set enableFallback + a defaultLocale so a missing key in one locale renders the English string, not the raw key. Wire a dev-only warning (i18n.missingBehavior) so untranslated keys surface during CI rather than in production.',
  },
];

/* ------------------------------------------------------------------ */
/* Local presentational helpers                                       */
/* ------------------------------------------------------------------ */

function ReadoutRow({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'primary' | 'default';
}) {
  return (
    <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
        {label}
      </Text>
      <Text
        variant="small"
        tone={tone}
        style={mono ? { fontFamily: 'monospace' } : undefined}
      >
        {value}
      </Text>
    </Box>
  );
}

function TranslatedRow({ label, value }: { label: string; value: string }) {
  return (
    <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
        {label}
      </Text>
      <Text variant="small" tone="primary">
        {value}
      </Text>
    </Box>
  );
}

// Locale type re-exported for spec/test convenience.
export type { Locale };
