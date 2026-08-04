import { ScreenScaffold } from '../../components/screen-scaffold';
import { Section, Code, Pill } from '../../components';
import { Box, Text } from '../../design-system';
import {
  appStateLabel,
  backgroundExecutionMatrix,
  useActivePulse,
  useAppStateLog,
  type AppStateValue,
  type BackgroundPlatform,
} from './app_state_hooks';

/**
 * AppStateView — a dumb structure. All state/behaviour lives in the co-located
 * hooks (app_state_hooks.ts); this file only renders.
 *
 * Teaching artifact for the OS-level app lifecycle: `AppState`, the JS-thread
 * freeze on background, and the platform-specific limits of background
 * execution (iOS BGTaskScheduler / Android WorkManager + Foreground Services).
 * `AppState` is a `react-native` built-in — no extra deps for the core. The
 * `expo-task-manager` / `expo-background-fetch` excerpts are illustrative
 * `<Code>` only (those packages are NOT installed in this app).
 *
 * No `any`; strict + erasure-clean. Inside `<Code>{`...`}</Code> there are no
 * nested template literals (no `${` parse trap).
 */
export function AppStateView() {
  return (
    <ScreenScaffold
      title="App State & Backgrounding"
      subtitle="AppState, the JS-thread freeze, and the limits of background execution."
    >
      <IntroCard />
      <AppStateValuesCard />
      <LiveAppStateLogCard />
      <JsFreezeCard />
      <BackgroundLimitsCard />
      <RealBackgroundWorkCard />
      <PersistAcrossTerminationCard />
      <TestingPitfallsCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Component lifecycle vs OS app lifecycle                         */
/* ------------------------------------------------------------------ */

function IntroCard() {
  return (
    <Section
      title="Component lifecycle vs OS app lifecycle"
      explanation="This screen covers the OS-level lifecycle — when the whole app is foregrounded, backgrounded, suspended or killed. That is distinct from the React component lifecycle (mount/update/unmount), which is taught on the Lifecycle screen."
    >
      <Box gap="sm">
        <Text variant="body">
          Two different lifecycles run at once.{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            React component lifecycle
          </Text>{' '}
          is in-process: React decides when your component mounts, re-renders
          and unmounts (see the Lifecycle screen).{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            OS app lifecycle
          </Text>{' '}
          is one level up: the operating system decides when the entire app
          process is visible, hidden, suspended and killed — and your JS thread
          runs (or freezes) accordingly.
        </Text>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" tone="muted">
            The single bridge between the two is{' '}
            <Text style={{ fontFamily: 'monospace' }}>AppState</Text>. It is a
            native module built into{' '}
            <Text style={{ fontFamily: 'monospace' }}>react-native</Text> that
            emits a string whenever the OS transitions the app between its
            three states. No extra dependency is required for this core
            behaviour.
          </Text>
        </Box>
        <Text variant="caption" tone="muted">
          Cross-link: the Lifecycle screen demonstrates{' '}
          <Text style={{ fontFamily: 'monospace' }}>useEffect</Text> mount/
          update/cleanup and an{' '}
          <Text style={{ fontFamily: 'monospace' }}>AppState</Text> demo card —
          this screen is the OS-level counterpart to that one.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The three AppState values                                       */
/* ------------------------------------------------------------------ */

const VALUE_ROWS: ReadonlyArray<{
  value: AppStateValue;
  trigger: string;
}> = [
  {
    value: 'active',
    trigger:
      'The app is in the foreground and receiving input — the normal running state.',
  },
  {
    value: 'inactive',
    trigger:
      'iOS-only transient: the Control Center / Notification Center is being pulled down, or a system dialog is covering the app. Android does not report this state.',
  },
  {
    value: 'background',
    trigger:
      'The app is hidden (user switched away, pressed Home, or locked the device). The JS thread is about to be suspended.',
  },
];

function AppStateValuesCard() {
  return (
    <Section
      title="The three AppState values"
      explanation="AppState.currentState is one of three strings. Each is triggered by a concrete OS event — the table below maps the value to what just happened at the OS level."
    >
      <Box gap="xs">
        {VALUE_ROWS.map((r) => (
          <Box key={r.value} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Pill tone="primary" value={r.value} />
              <Text variant="small" style={{ fontWeight: '600' }}>
                {appStateLabel(r.value)}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.trigger}
            </Text>
          </Box>
        ))}
        <Text variant="caption" tone="muted">
          On <Text style={{ fontFamily: 'monospace' }}>react-native-web</Text>,{' '}
          <Text style={{ fontFamily: 'monospace' }}>AppState</Text> is mapped to
          the Page Visibility API, so the same subscription works in a browser
          tab. On native, these are the real OS transitions.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. LIVE event log                                                  */
/* ------------------------------------------------------------------ */

function LiveAppStateLogCard() {
  const { current, log } = useAppStateLog();
  return (
    <Section
      title="AppState — LIVE event log"
      explanation="Background the app and bring it back (in Expo Go on a device). Each transition is appended here as it fires, via the real AppState.addEventListener subscription below."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            current
          </Text>
          <Pill tone={current === 'active' ? 'success' : 'default'} value={current ?? '—'} />
          {current ? (
            <Text variant="caption" tone="muted">
              {appStateLabel(current)}
            </Text>
          ) : null}
        </Box>
        <Box gap="xs">
          {log.length === 0 ? (
            <Text variant="caption" tone="muted">
              No transitions yet. Switch apps / lock the device to populate this
              log. (Under jest, the AppState spy fires transitions in the spec.)
            </Text>
          ) : (
            log.map((e) => (
              <Box key={e.id} p="sm" radius="sm" bg="surfaceVariant" row gap="sm" style={{ alignItems: 'center' }}>
                <Pill tone={e.state === 'active' ? 'success' : 'default'} value={e.state} />
                <Box flex={1}>
                  <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
                    {e.at}
                  </Text>
                </Box>
                <Text variant="caption" tone="muted">
                  {appStateLabel(e.state)}
                </Text>
              </Box>
            ))
          )}
        </Box>
        <Code>{`// src/ui/views/app_state/app_state_hooks.ts
import { AppState } from 'react-native';

export function useAppStateLog(max = 8) {
  const [current, setCurrent] = useState<AppStateValue | null>(
    () => AppState.currentState as AppStateValue,
  );
  const [log, setLog] = useState<AppStateLogEntry[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    // addEventListener returns a subscription; .remove() tears it down.
    const sub = AppState.addEventListener('change', (next) => {
      const id = idRef.current;          // read id OUTSIDE the updater
      idRef.current += 1;                // (StrictMode double-invokes updaters)
      const entry = { id, at: new Date().toISOString(), state: next };
      setCurrent(next);                  // setState in the EVENT CALLBACK,
      setLog((prev) => [entry, ...prev].slice(0, max));  // not inside setLog
    });
    return () => sub.remove();           // cleanup on unmount
  }, [max]);

  return { current, log };
}`}</Code>
        <Text variant="caption" tone="muted">
          The subscription is created in a{' '}
          <Text style={{ fontFamily: 'monospace' }}>useEffect</Text> and removed
          in its cleanup return — the standard subscribe-on-mount,
          unsubscribe-on-unmount pattern. Note the React-19-safe guard: the id
          is read from a ref OUTSIDE the{' '}
          <Text style={{ fontFamily: 'monospace' }}>setLog</Text> updater so
          that updater stays pure.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. The JS thread freezes when backgrounded                         */
/* ------------------------------------------------------------------ */

function JsFreezeCard() {
  const { ticks, active } = useActivePulse();
  return (
    <Section
      title="The JS thread freezes when backgrounded"
      explanation="This counter increments every second via setInterval while the app is foregrounded. Background the app, wait a few seconds, then return — you will see it skipped those ticks. That is the OS suspending your JS thread, not your code."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            ticks
          </Text>
          <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '700' }}>
            {ticks}
          </Text>
          <Pill tone={active ? 'success' : 'default'} value={active ? 'active' : 'frozen'} />
        </Box>
        <Text variant="body">
          React Native is single-threaded for JS. When the OS backgrounds the
          app it suspends the JS thread (and React's renderer with it), so{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            timers, network callbacks, and pending{' '}
            <Text style={{ fontFamily: 'monospace' }}>setState</Text>s do not
            fire
          </Text>{' '}
          until the app is foregrounded again. They are not lost — pending
          timers fire in burst on resume — but nothing runs while suspended.
        </Text>
        <Code>{`// The interval keeps running across background/foreground on purpose.
// It is NOT gated on AppState — the JS thread freezing is what stops the
// ticks, which is exactly the behaviour to observe.
useEffect(() => {
  const sub = AppState.addEventListener('change', setActive);
  const id = setInterval(() => setTicks((t) => t + 1), 1000);
  return () => {
    sub.remove();
    clearInterval(id);   // unmount clears it (jest smoke test calls unmount)
  };
}, []);`}</Code>
        <Text variant="caption" tone="muted">
          Consequence: any in-flight{' '}
          <Text style={{ fontFamily: 'monospace' }}>fetch</Text> or{' '}
          <Text style={{ fontFamily: 'monospace' }}>setTimeout</Text> you
          expect to fire while backgrounded is unreliable. If work must finish,
          you need the platform background-task APIs in the section below.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Background execution limits — per-platform matrix               */
/* ------------------------------------------------------------------ */

function BackgroundLimitsCard() {
  const rows = backgroundExecutionMatrix();
  return (
    <Section
      title="Background tasks — the limits"
      explanation="Background execution is NOT a Node daemon. The OS aggressively suspends your JS to save battery, and the escape hatches are platform-specific, time-limited, and per-app-configurable."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Pill tone="primary" label="iOS" value="BGTaskScheduler" />
          <Pill tone="primary" label="Android" value="WorkManager / Foreground Service" />
        </Box>
        <Box gap="xs">
          <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
            <Text variant="caption" tone="muted" style={{ fontWeight: '700', flex: 1 }}>
              aspect
            </Text>
            <Text variant="caption" tone="primary" style={{ fontWeight: '700', flex: 2 }}>
              iOS
            </Text>
            <Text variant="caption" tone="primary" style={{ fontWeight: '700', flex: 2 }}>
              Android
            </Text>
          </Box>
          {rows.map((r) => (
            <Box key={r.aspect} p="sm" radius="sm" bg="surfaceVariant">
              <Text variant="small" style={{ fontWeight: '700' }}>
                {r.aspect}
              </Text>
              <Box row gap="sm" mt="xxs" style={{ flexWrap: 'wrap' }}>
                <Box flex={1} style={{ minWidth: 140 }}>
                  <Text variant="caption" tone="muted">
                    iOS: {r.ios}
                  </Text>
                </Box>
                <Box flex={1} style={{ minWidth: 140 }}>
                  <Text variant="caption" tone="muted">
                    Android: {r.android}
                  </Text>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
        <Text variant="caption" tone="muted">
          Takeaway: there is no cross-platform &ldquo;run this in the
          background&rdquo; primitive. Each platform ships its own contract —
          and both reserve the right to defer or kill your work. Design for
          deferral, not for guaranteed execution.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Doing real background work (illustrative)                       */
/* ------------------------------------------------------------------ */

const PLATFORM_TOOLING: ReadonlyArray<{ platform: BackgroundPlatform; api: string; note: string }> = [
  {
    platform: 'ios',
    api: 'BGTaskScheduler',
    note: 'Register BGAppRefreshTask (≤30s, opportunistic) or BGProcessingTask (longer, requires idle + charging). Declared in Info.plist under UIBackgroundModes: ["fetch", "processing"].',
  },
  {
    platform: 'android',
    api: 'WorkManager',
    note: 'Jetpack library for deferrable, guaranteed background work (one-off or periodic). Survives process death. For long-running user-visible work, a Foreground Service with a persistent notification.',
  },
];

function RealBackgroundWorkCard() {
  return (
    <Section
      title="Doing real background work"
      explanation="The Expo modules for this are expo-task-manager + expo-background-fetch. They wrap the platform APIs above into a unified JS surface. These packages are NOT installed in this app — the snippets below are illustrative."
    >
      <Box gap="sm">
        <Box gap="xs">
          {PLATFORM_TOOLING.map((t) => (
            <Box key={t.platform + t.api} p="sm" radius="sm" bg="surfaceVariant">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Pill tone="primary" value={t.platform} />
                <Text variant="small" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                  {t.api}
                </Text>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {t.note}
              </Text>
            </Box>
          ))}
        </Box>
        <Code>{`// ILLUSTRATIVE ONLY — expo-task-manager / expo-background-fetch are
// NOT installed in this app. To use them: install the packages, add the
// config plugin to app.config.ts, and switch off Expo Go to a custom
// dev build (background modes require a real build, not Expo Go).
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const TASK_NAME = 'sync-posts';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    // do the deferred work (a small fetch, a DAO flush, ...)
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the task (call once, e.g. on app startup):
await BackgroundFetch.registerTaskAsync(TASK_NAME, {
  minimumInterval: 60 * 15, // 15 minutes
});

// app.config.ts plugin + Info.plist keys (custom build only):
//   plugins: [
//     ['expo-background-fetch', { ios: { UIBackgroundModes: ['fetch'] } }],
//   ]`}</Code>
        <Text variant="caption" tone="muted">
          Push notifications are the other escape hatch for time-sensitive
          delivery (see the <Text style={{ fontFamily: 'monospace' }}>notifications</Text>{' '}
          candidate topic). And remember: anything beyond Expo Go — background
          modes, real signing, custom native code — needs an{' '}
          <Text style={{ fontFamily: 'monospace' }}>eas build --profile
          development</Text> custom dev build (covered on the Build &
          Deployment screen).
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Persisting across termination                                   */
/* ------------------------------------------------------------------ */

function PersistAcrossTerminationCard() {
  return (
    <Section
      title="Persisting across termination"
      explanation="A 'background' or 'inactive' transition is your LAST reliable signal before the OS may kill the app to reclaim memory. Flush anything you cannot afford to lose there — before the JS thread is suspended."
    >
      <Box gap="sm">
        <Text variant="body">
          The pattern: subscribe to{' '}
          <Text style={{ fontFamily: 'monospace' }}>AppState</Text>, and on a
          transition to{' '}
          <Text style={{ fontFamily: 'monospace' }}>'background'</Text> /{' '}
          <Text style={{ fontFamily: 'monospace' }}>'inactive'</Text>, persist
          your in-memory state (draft form input, unsynced edits, a session
          token) to AsyncStorage / your DAO. If the OS then kills the process,
          the data survives; on next launch you rehydrate from storage.
        </Text>
        <Code>{`// Persist-on-background pattern (conceptual).
useEffect(() => {
  const sub = AppState.addEventListener('change', async (next) => {
    if (next !== 'background' && next !== 'inactive') return;
    try {
      await AsyncStorage.setItem('draft', JSON.stringify(draft));
      // or: await postDao.insertDraft(draft);   // see the Database
      //                                    Handling screen
    } catch {
      // best-effort; the JS thread may be suspended mid-write
    }
  });
  return () => sub.remove();
}, [draft]);`}</Code>
        <Text variant="caption" tone="muted">
          Keep the work small and fast — you have only the brief suspend
          window, and a long synchronous write will be cut off. For anything
          heavier, queue it for a platform background task (previous section).
          Cross-link: the Database Handling screen covers the DAO + AsyncStorage
          seam this pattern writes through.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Testing & pitfalls                                              */
/* ------------------------------------------------------------------ */

const DO_ROWS: ReadonlyArray<{ tone: 'success' | 'danger'; label: string; body: string }> = [
  {
    tone: 'success',
    label: 'DO mock AppState in tests',
    body: 'jest.spyOn(AppState, "addEventListener"), capture the handler, fire it with "background"/"active" — the real AppState is inert under jest-expo.',
  },
  {
    tone: 'success',
    label: 'DO unsubscribe in cleanup',
    body: 'Return the subscription\'s .remove() from your effect. A leaked listener survives unmount and fires long after the screen is gone.',
  },
  {
    tone: 'success',
    label: 'DO unmount interval views in specs',
    body: 'A view that mounts an interval/subscription leaks the jest worker unless its smoke test calls unmount() before finishing.',
  },
  {
    tone: 'danger',
    label: 'AVOID heavy sync work in the change handler',
    body: 'You have only the brief suspend window. A long blocking write will be cut off by the OS. Persist fast, queue the rest for a background task.',
  },
  {
    tone: 'danger',
    label: 'AVOID trusting background execution',
    body: 'Per-OS and unreliable — Doze, Low Power Mode, and the user\'s background-app-refresh setting can all defer or skip your work entirely. Design for deferral.',
  },
  {
    tone: 'danger',
    label: 'AVOID setState inside a setState updater',
    body: 'In the AppState callback, call setCurrent/setLog directly — never nest one setState call inside another component\'s updater (React-19 anti-pattern).',
  },
];

function TestingPitfallsCard() {
  return (
    <Section
      title="Testing & pitfalls"
      explanation="A short do/avoid list. The AppState subscription is a side-effecting resource: it is mockable, but it leaks if you forget to clean it up."
    >
      <Box gap="xs">
        {DO_ROWS.map((r) => (
          <Box key={r.label} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
            <Pill tone={r.tone} value={r.tone === 'success' ? 'DO' : 'AVOID'} />
            <Box flex={1}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.label}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.body}
              </Text>
            </Box>
          </Box>
        ))}
        <Code>{`// The AppState spy pattern used in this view's spec:
const handler = jest.fn();
jest
  .spyOn(AppState, 'addEventListener')
  .mockImplementation((type, cb) => {
    handler.mockImplementation(cb);    // capture the registered callback
    return { remove: jest.fn() };      // RN returns a subscription
  });

const { result } = renderHook(() => useAppStateLog(), { wrapper });
act(() => handler('background'));      // fire a transition
expect(result.current.current).toBe('background');
expect(result.current.log[0].state).toBe('background');`}</Code>
      </Box>
    </Section>
  );
}

