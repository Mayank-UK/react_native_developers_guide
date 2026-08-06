import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Card, Text } from '../../components';
import { isDev, isStaging, isProd } from '../../../core/config/app-config';
import { Section, Code, Pill } from '../../components';
import { useLiveResolved, useFlagPlayground } from './environments_hooks';

/**
 * EnvironmentsView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (environments_hooks.ts); this file only renders.
 *
 * Teaching artifact for dev/staging/prod in React Native the STANDARD Expo
 * way. Grounded in the real files:
 *   app.config.ts                 (build-time config from process.env.APP_ENV)
 *   eas.json                      (build profiles → APP_ENV)
 *   core/config/index.ts          (createAppConfig reads expo-constants at runtime)
 *   core/config/app-config.ts     (AppConfig shape + Environment const-object)
 *   .env.example                  (EXPO_PUBLIC_* public vars)
 *
 * Pure domain predicates (`isDev`/`isStaging`/`isProd`) are pure functions on a
 * value — kept in the view per the exemplar's presentational exception. No
 * secrets are ever displayed — only non-sensitive public values. Single-file
 * helpers stay local per convention. No `any`; strict + erasure-clean.
 */
export function EnvironmentsView() {
  return (
    <ScreenScaffold
      title="Environments / Flavours"
    >
      <IntroCard />
      <StandardWayCard />
      <PublicVsSecretCard />
      <LiveResolvedCard />
      <EasProfilesCard />
      <ComparisonTableCard />
      <LiveFlagPlaygroundCard />
      <WebGuideCompareCard />
      <RecapCard />
    </ScreenScaffold>
  );
}
function IntroCard() {
  return (
    <Section title="Environments & flavours">
      <Text variant="body">
        You write one app, but you ship it to{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          three worlds
        </Text>{' '}
        — a dev build wired to fakes and failure injection, a staging build for
        QA on real devices, and a production build with real endpoints and no
        dev crutches. The challenge is keeping them identical where they should
        be and different only where they must be — without scattering{' '}
        <Text style={{ fontFamily: 'monospace' }}>if</Text> statements across
        the UI.
      </Text>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" style={{ fontWeight: '600' }}>
          Expo's standard answer
        </Text>
        <Text variant="small" tone="muted" mt="xxs">
          One <Text style={{ fontFamily: 'monospace' }}>app.config.ts</Text>{' '}
          reads <Text style={{ fontFamily: 'monospace' }}>process.env</Text> at
          build time; EAS build profiles set{' '}
          <Text style={{ fontFamily: 'monospace' }}>APP_ENV</Text>; the config
          flows through <Text style={{ fontFamily: 'monospace' }}>extra</Text>{' '}
          into <Text style={{ fontFamily: 'monospace' }}>expo-constants</Text>,
          which the app reads at runtime into one typed{' '}
          <Text style={{ fontFamily: 'monospace' }}>AppConfig</Text>. Every part
          of the app reads THAT, never <Text style={{ fontFamily: 'monospace' }}>process.env</Text>{' '}
          directly.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The standard Expo way                                            */
/* ------------------------------------------------------------------ */

function StandardWayCard() {
  return (
    <Section
      title="The standard Expo way — three files, one flow"
      explanation="This is the exact pipeline values take from your shell to a typed object in app code. Read each real file alongside."
    >
      <Box gap="sm">
        <Code>{`# 1. .env / EAS build profile sets APP_ENV + EXPO_PUBLIC_*  (build time)
APP_ENV=dev
EXPO_PUBLIC_BASE_URL=https://jsonplaceholder.typicode.com
EXPO_PUBLIC_USE_FAKE_API=true

// 2. app.config.ts reads process.env and forwards into 'extra':
const env = resolveEnv(process.env.APP_ENV);          // 'dev' | 'staging' | 'prod'
const config: ExpoConfig = {
  name:   env === 'prod' ? 'RN Developers Guide' : 'RN Guide (' + env + ')',
  ios:    { bundleIdentifier: env === 'prod' ? 'com.rndguide.app' : 'com.rndguide.' + env },
  extra:  { appEnv: env, baseUrl: process.env.EXPO_PUBLIC_BASE_URL, … },
};

// 3. core/config/index.ts reads 'extra' via expo-constants at RUNTIME:
function readFromConstants(): EnvSource {
  const extra = Constants.expoConfig?.extra;        // ← survives the build
  return { appEnv: extra?.appEnv, baseUrl: extra?.baseUrl, … };
}
export function createAppConfig(env = readFromConstants()): AppConfig { … }`}</Code>
        <Box gap="xs">
          {FLOW_ROWS.map((r, i) => (
            <Box key={r.step} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
              <Text variant="small" tone="primary" style={{ fontWeight: '700' }}>
                {i + 1}.
              </Text>
              <Box flex={1}>
                <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <Text variant="small" style={{ fontWeight: '600' }}>
                    {r.step}
                  </Text>
                  <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                    {r.file}
                  </Text>
                </Box>
                <Text variant="caption" tone="muted" mt="xxs">
                  {r.note}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Section>
  );
}

const FLOW_ROWS: ReadonlyArray<{ step: string; file: string; note: string }> = [
  { step: 'Build time', file: 'eas.json + .env', note: 'An EAS build profile (development/staging/production) sets APP_ENV. EXPO_PUBLIC_* vars are inlined into the bundle.' },
  { step: 'Config time', file: 'app.config.ts', note: "Expo evaluates this file at build time. It reads process.env, picks names/bundle ids per env, and writes everything else into `extra`." },
  { step: 'Runtime', file: 'core/config/index.ts', note: 'createAppConfig() reads Constants.expoConfig.extra (survives the build) and validates/parses it into a typed AppConfig.' },
  { step: 'Consumption', file: 'container.initialize', note: 'The container takes AppConfig as its root; everything else (logger floor, fakes on/off, scenario) flows from it. No file outside app.config.ts reads process.env.' },
];

/* ------------------------------------------------------------------ */
/* 3. EXPO_PUBLIC_* vs secret — what ships                              */
/* ------------------------------------------------------------------ */

function PublicVsSecretCard() {
  return (
    <Section
      title="EXPO_PUBLIC_* vs extra vs secrets — what actually ships"
      explanation="Anything reachable from client code IS in the bundle and IS extractable. The EXPO_PUBLIC_ prefix is a convention that inlines a var into client code; it is not encryption. Treat both EXPO_PUBLIC_* and `extra` as public. Real secrets never ship."
    >
      <Box gap="xs">
        {SECRET_ROWS.map((r) => (
          <Box key={r.kind} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.kind}
              </Text>
              {r.ship ? <Pill tone="success">ships in bundle</Pill> : <Pill tone="danger">never ships</Pill>}
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.note}
            </Text>
          </Box>
        ))}
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Rule of thumb
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            If a value would let someone impersonate your backend or bypass
            billing, it must NOT be in{' '}
            <Text style={{ fontFamily: 'monospace' }}>EXPO_PUBLIC_*</Text> or{' '}
            <Text style={{ fontFamily: 'monospace' }}>extra</Text>. Put it on a
            server the app authenticates against, or — for build-only secrets —
            in EAS server-side environment variables that are used during the
            build but are NOT written into the bundle.
          </Text>
        </Box>
      </Box>
    </Section>
  );
}

const SECRET_ROWS: ReadonlyArray<{ kind: string; ship: boolean; note: string }> = [
  {
    kind: 'EXPO_PUBLIC_*',
    ship: true,
    note: 'Public by design — inlined into the JS bundle at build time. Use for non-sensitive config the client needs: API base URL, feature flags, scenario defaults. This app exposes baseUrl, useFakeApi, enableLogs, …',
  },
  {
    kind: 'extra (app.config.ts)',
    ship: true,
    note: 'Surfaced via Constants.expoConfig.extra at runtime. ALSO public (it is in the bundle). This app forwards appEnv + the EXPO_PUBLIC_* values through it so there is one runtime read path.',
  },
  {
    kind: 'EAS server-side env',
    ship: false,
    note: "Set in EAS with `eas secret:create`. Available to build steps but NOT inlined into the client bundle. Used for signing keys, codepush deploy tokens, anything the build needs but the running app must not see.",
  },
  {
    kind: 'Auth tokens / API keys',
    ship: false,
    note: 'Resolve at runtime after a login, or proxy through your own server. Never bake a service key into EXPO_PUBLIC_*. For on-device sensitive storage use expo-secure-store (see the Database Handling screen).',
  },
];

/* ------------------------------------------------------------------ */
/* 4. LIVE — the current resolved config                               */
/* ------------------------------------------------------------------ */

function LiveResolvedCard() {
  const { live, reread } = useLiveResolved();
  const c = live.config;
  const envPillTone = isProd(c) ? 'danger' : isStaging(c) ? 'primary' : 'success';

  return (
    <Section
      title="LIVE — the currently resolved AppConfig"
      explanation="These are the REAL values resolved at runtime: the AppConfig straight out of the container, plus the app name / bundle id / env from expo-constants. Re-read after a different EAS build and every value here changes accordingly."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill tone={envPillTone}>{`environment: ${c.environment}`}</Pill>
          <Pill tone="primary">{`appEnv: ${live.appEnv}`}</Pill>
          <Button title="re-read" variant="ghost" onPress={reread} />
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            EXPO BUILD IDENTITY (expo-constants)
          </Text>
          <KvRow k="app name" v={live.appName} />
          <KvRow k="ios bundleIdentifier" v={live.bundleId} />
          <KvRow k="android package" v={live.androidPackage} />
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            APPCONFIG (container.appConfig — what app code reads)
          </Text>
          <KvRow k="environment" v={c.environment} />
          <KvRow k="baseUrl" v={c.baseUrl} />
          <KvRow k="useFakeApi" v={String(c.useFakeApi)} />
          <KvRow k="useFakeDatabase" v={String(c.useFakeDatabase)} />
          <KvRow k="enableLogs" v={String(c.enableLogs)} />
          <KvRow k="apiScenario" v={c.apiScenario} />
          <KvRow k="dbScenario" v={c.dbScenario} />
        </Box>

        <Text variant="caption" tone="muted">
          Notice how a single source —{' '}
          <Text style={{ fontFamily: 'monospace' }}>APP_ENV</Text> — ripples into
          the app name, the bundle id, and every defaulted flag (fakes + logs are
          dev-only; prod forces them off in{' '}
          <Text style={{ fontFamily: 'monospace' }}>createAppConfig</Text>).
        </Text>
      </Box>
    </Section>
  );
}

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

/* ------------------------------------------------------------------ */
/* 5. EAS build profiles                                               */
/* ------------------------------------------------------------------ */

function EasProfilesCard() {
  return (
    <Section
      title="EAS build profiles — how APP_ENV gets set"
      explanation="eas.json defines one profile per environment. Running `eas build --profile staging` sets APP_ENV=staging for that build, which app.config.ts then resolves. Each profile also controls distribution + dev-client behaviour."
    >
      <Box gap="sm">
        <Code>{`// eas.json (real file)
{
  "build": {
    "development": {
      "developmentClient": true,          // Expo Dev Client, not Expo Go
      "distribution": "internal",         // for your devices / simulators
      "env": { "APP_ENV": "dev" }
    },
    "staging": {
      "distribution": "internal",         // QA / TestFlight-internal
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "autoIncrement": true,              // bump build number per submit
      "env": { "APP_ENV": "prod" }
    }
  }
}`}</Code>
        <Box gap="xs">
          {EAS_ROWS.map((r) => (
            <Box key={r.profile} p="sm" radius="sm" bg="surfaceVariant">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text variant="small" style={{ fontWeight: '600' }}>
                  {r.profile}
                </Text>
                <Pill tone={r.profile === 'production' ? 'danger' : r.profile === 'staging' ? 'primary' : 'success'}>
                  {r.appEnv}
                </Pill>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.note}
              </Text>
            </Box>
          ))}
        </Box>
        <Text variant="caption" tone="muted">
          The CLI command is the only thing that changes per build — the codebase
          is identical. Separate bundle ids ({' '}
          <Text style={{ fontFamily: 'monospace' }}>com.rndguide.dev</Text>,{' '}
          <Text style={{ fontFamily: 'monospace' }}>.staging</Text>,{' '}
          <Text style={{ fontFamily: 'monospace' }}>.app</Text>) mean all three can
          sit side-by-side on one device — invaluable for QA.
        </Text>
      </Box>
    </Section>
  );
}

const EAS_ROWS: ReadonlyArray<{ profile: string; appEnv: string; note: string }> = [
  { profile: 'development', appEnv: 'APP_ENV=dev', note: 'dev client + internal distribution. Fakes on, logs on, failure-injection enabled. The build you develop against.' },
  { profile: 'staging', appEnv: 'APP_ENV=staging', note: 'internal distribution to QA. Real sources (fakes off via createAppConfig), logs still on. Production-shaped but not the store artifact.' },
  { profile: 'production', appEnv: 'APP_ENV=prod', note: 'store distribution. Fakes forced off, logs off, production bundle id + name. autoIncrement bumps the build number each submit.' },
];

/* ------------------------------------------------------------------ */
/* 6. dev/staging/prod comparison table                               */
/* ------------------------------------------------------------------ */

function ComparisonTableCard() {
  return (
    <Section
      title="Comparison — dev vs staging vs prod"
      explanation="What differs across the three, and where each value is decided. The defaults live in createAppConfig (core/config/index.ts) so they are codified, not tribal knowledge."
    >
      <Box gap="xs">
        {TABLE_ROWS.map((r) => (
          <Box key={r.label} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
              {r.label}
            </Text>
            <Box row gap="sm" mt="xxs" style={{ flexWrap: 'wrap' }}>
              <CompareCell label="dev" value={r.dev} tone="success" />
              <CompareCell label="staging" value={r.staging} tone="primary" />
              <CompareCell label="prod" value={r.prod} tone="danger" />
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

function CompareCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'primary' | 'danger';
}) {
  return (
    <Box flex={1} p="xs" radius="sm" bg="background" style={{ minWidth: 90 }}>
      <Pill tone={tone}>{label}</Pill>
      <Text variant="small" style={{ fontFamily: 'monospace', marginTop: 4 }}>
        {value}
      </Text>
    </Box>
  );
}

const TABLE_ROWS: ReadonlyArray<{ label: string; dev: string; staging: string; prod: string }> = [
  { label: 'app name', dev: 'RN Guide (dev)', staging: 'RN Guide (staging)', prod: 'RN Developers Guide' },
  { label: 'bundle id', dev: 'com.rndguide.dev', staging: 'com.rndguide.staging', prod: 'com.rndguide.app' },
  { label: 'useFakeApi', dev: 'true', staging: 'false', prod: 'false' },
  { label: 'useFakeDatabase', dev: 'true', staging: 'false', prod: 'false' },
  { label: 'enableLogs', dev: 'true', staging: 'true', prod: 'false' },
  { label: 'failure injection', dev: 'on (interceptor)', staging: 'off', prod: 'off' },
  { label: 'distribution', dev: 'internal + dev client', staging: 'internal', prod: 'store' },
];

/* ------------------------------------------------------------------ */
/* 7. LIVE feature-flag playground                                     */
/* ------------------------------------------------------------------ */

function LiveFlagPlaygroundCard() {
  const {
    config,
    devPanel,
    setDevPanel,
    verbose,
    setVerbose,
    apiScenario,
    dbScenario,
    useFakeApi,
  } = useFlagPlayground();

  // An env-derived gate: this dev-only block should not exist in prod at all.
  const devGateOpen = isDev(config);

  return (
    <Section
      title="LIVE — feature flags driven by env"
      explanation="An environment flag should feel like a real switch in the UI. Below, isDev(AppConfig) gates a dev-only diagnostics panel exactly the way a feature flag would; enableLogs drives a verbose-trace toggle. In a prod build, the dev panel is unreachable — the gate is false."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill tone={devGateOpen ? 'success' : 'danger'}>
            {`isDev: ${devGateOpen}`}
          </Pill>
          <Pill tone="primary">{`enableLogs: ${config.enableLogs}`}</Pill>
          <Pill tone={isStaging(config) ? 'success' : 'muted'}>{`isStaging: ${isStaging(config)}`}</Pill>
          <Pill tone={isProd(config) ? 'danger' : 'muted'}>{`isProd: ${isProd(config)}`}</Pill>
        </Box>

        {devGateOpen ? (
          <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
            <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                [dev-only] diagnostics panel
              </Text>
              <Pill tone="success">gated by isDev</Pill>
            </Box>
            <Text variant="caption" tone="muted">
              This whole block is rendered only when the resolved environment is
              dev. In a staging/prod build it is gone — no dead UI, no leaked dev
              affordances.
            </Text>
            <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              <Button
                title={devPanel ? 'hide inner panel' : 'show inner panel'}
                variant="outline"
                onPress={() => setDevPanel(!devPanel)}
              />
              <Button
                title={verbose ? 'verbose: on' : 'verbose: off'}
                variant={verbose ? 'filled' : 'ghost'}
                onPress={() => setVerbose(!verbose)}
              />
            </Box>
            {devPanel ? (
              <Box p="sm" radius="sm" bg="background">
                <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                  apiScenario={apiScenario} · dbScenario={dbScenario} · useFakeApi={useFakeApi ? 'true' : 'false'}
                </Text>
                {verbose ? (
                  <Text variant="caption" tone="muted" mt="xxs">
                    [verbose] resolved from {config.baseUrl} · env={config.environment}
                  </Text>
                ) : null}
              </Box>
            ) : null}
          </Box>
        ) : (
          <Box p="sm" radius="md" bg="surfaceVariant">
            <Text variant="small" tone="muted">
              Dev panel hidden — this build's environment is{' '}
              <Text style={{ fontFamily: 'monospace' }}>{config.environment}</Text>,
              so <Text style={{ fontFamily: 'monospace' }}>isDev</Text> is false.
              Build the dev profile to see it.
            </Text>
          </Box>
        )}

        <Code>{`// The pattern: read the resolved AppConfig once, branch on a flag.
import { isDev } from 'core/config/app-config';
const config = container.appConfig;
{isDev(config) && <DevDiagnosticsPanel />}
// NEVER read process.env in a screen — that is build-time only and not in the
// bundle. The AppConfig IS the runtime view of the environment.`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. How this differs from the web (Vite) guide                       */
/* ------------------------------------------------------------------ */

function WebGuideCompareCard() {
  return (
    <Section
      title="How this differs from the web guide (Vite)"
      explanation="Same goal (per-environment config), different mechanics. Vite resolves env at bundler time per --mode; Expo resolves it at build time via app.config.ts + EAS, then surfaces it at runtime through expo-constants."
    >
      <Box gap="xs">
        {WEB_ROWS.map((r) => (
          <Box key={r.aspect} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {r.aspect}
            </Text>
            <Box gap="xs" mt="xxs">
              <Box row gap="sm" style={{ alignItems: 'baseline' }}>
                <Pill tone="success">RN</Pill>
                <Text variant="caption" style={{ flexShrink: 1 }}>
                  {r.rn}
                </Text>
              </Box>
              <Box row gap="sm" style={{ alignItems: 'baseline' }}>
                <Pill tone="primary">web</Pill>
                <Text variant="caption" tone="muted" style={{ flexShrink: 1 }}>
                  {r.web}
                </Text>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

const WEB_ROWS: ReadonlyArray<{ aspect: string; rn: string; web: string }> = [
  {
    aspect: 'Mode selection',
    rn: 'APP_ENV set per EAS build profile; no per-mode bundler flag.',
    web: 'Vite --mode (dev/build) drives import.meta.env.MODE.',
  },
  {
    aspect: 'Public env vars',
    rn: 'EXPO_PUBLIC_* prefix → inlined into the bundle by Expo.',
    web: 'VITE_* prefix → inlined into import.meta.env by Vite.',
  },
  {
    aspect: 'Runtime read',
    rn: 'Constants.expoConfig.extra (survives the build).',
    web: 'import.meta.env (replaced statically at build time).',
  },
  {
    aspect: 'Native affordances',
    rn: 'Per-env bundle id + app name + icon → side-by-side installs.',
    web: 'One URL per environment; no install concept.',
  },
];

/* ------------------------------------------------------------------ */
/* 9. Recap                                                            */
/* ------------------------------------------------------------------ */

function RecapCard() {
  return (
    <Section
      title="Recap — environments in one breath"
      explanation="Four invariants. They are why this app's env story looks the way it does."
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
    title: 'One AppConfig, one read path',
    body: 'createAppConfig() is the only place that reads expo-constants. Everything else consumes container.appConfig — never process.env directly.',
  },
  {
    title: 'APP_ENV is the root knob',
    body: 'Set per EAS build profile, it cascades into the app name, bundle id, and the defaulted flags (fakes/logs on in dev, forced off in prod).',
  },
  {
    title: 'EXPO_PUBLIC_* is public — by design and by extraction',
    body: 'It is inlined for the client to read, which means anyone can extract it. Use it for non-sensitive config; keep secrets on a server or in EAS server-side env.',
  },
  {
    title: 'Per-env identity = side-by-side installs',
    body: 'Separate bundle ids let dev/staging/prod coexist on one device. The codebase is identical; only the build profile differs.',
  },
];
