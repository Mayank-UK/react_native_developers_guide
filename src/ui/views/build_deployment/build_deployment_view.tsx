import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Text } from '../../components';
import { Section, Code, Pill } from '../../components';
import { useTheme } from '../../design-system';
import {
  useBuildPlayground,
  releaseChecklist,
  type BuildProfileName,
} from './build_deployment_hooks';

/**
 * BuildDeploymentView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (build_deployment_hooks.ts); this file only renders.
 *
 * Teaching artifact for going from `expo start` to a shippable store binary.
 * Grounded in the real files:
 *   eas.json                      (build profiles → APP_ENV/distribution)
 *   app.config.ts                 (build-time config; runtimeVersion for OTA)
 *   core/config/index.ts          (createAppConfig reads expo-constants)
 *
 * The 16 KB Android ELF alignment section ACTION-POINTS the long-deferred
 * decision-log item: the fix is to move off Expo Go to a custom EAS build with
 * AGP 8.5.1+, NDK r27+, and `extractNativeLibs="false"`. No new deps; no `any`;
 * strict + erasure-clean.
 */
export function BuildDeploymentView() {
  return (
    <ScreenScaffold
      title="Build & Deployment"
    >
      <PipelineCard />
      <BuildProfilesCard />
      <EnvConfigCard />
      <SigningCard />
      <SubmitCard />
      <OtaUpdatesCard />
      <ElfAlignmentCard />
      <ChecklistCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. From `expo start` to a shippable binary                          */
/* ------------------------------------------------------------------ */

function PipelineCard() {
  return (
    <Section
      title="From `expo start` to a shippable binary"
      explanation="Expo Go is a development tool, not a production binary. To ship, you produce a standalone app binary via EAS Build, sign it, submit it to the stores, and optionally push JS-only updates over the air."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Managed workflow vs bare
          </Text>
          <Text variant="small" tone="muted" mt="xxs">
            This project is <Text style={{ fontFamily: 'monospace' }}>managed</Text> —
            there is no top-level <Text style={{ fontFamily: 'monospace' }}>android/</Text>{' '}
            or <Text style={{ fontFamily: 'monospace' }}>ios/</Text> directory. EAS Build
            generates the native projects in the cloud, builds, and signs them. A{' '}
            <Text style={{ fontFamily: 'monospace' }}>bare</Text> workflow (prebuild or
            <Text style={{ fontFamily: 'monospace' }}> npx expo prebuild</Text>) gives you
            the native folders to edit directly, at the cost of owning their upgrades.
          </Text>
        </Box>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Why Expo Go is not a production build
          </Text>
          <Text variant="small" tone="muted" mt="xxs">
            Expo Go is a shared host app that loads your JS bundle. It cannot carry a
            custom <Text style={{ fontFamily: 'monospace' }}>bundleIdentifier</Text>, push
            notifications, or native code you added via a config plugin, and it cannot be
            submitted to a store. A production build compiles YOUR app id, YOUR native
            dependencies, and YOUR signing credentials into a standalone{' '}
            <Text style={{ fontFamily: 'monospace' }}>.apk/.aab</Text> or{' '}
            <Text style={{ fontFamily: 'monospace' }}>.ipa</Text>.
          </Text>
        </Box>
        <Code language="bash">{`# The EAS pipeline (managed workflow):
eas build     --profile production --platform android    # 1. cloud-compile a signed binary
eas submit    --platform android --latest                # 2. push it to the Play Store
eas update    --branch production --message "fix"        # 3. JS-only fix, no store re-review

# \`expo start\` only serves the JS bundle to Expo Go / a dev client during
# development. It never produces a binary you can ship.`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Build profiles — eas.json (LIVE selector)                        */
/* ------------------------------------------------------------------ */

function BuildProfilesCard() {
  const { profile, setProfile, selected, summaries } = useBuildPlayground();
  return (
    <Section
      title="Build profiles — `eas.json`"
      explanation="eas.json defines one profile per environment. Running `eas build --profile <name>` sets that profile's env + distribution. The excerpt below is the real file; the selector under it shows the resolved per-profile summary."
    >
      <Box gap="sm">
        <Code language="json">{`// eas.json (real file in this repo)
{
  "cli": { "version": ">= 5.9.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,          // Expo Dev Client, NOT Expo Go
      "distribution": "internal",         // your devices / simulators only
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
  },
  "submit": { "production": {} }
}`}</Code>

        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Text variant="small" style={{ fontWeight: '600' }}>
            LIVE — resolved per-profile summary
          </Text>
          <Text variant="caption" tone="muted">
            Derived from <Text style={{ fontFamily: 'monospace' }}>buildProfileSummary()</Text> in{' '}
            <Text style={{ fontFamily: 'monospace' }}>build_deployment_hooks.ts</Text>, which mirrors
            the real <Text style={{ fontFamily: 'monospace' }}>eas.json</Text>.
          </Text>
          <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
            {(Object.keys(summaries) as BuildProfileName[]).map((name) => (
              <Pill key={name} tone={name === profile ? 'primary' : 'muted'}>
                {name}
              </Pill>
            ))}
          </Box>
          <Box row gap="xs" style={{ flexWrap: 'wrap', marginTop: 4 }}>
            {(['development', 'staging', 'production'] as const).map((name) => (
              <Text
                key={name}
                variant="caption"
                tone={name === profile ? 'primary' : 'muted'}
                onPress={() => setProfile(name)}
                style={{
                  fontWeight: name === profile ? '700' : '500',
                  textDecorationLine: 'underline',
                }}
              >
                select {name}
              </Text>
            ))}
          </Box>
          <Box p="xs" radius="sm" bg="background" gap="xs" style={{ marginTop: 4 }}>
            <KvRow k="profile" v={profile} />
            <KvRow k="distribution" v={selected.distribution} />
            <KvRow k="developmentClient" v={String(selected.developmentClient)} />
            <KvRow k="autoIncrement" v={String(selected.autoIncrement)} />
            <KvRow k="env.APP_ENV" v={selected.appEnv} />
          </Box>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Environment-driven config — app.config.ts                        */
/* ------------------------------------------------------------------ */

function EnvConfigCard() {
  return (
    <Section
      title="Environment-driven config — `app.config.ts`"
      explanation="The same APP_ENV the EAS profile injects is read by app.config.ts at build time to pick the app name + bundle id, and forwarded through `extra` so createAppConfig can read it at runtime via expo-constants."
    >
      <Box gap="sm">
        <Code language="typescript">{`// app.config.ts (real file) — Expo evaluates this at BUILD time
function resolveEnv(raw: string | undefined): 'dev' | 'staging' | 'prod' {
  if (raw === 'staging' || raw === 'prod') return raw;
  return 'dev';
}
const env = resolveEnv(process.env.APP_ENV);       // set by the EAS profile
const config: ExpoConfig = {
  name:    env === 'prod' ? 'RN Developers Guide' : 'RN Guide (' + env + ')',
  ios:     { bundleIdentifier: env === 'prod' ? 'com.rndguide.app' : 'com.rndguide.' + env },
  android: { package:        env === 'prod' ? 'com.rndguide.app' : 'com.rndguide.' + env },
  extra:   { appEnv: env, baseUrl: process.env.EXPO_PUBLIC_BASE_URL, … },
};`}</Code>
        <Code language="typescript">{`// src/core/config/index.ts (real file) — runtime read
// createAppConfig reads Constants.expoConfig.extra (survives the build) and
// validates/parses it into a typed AppConfig consumed by the container.
export function createAppConfig(env: EnvSource = readFromConstants()): AppConfig {
  const environment = resolveEnvironment(env.appEnv);   // 'dev' | 'staging' | 'prod'
  return { environment, baseUrl: env.baseUrl ?? '…', /* … */ };
}`}</Code>
        <Text variant="caption" tone="muted">
          See the <Text style={{ fontFamily: 'monospace' }}>Environments / Flavours</Text> screen
          for the full end-to-end flow + a live resolved-config demo.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. App signing & credentials                                        */
/* ------------------------------------------------------------------ */

function SigningCard() {
  return (
    <Section
      title="App signing & credentials"
      explanation="Every store binary is cryptographically signed. iOS uses a certificate + provisioning profile tied to an Apple Developer account; Android uses a keystore (the upload key). EAS can generate and keep these for you, or you can bring your own."
    >
      <Box gap="sm">
        <Box gap="xs">
          {SIGNING_ROWS.map((r) => (
            <Box key={r.platform} p="sm" radius="sm" bg="surfaceVariant">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text variant="small" style={{ fontWeight: '600' }}>
                  {r.platform}
                </Text>
                <Pill tone={r.managed ? 'success' : 'muted'}>
                  {r.managed ? 'EAS-managed' : 'local / bring-your-own'}
                </Pill>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.note}
              </Text>
            </Box>
          ))}
        </Box>
        <Code language="bash">{`# Manage credentials via the EAS CLI (no manual Xcode / Android Studio steps):
eas credentials --platform ios       # distribution cert + provisioning profile
eas credentials --platform android   # upload keystore

# EAS-managed (default) keeps keys on Expo's servers, scoped to your project.
# Use "local" credentials only if your org mandates a self-hosted keystore/cert.`}</Code>
      </Box>
    </Section>
  );
}

const SIGNING_ROWS: ReadonlyArray<{ platform: string; managed: boolean; note: string }> = [
  {
    platform: 'iOS',
    managed: true,
    note: 'Apple Developer account (paid) → distribution certificate + provisioning profile tied to the bundle id. `eas credentials` can create, or you import a .p12 + profile.',
  },
  {
    platform: 'Android',
    managed: true,
    note: 'Upload keystore (.jks) signs the .aab you upload to Play. Play then re-signs for distribution. `eas credentials` generates one; back it up — losing it means a Play Console reset.',
  },
];

/* ------------------------------------------------------------------ */
/* 5. Submitting to stores                                             */
/* ------------------------------------------------------------------ */

function SubmitCard() {
  return (
    <Section
      title="Submitting to stores"
      explanation="`eas submit` uploads a built binary to App Store Connect or Google Play Console. The first submission needs full store listings; subsequent ones can auto-increment the build number and reuse the listing."
    >
      <Box gap="sm">
        <Code language="bash">{`# Build + submit in one go, or separately:
eas build  --profile production --platform android --auto-submit
eas submit --platform android --latest         # submit the most recent build
eas submit --platform ios     --latest

# appVersionSource: "remote" (in this repo's eas.json) lets EAS track the
# version/build-number remotely; "autoIncrement": true bumps it per build.`}</Code>
        <Box gap="xs">
          {SUBMIT_ROWS.map((r) => (
            <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.title}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.note}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Section>
  );
}

const SUBMIT_ROWS: ReadonlyArray<{ title: string; note: string }> = [
  { title: 'App Store Connect (iOS)', note: 'Requires app record, screenshots, privacy policy, App Privacy disclosure. Review typically 24–48h; rejections cite a specific guideline (e.g. 2.1 performance).'},
  { title: 'Google Play Console (Android)', note: 'Requires store listing, content rating questionnaire, data safety form, app signing (Play re-signs your .aab). Roll out staged (e.g. 10% → 100%).'},
  { title: 'autoIncrement', note: 'Each store rejects a binary whose build number has not incremented. `autoIncrement: true` on the production profile handles this automatically.'},
];

/* ------------------------------------------------------------------ */
/* 6. OTA updates (EAS Update)                                         */
/* ------------------------------------------------------------------ */

function OtaUpdatesCard() {
  return (
    <Section
      title="OTA updates (EAS Update)"
      explanation="EAS Update pushes a new JS bundle to existing binaries — no store re-review. It is governed by a runtimeVersion policy so an update only lands on a compatible native shell."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            What can / cannot change OTA
          </Text>
          <Box gap="xs" mt="xxs">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Pill tone="success">can</Pill>
              <Text variant="caption" style={{ flexShrink: 1 }}>
                Any JS/TS, assets bundled into the JS, bug fixes, feature toggles, copy.
              </Text>
            </Box>
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Pill tone="danger">cannot</Pill>
              <Text variant="caption" style={{ flexShrink: 1 }}>
                Native code (new native module / config plugin), permissions, the app
                manifest, the runtimeVersion itself — these require a new store build.
              </Text>
            </Box>
          </Box>
        </Box>
        <Code language="bash">{`# Push a JS-only update to already-shipped binaries:
eas update --branch production --message "fix: cart total rounding"

# runtimeVersion policy decides whether the update is eligible for a binary:
#   - sdkVersion   : update applies to binaries built with a matching Expo SDK
#   - runtimeVersion: custom string you bump when the native shell changes
# app.config.ts can set runtimeVersion to gate exactly which binaries accept
# an OTA update (see the Environments screen for app.config.ts details).`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. The 16 KB Android ELF alignment fix (ACTION POINT)               */
/* ------------------------------------------------------------------ */

function ElfAlignmentCard() {
  return (
    <Section
      title="The 16 KB Android ELF alignment fix (ACTION POINT)"
      explanation="A long-deferred decision-log item, resolved HERE. Stock Expo Go and older EAS builds ship .so native libs that trip Android's 16 KB page-size alignment warning; it becomes a HARD install block at targetSdk >= 35. The fix is to move off Expo Go to a custom EAS build with an up-to-date AGP + NDK."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            The problem
          </Text>
          <Text variant="small" tone="muted" mt="xxs">
            Android devices with 16 KB page size (Pixel 8+ and all recent ARM64 devices)
            require <Text style={{ fontFamily: 'monospace' }}>.so</Text> libraries to be
            aligned on a 16 KB boundary. Older NDK/AGP versions align at 4 KB, so any
            native lib they produce triggers a lint warning — and at{' '}
            <Text style={{ fontFamily: 'monospace' }}>targetSdk &gt;= 35</Text> the Play
            Store rejects the build outright. Under Expo Go the offending{' '}
            <Text style={{ fontFamily: 'monospace' }}>.so</Text> libs ship inside the Go
            host, so the issue is NOT code-fixable from the managed workflow while you stay
            on Expo Go.
          </Text>
        </Box>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            The fix (resolves the deferred decision)
          </Text>
          <Text variant="small" tone="muted" mt="xxs">
            Move from Expo Go to a <Text style={{ fontFamily: 'monospace' }}>developmentClient</Text>{' '}
            custom dev build and a production EAS build. On a custom build you control the
            native toolchain, so you set the keys below. This is exactly what the{' '}
            <Text style={{ fontFamily: 'monospace' }}>development</Text> profile in{' '}
            <Text style={{ fontFamily: 'monospace' }}>eas.json</Text> already opts into via{' '}
            <Text style={{ fontFamily: 'monospace' }}>&quot;developmentClient&quot;: true</Text>.
          </Text>
        </Box>
        <Code language="gradle">{`# android/gradle.properties (generated by prebuild, then edited)
android.useAndroidX=true
android.enableJetifier=true

# android/build.gradle (project-level) — use AGP 8.5.1 or newer
buildscript {
  dependencies { classpath "com.android.tools.build:gradle:8.5.1" }
}

# android/app/build.gradle (module-level)
android {
  compileSdk 35
  packagingOptions {
    jniLibs { useLegacyPackaging false }   // = extractNativeLibs "false"
  }
}
# In AndroidManifest.xml: android:extractNativeLibs="false" on <application>.
# Use NDK r27+ (it aligns .so outputs on 16 KB by default).
# Upgrade any native dep older than its 16 KB-aligned release (Reanimated,
# react-native-screens, etc. — the RN 0.79+ / Expo SDK 53 line is aligned).`}</Code>
        <Text variant="caption" tone="muted">
          This is why the <Text style={{ fontFamily: 'monospace' }}>development</Text>{' '}
          profile in <Text style={{ fontFamily: 'monospace' }}>eas.json</Text> sets{' '}
          <Text style={{ fontFamily: 'monospace' }}>developmentClient: true</Text>: a custom
          dev client build replaces Expo Go and lets the toolchain keys above take effect.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Release checklist                                                */
/* ------------------------------------------------------------------ */

function ChecklistCard() {
  const steps = releaseChecklist();
  return (
    <Section
      title="Release checklist"
      explanation="Ordered pre-release steps. Each assumes the previous one is done. The order is load-bearing — do not submit before credentials are verified."
    >
      <Box gap="xs">
        {steps.map((s) => (
          <Box key={s.order} p="sm" radius="sm" bg="surfaceVariant" row gap="sm" style={{ alignItems: 'flex-start' }}>
            <StepBadge order={s.order} />
            <Box flex={1} style={{ flexShrink: 1 }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {s.title}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {s.detail}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Local presentational helper (single-file, no export).               */
/* ------------------------------------------------------------------ */

/**
 * Fixed-size "step N" badge for the release checklist. Deliberately a
 * fixed-width pill (not a flex-growing container) so the badge stays the same
 * size regardless of how long the sibling title/detail text is — that was the
 * bug: a `<Pill label value=...>` placed the long title INSIDE the badge, so
 * every step's chip grew wider. Now the badge holds ONLY "step N" and the long
 * text lives in a separate flex sibling.
 */
function StepBadge({ order }: { order: number }) {
  const { theme } = useTheme();
  return (
    <Box
      center
      radius="full"
      px="sm"
      py="xxs"
      style={{
        backgroundColor: theme.colors.primary,
        minWidth: 64,
        alignSelf: 'flex-start',
      }}
    >
      <Text variant="caption" tone="onPrimary" style={{ fontWeight: '700' }}>
        {'step ' + String(order)}
      </Text>
    </Box>
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
