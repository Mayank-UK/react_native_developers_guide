import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Card, Text } from '../../design-system';
import { Section, Code, Pill } from '../../components';
import { usePlatformDemo } from './platform_specific_hooks';

/**
 * PlatformSpecificView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (platform_specific_hooks.ts); this file only renders.
 *
 * Teaching artifact for platform-specific code in React Native the STANDARD
 * way: the `Platform` module (Platform.OS / Platform.Version / Platform.select),
 * Metro's `.ios` / `.android` / `.native` / `.web` extension resolution, and —
 * conceptually — Expo config plugins + custom dev builds for when JS is not enough.
 *
 * The repo ships a REAL `platform_message.ios.ts` + `platform_message.android.ts`
 * pair (plus a `.ts` fallback for web/types) under this directory; the LIVE demo
 * imports `./platform_message` (no extension) and renders whichever one Metro
 * resolved — proof the extension mechanism works.
 */
export function PlatformSpecificView() {
  return (
    <ScreenScaffold
      title="Platform-Specific Code"
      subtitle="Platform.OS, .ios/.android extensions, config plugins — the standard RN escape hatch."
    >
      <IntroCard />
      <LivePlatformReadoutCard />
      <PlatformSelectCard />
      <FileExtensionsCard />
      <ConditionalRenderingCard />
      <ConfigPluginsCard />
      <PitfallsCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. One codebase, multiple platforms                                 */
/* ------------------------------------------------------------------ */

function IntroCard() {
  return (
    <Section title="One codebase, multiple platforms">
      <Text variant="body">
        React Native renders to{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          native iOS, native Android, and the web
        </Text>{' '}
        from one JS bundle. 95% of your code is platform-agnostic — the same
        components, the same hooks, the same fetch pipeline. The remaining 5% is
        where the platforms genuinely differ (safe-area insets, status-bar
        colour, haptic engines, native permissions), and for that 5% RN gives you
        a single, deliberate escape hatch: the{' '}
        <Text style={{ fontFamily: 'monospace' }}>Platform</Text> module.
      </Text>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" style={{ fontWeight: '600' }}>
          The three escape hatches (in order of preference)
        </Text>
        <Text variant="small" tone="muted" mt="xxs">
          1. Branch in JS via{' '}
          <Text style={{ fontFamily: 'monospace' }}>Platform.OS</Text> /{' '}
          <Text style={{ fontFamily: 'monospace' }}>Platform.select</Text> — for a
          value or a small render branch. 2. Split a whole file via Metro's{' '}
          <Text style={{ fontFamily: 'monospace' }}>.ios.tsx</Text> /{' '}
          <Text style={{ fontFamily: 'monospace' }}>.android.tsx</Text> extensions —
          for divergent implementations of the same module. 3. Drop into native
          code via an Expo config plugin or a custom dev build — when no JS API
          exists yet (camera frame data, custom ELF alignment, a 3rd-party SDK).
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. LIVE — Platform.OS / Platform.Version                            */
/* ------------------------------------------------------------------ */

function LivePlatformReadoutCard() {
  const { facts } = usePlatformDemo();
  return (
    <Section
      title="LIVE — Platform.OS / Platform.Version / PixelRatio"
      explanation="A live readout of the host running this bundle, straight from the RN Platform module + PixelRatio + Dimensions. Re-run this on an Android device and every value changes accordingly."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
          <Pill tone="primary" label="Platform.OS" value={String(facts.os)} />
          <Pill tone="success" label="Version" value={String(facts.version)} />
          <Pill tone="muted" label="PixelRatio" value={String(facts.pixelRatio)} />
          <Pill tone="muted" label="isTV" value={String(facts.isTV)} />
        </Box>
        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            WINDOW (Dimensions.get('window'))
          </Text>
          <KvRow k="width × height" v={facts.window.width + ' × ' + facts.window.height} />
          <KvRow k="scale / fontScale" v={facts.window.scale + ' / ' + facts.window.fontScale} />
        </Box>
        <Code>{`import { Platform, PixelRatio, Dimensions } from 'react-native';

export function platformFacts() {
  const win = Dimensions.get('window');
  return {
    os: Platform.OS,            // 'ios' | 'android' | 'web'
    version: Platform.Version,  // number on iOS, string on Android (API level)
    pixelRatio: PixelRatio.get(),
    isTV: Platform.isTV,
    window: { width: win.width, height: win.height, scale: win.scale },
  };
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. LIVE — Platform.select                                           */
/* ------------------------------------------------------------------ */

function PlatformSelectCard() {
  const { facts, example, toggle, setToggle } = usePlatformDemo();
  return (
    <Section
      title="LIVE — Platform.select"
      explanation="Platform.select takes a { ios, android, web } map and returns the value for the current platform. Below, the resolved label is the LIVE value for the OS running this bundle."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
            <Pill tone="primary" label="resolved" value={example} />
            <Pill tone="muted" label="for OS" value={String(facts.os)} />
          </Box>
          <Box row gap="sm" style={{ alignItems: 'center', marginTop: 8 }}>
            <Button
              title={toggle ? 'hide raw value' : 'show raw value'}
              variant={toggle ? 'filled' : 'ghost'}
              onPress={() => setToggle(!toggle)}
            />
            {toggle ? (
              <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                selectByPlatform returned: {example}
              </Text>
            ) : null}
          </Box>
        </Box>
        <Code>{`import { Platform } from 'react-native';

// The idiomatic one-liner — returns the value for the current platform.
const accent = Platform.select({
  ios: 'system blue',
  android: 'Material teal',
  web: 'CSS link blue',
});

// A thin pure wrapper (the one this screen uses), easy to unit-test by
// passing an explicit 'os' so each branch is reachable in jest:
export function selectByPlatform<T>(ios: T, android: T, web?: T, os = Platform.OS): T | undefined {
  if (os === 'ios') return ios;
  if (os === 'android') return android;
  if (os === 'web') return web;
  return undefined;
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. File extensions — the Metro resolution demo                      */
/* ------------------------------------------------------------------ */

function FileExtensionsCard() {
  const { resolvedMessage, resolvedGreeting, facts } = usePlatformDemo();
  return (
    <Section
      title="File extensions — .ios.tsx / .android.tsx / .native.tsx / .web.tsx"
      explanation="When you import a module without an extension, Metro (Expo's bundler) tries platform-specific suffixes first. This repo ships a real platform_message.ios.ts + platform_message.android.ts (+ a .ts fallback) right next to this view — the LIVE values below came from whichever one Metro picked for THIS bundle."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            RESOLVED AT RUNTIME (real Metro resolution)
          </Text>
          <KvRow k="import path" v="from './platform_message'" />
          <KvRow k="platformMessage" v={resolvedMessage} />
          <KvRow k="nativeGreeting" v={resolvedGreeting} />
          <Text variant="caption" tone="muted">
            On the device build this resolves to{' '}
            <Text style={{ fontFamily: 'monospace' }}>platform_message.ios.ts</Text> or{' '}
            <Text style={{ fontFamily: 'monospace' }}>.android.ts</Text>. In jest and on web
            the plain{' '}
            <Text style={{ fontFamily: 'monospace' }}>platform_message.ts</Text> carries the
            shared types + fallback value — so tsc and jest both resolve cleanly.
          </Text>
        </Box>
        <Code>{`// The import in platform_specific_hooks.ts (NO extension):
import { platformMessage, nativeGreeting } from './platform_message';

// Metro's resolution order on an iOS bundle:
//   1. platform_message.ios.ts    <- wins here
//   2. platform_message.native.ts <- would win if .ios absent
//   3. platform_message.ts        <- plain fallback (also used by tsc + jest)
//   4. platform_message.web.ts    <- never on an iOS build
//
// On Android the .android.ts sibling wins. The .ts sibling stays as the
// shared TYPES source (tsc resolves it) and the web fallback.`}</Code>
        <Box gap="xs">
          {EXTENSION_ROWS.map((r) => (
            <Box key={r.ext} p="sm" radius="sm" bg="surfaceVariant">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text variant="small" style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                  {r.ext}
                </Text>
                <Pill tone={r.ext === '.ios' || r.ext === '.android' ? 'success' : r.ext === '.native' ? 'primary' : 'muted'}>
                  {r.use}
                </Pill>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.note}
              </Text>
            </Box>
          ))}
        </Box>
        <Text variant="caption" tone="muted">
          Resolution order (highest priority first):{' '}
          <Text style={{ fontFamily: 'monospace' }}>.{String(facts.os)}</Text> &gt;{' '}
          <Text style={{ fontFamily: 'monospace' }}>.native</Text> &gt;{' '}
          <Text style={{ fontFamily: 'monospace' }}>.web</Text> (only on web builds) &gt; the
          plain extension. Two files with the SAME exported shape is what makes this safe —
          tsc checks them all independently.
        </Text>
      </Box>
    </Section>
  );
}

const EXTENSION_ROWS: ReadonlyArray<{ ext: string; use: string; note: string }> = [
  {
    ext: '.ios.ts(x)',
    use: 'iOS build',
    note: 'Used only on an iOS bundle. Put iOS-only APIs (UIKit constants, iOS-only native module calls) here.',
  },
  {
    ext: '.android.ts(x)',
    use: 'Android build',
    note: 'Used only on an Android bundle. Mirror the iOS file\'s exports exactly so the importer never sees a missing name.',
  },
  {
    ext: '.native.ts(x)',
    use: 'both native',
    note: 'iOS AND Android but NOT web. Handy for code that touches the RN bridge but is irrelevant under react-native-web.',
  },
  {
    ext: '.web.ts(x)',
    use: 'web only',
    note: 'Used under react-native-web. Lets you swap a native picker for an HTML <select> at the bundler layer — zero JS branching.',
  },
];

/* ------------------------------------------------------------------ */
/* 5. Conditional rendering — when to use which                        */
/* ------------------------------------------------------------------ */

function ConditionalRenderingCard() {
  return (
    <Section
      title="Conditional rendering — which escape hatch when"
      explanation="Three ways to be platform-specific, ranked by how much they diverge. Pick the smallest one that fits — overusing extension files hides branching and hurts navigation."
    >
      <Box gap="xs">
        {BRANCH_ROWS.map((r, i) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
            <Text variant="small" tone="primary" style={{ fontWeight: '700' }}>
              {i + 1}.
            </Text>
            <Box flex={1}>
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text variant="small" style={{ fontWeight: '600' }}>
                  {r.title}
                </Text>
                <Pill tone={r.pillTone}>{r.when}</Pill>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.body}
              </Text>
            </Box>
          </Box>
        ))}
        <Code>{`// 1. Inline value — one line, no branching ceremony.
const cornerRadius = Platform.select({ ios: 12, android: 8, web: 6 });

// 2. Inline render branch — small UI divergence.
{Platform.OS === 'ios' ? (
  <BlurView style={styles.header} />      // iOS-only native component
) : (
  <View style={[styles.header, { backgroundColor: colors.surface }]} />
)}

// 3. Extension file — whole implementation diverges. The import site stays
//    platform-agnostic; Metro swaps the file at bundle time.
import { HeaderBackground } from './header-background';
//    with header-background.ios.tsx + header-background.android.tsx as siblings.`}</Code>
      </Box>
    </Section>
  );
}

const BRANCH_ROWS: ReadonlyArray<{
  title: string;
  when: string;
  pillTone: 'success' | 'primary' | 'danger';
  body: string;
}> = [
  {
    title: 'Platform.select for a value',
    when: 'a single value differs',
    pillTone: 'success',
    body: 'A padding, a colour, a string. Reads better than a ternary and degrades gracefully (returns undefined for unlisted platforms).',
  },
  {
    title: 'Platform.OS === ... in JSX',
    when: 'a small render branch',
    pillTone: 'primary',
    body: 'Two genuinely different components for the same slot (e.g. a native blur vs a flat View). Keep the branch small and the surrounding layout identical.',
  },
  {
    title: 'Extension files (.ios / .android)',
    when: 'whole implementations diverge',
    pillTone: 'danger',
    body: 'A module whose internals are entirely different per platform (e.g. a bridge to a native SDK). The import site stays clean; Metro picks the file. Mirror the exported names EXACTLY across siblings.',
  },
];

/* ------------------------------------------------------------------ */
/* 6. Config plugins & native modules                                  */
/* ------------------------------------------------------------------ */

function ConfigPluginsCard() {
  return (
    <Section
      title="Config plugins & native modules — when JS is not enough"
      explanation="Sometimes no JS API exists (a 3rd-party SDK, a manifest change, a native permission string). Expo config plugins let you patch the native iOS Info.plist / Android build.gradle at build time from JS, and a custom dev build lets you add real native code."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Two layers, one decision
          </Text>
          <Text variant="small" tone="muted" mt="xxs">
            Config plugin = modify the native config files (Info.plist, AndroidManifest,
            gradle) at build time. Native module = real Swift/Kotlin code shipped in a custom
            dev build. Try a plugin first (no native code); reach for a module only when you
            need runtime behaviour JS cannot provide.
          </Text>
        </Box>
        <Code>{`// An Expo config plugin — JS that runs at 'eas build' time and patches
// the native project. WithInfoPlist / WithAppBuildGradle are the two most
// common entry points (from 'expo/config-plugins').
import { withInfoPlist, withAppBuildGradle } from 'expo/config-plugins';

export default function withCustomSetup(config) {
  // 1. iOS — add an Info.plist permission string.
  config = withInfoPlist(config, (c) => {
    c.modResults.NSLocationWhenInUseUsageDescription = 'We use your location to show nearby posts.';
    return c;
  });
  // 2. Android — flip a gradle flag at build time.
  config = withAppBuildGradle(config, (c) => {
    c.modResults.android.packagingOptions.jniLibs.useLegacyPackaging = false;
    return c;
  });
  return config;
}

// Register it in app.config.ts -> plugins: [withCustomSetup].
// No native code written; the change is applied when EAS regenerates the native project.`}</Code>
        <Box gap="xs">
          <Box p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              16 KB Android ELF alignment — this is where it is actioned
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              The flagged{' '}
              <Text style={{ fontFamily: 'monospace' }}>.so</Text> files (libhermes,
              libreactnative, …) ship inside native binaries and cannot be realigned from JS.
              The fix is a{' '}
              <Text style={{ fontFamily: 'monospace' }}>withAppBuildGradle</Text> plugin (or a
              custom dev / EAS build) on AGP 8.5.1+ with NDK r27+ and{' '}
              <Text style={{ fontFamily: 'monospace' }}>useLegacyPackaging = false</Text>. This
              is covered in the "Production build &amp; deployment" topic — currently a warning
              only (targetSdk &lt; 35); becomes a hard install block at targetSdk &ge; 35.
            </Text>
          </Box>
          <Box p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              When to move off Expo Go
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              Expo Go bundles a fixed set of native modules — anything outside that surface (a
              config plugin that adds native code, a 3rd-party SDK, the 16 KB alignment fix)
              requires a custom{' '}
              <Text style={{ fontFamily: 'monospace' }}>development</Text> build (EAS profile{' '}
              <Text style={{ fontFamily: 'monospace' }}>developmentClient: true</Text>) or a
              full EAS build. See the Native Device Features screen for the Expo-Go-vs-dev-build
              matrix.
            </Text>
          </Box>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Pitfalls                                                         */
/* ------------------------------------------------------------------ */

function PitfallsCard() {
  return (
    <Section
      title="Platform pitfalls — do / avoid"
      explanation="The common ways platform-specific code goes wrong. Most boil down to branching in too many places or testing only the platform you develop on."
    >
      <Box gap="xs">
        {PITFALL_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              {r.kind === 'do' ? (
                <Pill tone="success">do</Pill>
              ) : (
                <Pill tone="danger">avoid</Pill>
              )}
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.title}
              </Text>
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

const PITFALL_ROWS: ReadonlyArray<{ kind: 'do' | 'avoid'; title: string; body: string }> = [
  {
    kind: 'do',
    title: 'Test both Platform.OS branches',
    body: 'Platform.OS defaults to \'ios\' under jest-expo. Mock or spy it (jest.spyOn(Platform, \'OS\', \'get\').mockReturnValue(\'android\')) to exercise the android branch — a single-platform test suite hides half your conditionals.',
  },
  {
    kind: 'do',
    title: 'Keep extension-file exports symmetric',
    body: 'A .ios.ts and .android.ts pair must export the SAME names with the SAME types. The importer is platform-agnostic; a missing name on one platform is a crash, not a type error (tsc resolves the .ts sibling).',
  },
  {
    kind: 'avoid',
    title: 'User-Agent string sniffing',
    body: 'Detecting iOS/Android by parsing navigator.userAgent is a web anti-pattern that is doubly wrong in RN — Platform.OS is authoritative and free. Reserve UA sniffing (if ever) for react-native-web browser quirks, not native platform detection.',
  },
  {
    kind: 'avoid',
    title: 'Blocking the JS thread with platform checks',
    body: 'Platform.OS / Platform.select are cheap synchronous reads — do not memoise or cache them in state. Conversely, do not run heavy native sync calls inline; the native bridge is asynchronous, and a long call stalls the JS thread on both platforms.',
  },
  {
    kind: 'avoid',
    title: 'Branching scattered across the UI',
    body: 'If you are writing the same Platform.OS === ... check in five components, the divergence is structural — promote it to an extension file or a single platform-aware primitive so the branching lives in one place.',
  },
];

/* ------------------------------------------------------------------ */
/* shared small helpers                                                */
/* ------------------------------------------------------------------ */

function KvRow({ k, v }: { k: string; v: string }) {
  return (
    <Box row gap="sm" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Text variant="caption" tone="muted" style={{ fontWeight: '600', minWidth: 132 }}>
        {k}
      </Text>
      <Text variant="small" style={{ fontFamily: 'monospace', flexShrink: 1 }}>
        {v}
      </Text>
    </Box>
  );
}
