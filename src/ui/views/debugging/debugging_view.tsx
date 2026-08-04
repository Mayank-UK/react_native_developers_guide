import { Pressable, View } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Text, useTheme } from '../../design-system';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import type { Palette } from '../../design-system/tokens';
import { Section, Code, Pill } from '../../components';
import {
  LEVEL_FILTERS,
  LEVEL_TONE,
  useLoggerPanel,
  useScenarioKnob,
  useElementInspector,
} from './debugging_hooks';

/**
 * DebuggingView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (debugging_hooks.ts); this file only renders.
 *
 * Teaching artifact for how debugging is done in React Native (2026 standard),
 * grounded in THIS app's real debug aids: the structured Logger
 * (`core/config/logger.ts`), the dev scenario knobs (`core/scenario/*`), the
 * error pipeline's `Failure.chain`, and the design-system tokens the element
 * inspector reads. External tool NAMES (React Native DevTools, React DevTools
 * Profiler, VS Code debugger, network/storage inspectors) are prose — accurate
 * for 2026.
 *
 * `useTheme` (design-system context, no state) is kept in the view per the
 * exemplar's presentational exception. Single-file helpers stay local per
 * convention. No `any`; strict + erasure-clean.
 */
export function DebuggingView() {
  return (
    <ScreenScaffold
      title="Debugging"
      subtitle="The 2026 RN toolkit, plus this app's own debug aids — live."
    >
      <IntroCard />
      <ToolingLandscapeCard />
      <LoggerCard />
      <ScenarioKnobCard />
      <FailureChainCard />
      <JsDebuggerCard />
      <ElementInspectorCard />
      <NetworkStorageCard />
      <PerformanceCard />
      <PitfallsCard />
      <RecapCard />
    </ScreenScaffold>
  );
}
function IntroCard() {
  return (
    <Section title="Debugging React Native">
      <Text variant="body">
        RN debugging in 2026 is unified under{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          React Native DevTools
        </Text>{' '}
        — the built-in, Chrome-DevTools-compatible toolkit shipped with RN
        itself. Flipper is deprecated for new RN and removed from the bridge.
        On top of that, this app ships its own in-app debug aids — a structured
        logger, dev scenario knobs, and the error pipeline's chained failures —
        which are the things you reach for first, without leaving the device.
      </Text>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          <Text style={{ fontWeight: '600' }}>Two layers of debugging.</Text>{' '}
          Layer 1: the platform toolkit (DevTools, breakpoints, profiler) — for
          inspecting what your code does. Layer 2: in-app instrumentation (logs,
          scenario knobs, failure chains) — for seeing what your architecture
          does in real time. This screen covers both, and ships the in-app ones
          live.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Tooling landscape (prose; 2026-accurate)                         */
/* ------------------------------------------------------------------ */

function ToolingLandscapeCard() {
  return (
    <Section
      title="The 2026 tooling landscape"
      explanation="Open the dev menu (shake the device, or press `j` in the Expo dev server terminal) to reach React Native DevTools. Each tool below is the standard — note what replaces the deprecated Flipper."
    >
      <Box gap="xs">
        {TOOLS_ROWS.map((t) => (
          <Box key={t.name} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {t.name}
              </Text>
              {t.status === 'deprecated' ? (
                <Pill tone="danger">deprecated</Pill>
              ) : (
                <Pill tone="success">standard</Pill>
              )}
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {t.note}
            </Text>
          </Box>
        ))}
      </Box>
      <Text variant="caption" tone="muted">
        Expo SDK 53 (this app) supports React Native DevTools out of the box. With
        Expo Go / a dev build, run{' '}
        <Text style={{ fontFamily: 'monospace' }}>npx expo start</Text> and press{' '}
        <Text style={{ fontFamily: 'monospace' }}>j</Text> in the terminal to open
        the JS Inspector, or <Text style={{ fontFamily: 'monospace' }}>shift+m</Text>{' '}
        to open the dev menu on the device.
      </Text>
    </Section>
  );
}

const TOOLS_ROWS: ReadonlyArray<{ name: string; status: 'standard' | 'deprecated'; note: string }> = [
  {
    name: 'React Native DevTools',
    status: 'standard',
    note: 'The built-in Chrome-DevTools-based toolkit (RN 0.73+). Inspector (layout/style), Network, Console, Sources (breakpoints), and Memory. This is the replacement for Flipper. Reach it from the dev menu.',
  },
  {
    name: 'React DevTools (standalone)',
    status: 'standard',
    note: 'npx react-devtools — the component tree + the Profiler. Connects to RN the same way it connects to React web. Use the Profiler to find unnecessary re-renders.',
  },
  {
    name: 'Expo dev menu + JS Inspector',
    status: 'standard',
    note: 'Expo\'s own dev menu (shake device or shift+m) and its JS Inspector integrate with React Native DevTools. EAS Update debugging (OTA bundles) lives here too.',
  },
  {
    name: 'Element inspector',
    status: 'standard',
    note: 'Toggle inspector from the dev menu (or `toggleElementInspector`). Tap any element to overlay its box model, computed style, and props — exactly what the live demo below mirrors in-app.',
  },
  {
    name: 'Chrome "Debug JS Remotely"',
    status: 'deprecated',
    note: 'The old remote-JS-in-Chrome flow. Superseded by React Native DevTools (which reuses Chrome DevTools Protocol but against the on-device engine). Avoid for new work.',
  },
  {
    name: 'Flipper',
    status: 'deprecated',
    note: 'Meta deprecated Flipper for RN; the bridge was removed. Its network/layout/database plugins are now native panels inside React Native DevTools or dedicated libraries.',
  },
];

/* ------------------------------------------------------------------ */
/* 3. LIVE — log/console panel mirroring logger.ts                     */
/* ------------------------------------------------------------------ */

function LoggerCard() {
  const { log, clear, filter, setFilter, visible } = useLoggerPanel();

  return (
    <Section
      title="LIVE — log/console panel (mirrors core/config/logger.ts)"
      explanation="The app's Logger keeps a name tag (the active env) and routes by severity — see logger.ts. This panel mirrors that: tap a level to emit a log line, then filter by minimum severity. Real Logger output also lands in the React Native DevTools Console."
    >
      <Box gap="sm">
        <Code>{`// core/config/logger.ts — the format this panel mirrors:
//   \`[\${name}] \${LEVEL.toUpperCase()}: \${message}\`
// Routed by severity: error → console.error, warning → console.warn, else log.
// enableLogs=false raises the floor to 'error' only (prod-quiet).`}</Code>

        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="debug" variant="ghost" onPress={() => log('debug', 'dev', 'rendered PostsScreen')} />
          <Button title="info" variant="outline" onPress={() => log('info', 'dev', 'fetched 3 posts')} />
          <Button title="warning" variant="outline" onPress={() => log('warning', 'dev', 'served stale cache (network failed)')} />
          <Button title="error" variant="filled" onPress={() => log('error', 'dev', 'getPosts failed: NetworkFailure')} />
        </Box>

        <Box row gap="xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Text variant="caption" tone="muted">
            min level:
          </Text>
          {LEVEL_FILTERS.map((l) => (
            <Button key={l} title={l} variant={filter === l ? 'filled' : 'ghost'} onPress={() => setFilter(l)} />
          ))}
          <Button title="clear" variant="ghost" onPress={clear} />
        </Box>

        <Box p="sm" radius="md" bg="background" gap="xxs">
          {visible.length === 0 ? (
            <Text variant="caption" tone="muted">
              no entries — emit one above…
            </Text>
          ) : (
            visible.map((e) => (
              <Box key={e.id} row gap="sm" style={{ alignItems: 'baseline' }}>
                <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
                  {e.at}
                </Text>
                <Pill tone={LEVEL_TONE[e.level]}>{e.level}</Pill>
                <Text variant="caption" style={{ fontFamily: 'monospace', flexShrink: 1 }}>
                  [{e.tag}] {e.message}
                </Text>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. LIVE — scenario knobs forcing error paths                        */
/* ------------------------------------------------------------------ */

function ScenarioKnobCard() {
  const { state, entries, clear, run } = useScenarioKnob();

  return (
    <Section
      title="LIVE — scenario knobs: force the error paths"
      explanation="The real container exposes dev knobs (setApiScenario/setDbScenario) that the FakeApiService + FakeAppDatabase honour. Pick a path — the usePosts hook re-fetches through the real pipeline and the log captures each transition. This is how you debug a failure path without a failing server."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="success" variant="filled" onPress={() => run(ApiScenario.Success, DbScenario.Success, 'happy path')} />
          <Button title="offline → stale" variant="outline" onPress={() => run(ApiScenario.NetworkError, DbScenario.Success, 'non-blocking warning')} />
          <Button title="offline → empty" variant="outline" onPress={() => run(ApiScenario.NetworkError, DbScenario.Empty, 'blocking failure')} />
          <Button title="cache read fails" variant="outline" onPress={() => run(ApiScenario.NetworkError, DbScenario.ReadError, 'chained failure')} />
          <Button title="server 5xx" variant="ghost" onPress={() => run(ApiScenario.ServerError, DbScenario.Empty, 'server error')} />
          <Button title="timeout" variant="ghost" onPress={() => run(ApiScenario.Timeout, DbScenario.Empty, 'timeout')} />
        </Box>

        <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Pill tone={state.status === 'error' ? 'danger' : state.status === 'loaded' ? 'success' : 'primary'}>
            state: {state.status}
          </Pill>
          {'posts' in state ? <Pill>{`${state.posts.length} posts`}</Pill> : null}
          {'warning' in state && state.warning ? (
            <Pill tone="danger">{`warning: ${state.warning.kind}`}</Pill>
          ) : null}
          {'failure' in state ? (
            <Pill tone="danger">{`failure: ${state.failure.kind} · ${state.failure.severity}`}</Pill>
          ) : null}
        </Box>

        <Box p="sm" radius="md" bg="background" gap="xxs">
          {entries.length === 0 ? (
            <Text variant="caption" tone="muted">
              tap a scenario to drive the pipeline + log each transition…
            </Text>
          ) : (
            entries.slice(-6).map((e) => (
              <Box key={e.id} row gap="sm" style={{ alignItems: 'baseline' }}>
                <Pill tone={LEVEL_TONE[e.level]}>{e.level}</Pill>
                <Text variant="caption" style={{ fontFamily: 'monospace', flexShrink: 1 }}>
                  {e.message}
                </Text>
              </Box>
            ))
          )}
        </Box>

        <Box row gap="xs">
          <Button title="clear log" variant="ghost" onPress={clear} />
        </Box>

        <Code>{`// The dev knobs the buttons above drive (see core/container.ts):
container.setApiScenario(ApiScenario.NetworkError);
container.setDbScenario(DbScenario.Empty);
// → the next usePosts fetch runs the REAL repository against the fakes,
//   which honour the scenario. Failure paths become reproducible + offline.`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Failure.chain — reconstructing cause                             */
/* ------------------------------------------------------------------ */

function FailureChainCard() {
  return (
    <Section
      title="Errors & stack traces — Failure.chain"
      explanation="The error pipeline preserves the whole cause chain so a compound failure reads end-to-end. Tie-in: see the Exception Handling screen for the two-stage AppException → Failure mapping."
    >
      <Code>{`// core/error-handling/failures.ts — both AppException.cause and Failure.cause chain.
class Failure {
  get chain(): string {
    const parts = [this.rawMessage];
    let current = this.cause;
    while (current) {
      parts.push('  → caused by: ' + current.rawMessage);
      current = current.cause;
    }
    return parts.join('\\n');
  }
}

// A real offline-first compound failure (network down → cache also failed):
//   CacheFailure("No cached data available")
//     → caused by: NetworkFailure("No internet connection")
// Both .message (joined) and .chain (multiline) reconstruct the story for logs.`}</Code>
      <Text variant="caption" tone="muted">
        When you log a failure, log <Text style={{ fontFamily: 'monospace' }}>failure.chain</Text>{' '}
        (the full trace), not just <Text style={{ fontFamily: 'monospace' }}>.message</Text>. The chain is
        what tells you the cache failed <Text style={{ fontStyle: 'italic' }}>because</Text> the network
        failed — the part that actually points at the fix.
      </Text>
      <Text variant="caption" tone="muted">
        Stack traces for native/JS errors flow into the React Native DevTools
        Console with source-mapped locations (see the JS debugger card below).
        For production crashes, you'd attach a reporter (Sentry/Bugsnag) at the{' '}
        <Text style={{ fontFamily: 'monospace' }}>Logger</Text> seam — the
        abstraction boundary stays the same.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. JS debugger — Chrome / VS Code / breakpoints / source maps       */
/* ------------------------------------------------------------------ */

function JsDebuggerCard() {
  return (
    <Section
      title="JS debugger — breakpoints & source maps"
      explanation="React Native DevTools (Chrome DevTools Protocol against the on-device engine) is the 2026 default. For editor-native debugging, VS Code attaches directly."
    >
      <Box gap="xs">
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            React Native DevTools (recommended)
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            Run the app, open the dev menu, choose "Open React Native DevTools".
            The Sources panel lets you set breakpoints, pause on exceptions,
            watch expressions, and step — against the REAL engine Hermes runs on
            device. Source maps resolve your TypeScript/JSX back to the original.
          </Text>
        </Box>
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            VS Code
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            Install the "Expo Tools" VS Code extension, then use the launch
            configuration that attaches to the bundler. Set breakpoints inline in
            your editor; they hit when the device executes that line. No
            "Debug JS Remotely" toggle needed.
          </Text>
        </Box>
      </Box>
      <Code>{`// A breakpoint is just a place where execution pauses. In code you can:
//   debugger;   // pauses if a debugger is attached (avoid in prod!)
// The DevTools Sources panel does the same without editing code.

// Source maps: Metro generates them automatically. Your .ts/.tsx lines map
// 1:1 to runtime stack frames, so a breakpoint IN your source hits at the
// right moment even though the device runs transformed JS.`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. LIVE — element inspector (tap a card → computed tokens)         */
/* ------------------------------------------------------------------ */

interface InspectableStyle {
  label: string;
  bg: keyof Palette;
  radius: 'sm' | 'md' | 'lg' | 'xl';
  p: 'sm' | 'md' | 'lg';
  border?: boolean;
}

const INSPECTABLES: ReadonlyArray<InspectableStyle> = [
  { label: 'Surface Card', bg: 'surface', radius: 'lg', p: 'md', border: true },
  { label: 'Primary Tile', bg: 'primary', radius: 'md', p: 'lg' },
  { label: 'Soft Block', bg: 'surfaceVariant', radius: 'sm', p: 'sm', border: true },
];

function ElementInspectorCard() {
  const { theme, mode } = useTheme();
  const { selected, setSelected } = useElementInspector();
  const s = INSPECTABLES[selected]!;

  return (
    <Section
      title="LIVE — element inspector (tap a card → computed tokens)"
      explanation="The RN element inspector overlays a tapped element's box model + style. This is the in-app analogue: tap a tile, read the resolved design-system tokens behind it (the exact values StyleSheet consumed). Toggle the system theme to see token values change."
    >
      <Box gap="sm">
        <Box gap="xs">
          {INSPECTABLES.map((it, i) => {
            const isSel = i === selected;
            return (
              <Pressable key={it.label} onPress={() => setSelected(i)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View
                  style={{
                    backgroundColor: theme.colors[it.bg],
                    borderRadius: theme.radii[it.radius],
                    padding: theme.spacing[it.p],
                    borderWidth: it.border ? 1 : 0,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
                    <Text
                      variant="small"
                      tone={it.bg === 'primary' ? 'onPrimary' : 'default'}
                      style={{ fontWeight: '600' }}
                    >
                      {it.label}
                    </Text>
                    {isSel ? (
                      <Pill tone="primary">inspecting</Pill>
                    ) : (
                      <Text variant="caption" tone="muted">
                        tap to inspect
                      </Text>
                    )}
                  </Box>
                </View>
              </Pressable>
            );
          })}
        </Box>

        <Box p="sm" radius="md" bg="background">
          <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
            <Text variant="small" style={{ fontWeight: '600' }}>
              Computed style
            </Text>
            <Pill>{`theme: ${mode}`}</Pill>
          </Box>
          <Box gap="xxs" mt="xs">
            <KvRow k="backgroundColor" v={`colors.${s.bg} → ${theme.colors[s.bg]}`} />
            <KvRow k="borderRadius" v={`radii.${s.radius} → ${theme.radii[s.radius]}px`} />
            <KvRow k="padding" v={`spacing.${s.p} → ${theme.spacing[s.p]}px`} />
            <KvRow k="borderWidth" v={s.border ? '1px (border token)' : '0 (none)'} />
            <KvRow k="borderColor" v={s.border ? theme.colors.border : '—'} />
          </Box>
        </Box>
        <Text variant="caption" tone="muted">
          This is exactly what the platform element inspector shows for a styled{' '}
          <Text style={{ fontFamily: 'monospace' }}>View</Text>. Resolved tokens
          beat magic numbers: when you tune{' '}
          <Text style={{ fontFamily: 'monospace' }}>tokens.ts</Text>, every screen
          follows. Toggle the system theme (the hub's header button) and re-open
          this screen — the values swap with it.
        </Text>
      </Box>
    </Section>
  );
}

function KvRow({ k, v }: { k: string; v: string }) {
  return (
    <Box row gap="sm" style={{ alignItems: 'baseline' }}>
      <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
        {k}
      </Text>
      <Text variant="caption" style={{ fontFamily: 'monospace', flexShrink: 1 }}>
        {v}
      </Text>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Network + async storage inspection                               */
/* ------------------------------------------------------------------ */

function NetworkStorageCard() {
  return (
    <Section
      title="Network & async-storage inspection"
      explanation="Two things you inspect constantly during data-layer debugging. Both have native panels now (no Flipper)."
    >
      <Box gap="xs">
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Network
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            React Native DevTools ships a Network panel: every{' '}
            <Text style={{ fontFamily: 'monospace' }}>fetch</Text> (this app's HTTP
            engine — see <Text style={{ fontFamily: 'monospace' }}>data/remote/http-client.ts</Text>),
            with URL, status, headers, body, timing. For the interceptor pipeline
            (auth/retry/failure-injection), this is where you watch a request flow
            through each stage. The dev ApiScenario knobs (above) inject failures
            here on demand.
          </Text>
        </Box>
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Async Storage
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            The DAO (<Text style={{ fontFamily: 'monospace' }}>data/local/daos/post-dao.ts</Text>)
            serializes the posts collection to AsyncStorage behind a key. Inspect
            it with <Text style={{ fontFamily: 'monospace' }}>@react-native-async-storage/devtools</Text>{' '}
            (a community panel) or simply log get-all-keys in dev. In tests, the
            in-memory mock (<Text style={{ fontFamily: 'monospace' }}>jest.mocks.ts</Text>)
            gives you the same visibility deterministically.
          </Text>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Performance profiling                                             */
/* ------------------------------------------------------------------ */

function PerformanceCard() {
  return (
    <Section
      title="Performance profiling"
      explanation="The React DevTools Profiler (npx react-devtools) records a flamegraph of every render. The goal: render less, and render cheaper."
    >
      <Box gap="xs">
        {PERF_ROWS.map((p) => (
          <Box key={p.title} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {p.title}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {p.body}
            </Text>
          </Box>
        ))}
      </Box>
      <Code>{`// This app's performance choices (see ARCHITECTURE.md + use-posts.ts):
//   useReducer for explicit state transitions (no nested-setState soup)
//   useMemo on the hook return so consumers get a stable object
//   cancelled flag on async fetch → no setState after unmount
//   StyleSheet.create (NOT inline objects on hot paths) → stable refs
//
// Profiling recipe:
//   1. npx react-devtools
//   2. open the Profiler, press Record, exercise the screen, Stop.
//   3. read the flamegraph — wide bars are slow renders; a bar that
//      re-renders on every parent update is a memoization opportunity.`}</Code>
    </Section>
  );
}

const PERF_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'React DevTools Profiler',
    body: 'Records each commit and shows which components rendered and why. The "Why did this render?" panel catches missing memoization.',
  },
  {
    title: 'List virtualization',
    body: 'For long lists use FlatList/FlashList (virtualized) — never map an array of 1000 rows into 1000 Views. See the live FlatList on the Layout screen.',
  },
  {
    title: 'Avoid re-renders',
    body: 'Stable references: useCallback for handlers passed down, useMemo for computed values, React.memo for pure children. The cancelled-flag in usePosts prevents the stale-setState warning.',
  },
  {
    title: 'Off-main-thread work',
    body: 'Heavy parse/sort on large data → consider moving off the JS thread (react-native-worklets, native modules). Measure first; do not guess.',
  },
];

/* ------------------------------------------------------------------ */
/* 10. Common pitfalls                                                 */
/* ------------------------------------------------------------------ */

function PitfallsCard() {
  return (
    <Section
      title="Common pitfalls (cross-ref: Lifecycle screen)"
      explanation="The bugs that bite RN developers most. Each maps to a lifecycle/effect gotcha covered on the Lifecycle screen."
    >
      <Box gap="xs">
        {PITFALL_ROWS.map((p) => (
          <Box key={p.title} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {p.title}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {p.body}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

const PITFALL_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'StrictMode double-invoke (dev)',
    body: 'In dev, effects mount/unmount/remount to surface bugs. Your cleanup must be idempotent — the cancelled flag in usePosts and the timer cleanups on the Lifecycle screen handle this. Production runs single.',
  },
  {
    title: 'Stale closures',
    body: 'A callback captures state at creation time. If it references state but is not in the dep array, it reads stale values. Fix with the dep array, or useRef for the latest value. The Profiler + breakpoints catch these.',
  },
  {
    title: 'Missing effect cleanup',
    body: 'An interval/listener you started but never cleaned up leaks across unmount, firing setState on an unmounted component. The cleanup return from useEffect is the fix (see the Timer demo on the Lifecycle screen).',
  },
  {
    title: 'setState on unmounted component',
    body: 'An async resolve that dispatches after navigation away. The cancelled-flag pattern (usePosts) silences it correctly — better than a wrapper that swallows the warning.',
  },
  {
    title: 'Inline styles / new objects',
    body: 'An object literal in render (style={{...}}) is a new reference each render → defeats memoization. Use StyleSheet.create at module scope (this app does everywhere) and pass stable ids.',
  },
];

/* ------------------------------------------------------------------ */
/* 11. Recap                                                           */
/* ------------------------------------------------------------------ */

function RecapCard() {
  return (
    <Section
      title="Recap — debugging in one breath"
      explanation="Five takeaways. The first tool you reach for is usually in-app; the platform toolkit is one level up."
    >
      <Box gap="xs">
        {RECAP_ROWS.map((r, i) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
            <Text variant="small" tone="primary" style={{ fontWeight: '700' }}>
              {i + 1}.
            </Text>
            <Box flex={1}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.title}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.body}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

const RECAP_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'React Native DevTools is the 2026 default',
    body: 'Inspector, Network, Console, Sources, Memory — built into RN. Flipper and "Debug JS Remotely" are deprecated.',
  },
  {
    title: 'Instrument in-app first',
    body: 'The structured Logger, the dev scenario knobs, and Failure.chain let you reproduce + read failures without leaving the device. This screen ships all three live.',
  },
  {
    title: 'Set breakpoints against the real engine',
    body: 'React Native DevTools or VS Code (Expo Tools) hit your TS source via Metro source maps. No debugger; statement needed.',
  },
  {
    title: 'Profile before you optimize',
    body: 'React DevTools Profiler shows the commit flamegraph and "why did this render". Memoize where the profiler points, not where you guess.',
  },
  {
    title: 'Log failure.chain, not just message',
    body: 'The compound cause (cache failed because network failed) is the part that points at the fix. The error pipeline preserves it; use it.',
  },
];
