import { TextInput } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Text, Button, useTheme } from '../../design-system';
import { Section, Code, Pill } from '../../components';
import {
  INTEGRATION_STATUS,
  SERVICE_CATEGORIES,
  integrationMaturity,
  redactSecret,
  serviceCategoryLabel,
  useAnalyticsPlayground,
  type AnalyticsPort,
  type IntegrationStatus,
  type ServiceCategory,
} from './third_party_services_hooks';

/**
 * ThirdPartyServicesView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (third_party_services_hooks.ts); this file only renders.
 *
 * Teaching artifact for analytics / crash reporting / auth (OAuth) / payments —
 * the keystone lesson is the PORT pattern: wrap every third-party SDK behind
 * YOUR OWN `AnalyticsPort`-style interface so the app depends on your
 * abstraction, not the vendor. This mirrors the existing DI + repository-port
 * architecture (`core/container` + `domain/repositories/post-repository.ts`).
 *
 * No third-party SDK is installed (each would need native modules + API keys +
 * a dev/prod build); the LIVE demo uses `MockAnalytics` so events are
 * observable without a real SDK. No `any`; strict + erasure-clean.
 */
export function ThirdPartyServicesView() {
  return (
    <ScreenScaffold
      title="Third-party Services"
      subtitle="Analytics, crash reporting, auth, payments — behind ports, not raw SDKs."
    >
      <PortKeystoneCard />
      <AnalyticsCard />
      <CrashReportingCard />
      <AuthCard />
      <PaymentsCard />
      <AnalyticsPlaygroundCard />
      <ProductionNotesCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. The PORT pattern (keystone).                                    */
/* ------------------------------------------------------------------ */

function PortKeystoneCard() {
  return (
    <Section
      title="Why every SDK needs a PORT"
      explanation="Third-party SDKs are infrastructure details — they change, get acquired, get deprecated, and leak into every screen if you import them directly. The fix is the same port/interface pattern this app already uses for data: depend on your own abstraction, wire the concrete adapter in the container, swap vendors without touching call sites."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            The three wins
          </Text>
          <Box gap="xs" mt="xxs">
            <PortWin
              title="No vendor lock-in"
              body="Swap Amplitude → PostHog → Firebase by editing one adapter in the container. Call sites never change."
            />
            <PortWin
              title="Testable without native modules"
              body="A MockAnalytics adapter runs in jest with zero SDK mocking — the same way FakeApiService lets the API screen test without the network."
            />
            <PortWin
              title="Consistent error/privacy policy"
              body="One place to redact PII, throttle volume, or gate by consent — not 30 import sites each forgetting."
            />
          </Box>
        </Box>

        <Code language="typescript">{`// domain/ports/analytics-port.ts  — the contract the APP depends on
export interface AnalyticsPort {
  track(event: string, props?: Record<string, string | number | boolean>): void;
  identify(userId: string, traits?: Record<string, string | number | boolean>): void;
  reset(): void;
}

// The container registers the concrete adapter, exactly like PostRepository:
//   container.register('PostRepository', new PostRepositoryImpl(...))
//   container.register('Analytics', new FirebaseAnalyticsAdapter())
//
// A screen/use-case resolves the PORT, never the SDK:
//   const analytics = container.analytics   // AnalyticsPort
//   analytics.track('post_viewed', { id })`}</Code>

        <Code language="typescript">{`// This is the same pattern the app already uses for data. Real file:
//   src/domain/repositories/post-repository.ts
import type { Post } from '../models/post';
import type { Result } from '../../core/result';

export interface PostRepository {
  getPosts(): Promise<Result<Post[]>>;
}
// The UI depends on THIS interface; PostRepositoryImpl (the concrete class)
// is the only place that knows about the http client + DAO. Swap the impl in
// the container and no screen changes. Treat analytics / crash / auth / payments
// the same way.`}</Code>

        <Text variant="caption" tone="muted">
          See the <Text style={{ fontFamily: 'monospace' }}>Dependency Management</Text> screen
          for the container, and the <Text style={{ fontFamily: 'monospace' }}>Architecture</Text>{' '}
          screen for the ports-and-adapters layering rule.
        </Text>
      </Box>
    </Section>
  );
}

function PortWin({ title, body }: { title: string; body: string }) {
  return (
    <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
      <Pill tone="success">win</Pill>
      <Box flex={1} style={{ minWidth: 0 }}>
        <Text variant="small" style={{ fontWeight: '600' }}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {body}
        </Text>
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Analytics.                                                      */
/* ------------------------------------------------------------------ */

function AnalyticsCard() {
  return (
    <Section
      title="Analytics — track / identify behind a port"
      explanation="Firebase Analytics, Amplitude, PostHog all share the same shape: log events, attach user identity, reset on sign-out. Wrap them once in an AnalyticsPort adapter; the rest of the app calls track() and does not know or care which vendor is wired."
    >
      <Box gap="sm">
        <Code language="typescript">{`// adapters/firebase-analytics-adapter.ts  (ILLUSTRATIVE — SDK not installed)
import analytics from '@react-native-firebase/analytics';
import type { AnalyticsPort } from '../domain/ports/analytics-port';

export class FirebaseAnalyticsAdapter implements AnalyticsPort {
  track(event, props) {
    // firebase mangles nested objects; flatten to string|number|boolean.
    void analytics().logEvent(event, props ?? {});
  }
  identify(userId, traits) {
    void analytics().setUserId(userId);
    if (traits) void analytics().setUserProperties(traits);
  }
  reset() {
    void analytics().resetAnalyticsData();
  }
}`}</Code>
        <Code language="typescript">{`// wiring it in the container (ILLUSTRATIVE — container.ts registers singletons
// the same way it registers HttpClient / PostRepository):
import { FirebaseAnalyticsAdapter } from '../adapters/firebase-analytics-adapter';

// inside Container.initialize():
this.register('Analytics', new FirebaseAnalyticsAdapter());
// or, in dev / tests, the mock (no SDK, no native module, no API key):
this.register('Analytics', new MockAnalytics());`}</Code>
        <Text variant="caption" tone="muted">
          The LIVE demo below uses{' '}
          <Text style={{ fontFamily: 'monospace' }}>MockAnalytics</Text> — the
          same port shape, capturing events in memory.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Crash reporting (Sentry).                                       */
/* ------------------------------------------------------------------ */

function CrashReportingCard() {
  return (
    <Section
      title="Crash reporting — Sentry hooks the existing error pipeline"
      explanation="The app already has a typed exception pipeline (engine error → AppException → mapExceptionToFailure → Failure → Result). A Sentry transport hooks the SAME pipeline at two points: capture breadcrumbs from the analytics port, and capture the Failure chain inside safeRepositoryCall. Nothing changes for the user — Sentry just gets a copy for triage."
    >
      <Box gap="sm">
        <Code language="typescript">{`// app entry (ILLUSTRATIVE — @sentry/react-native not installed)
import * as Sentry from '@sentry/react-native';
import { createAppConfig } from './core/config';

const config = createAppConfig();   // reads EXPO_PUBLIC_* via expo-constants
Sentry.init({
  dsn: config.sentryDsn,             // from core/config — never hardcode
  environment: config.environment,   // 'dev' | 'staging' | 'prod'
  enableInExpoDevelopment: false,    // quiet in dev
  tracesSampleRate: 0.2,             // perf sampling
});`}</Code>

        <Code language="typescript">{`// Hooking the REAL pipeline. The existing guard already maps exceptions to
// Failures — a Sentry transport just observes the Failure chain:
//   src/core/error-handling/guards/guards.ts (real file, excerpt)
export function mapExceptionToFailure(e: AppException): Failure {
  // ... maps NetworkException -> NetworkFailure, ServerException -> ServerFailure
  // A Sentry adapter would call Sentry.captureException(e) HERE, before mapping,
  // so the full typed cause-chain is preserved in Sentry.
}

// safeRepositoryCall already logs every failure; wire Sentry into the Logger
// so the same call surfaces in your dashboard with the chained .chain string.`}</Code>

        <Code language="typescript">{`// The port pattern again — so the rest of the app stays transport-agnostic:
export interface CrashReportingPort {
  capture(error: unknown, ctx?: Record<string, unknown>): void;
  breadcrumb(msg: string, data?: Record<string, unknown>): void;
  setUser(userId: string | null): void;
}
// SentryCrashAdapter implements it. A NoopCrashAdapter is used in dev / tests
// so jest never needs the Sentry SDK on the classpath.`}</Code>
        <Text variant="caption" tone="muted">
          Cross-link: the <Text style={{ fontFamily: 'monospace' }}>Exception Handling</Text>{' '}
          screen walks the real <Text style={{ fontFamily: 'monospace' }}>AppException → Failure → Result</Text>{' '}
          pipeline that Sentry would hook into.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Auth (OAuth).                                                   */
/* ------------------------------------------------------------------ */

function AuthCard() {
  return (
    <Section
      title="Auth — OAuth via expo-auth-session + expo-secure-store"
      explanation="Google/Apple sign-in uses the PKCE flow: open a browser, redirect back with a one-time code, exchange it for tokens, store them securely. Wrap the whole flow in an AuthPort so the app stays session-source-agnostic — exactly the same port seam as analytics."
    >
      <Box gap="sm">
        <Code language="typescript">{`// ILLUSTRATIVE — expo-auth-session / expo-web-browser not installed
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();   // handles the redirect

async function signInWithGoogle(): Promise<void> {
  const redirectUri = makeRedirectUri({ native: 'com.rndguide.app:/oauth' });
  const authUrl = buildAuthUrl(redirectUri);     // client_id + PKCE challenge
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== 'success') return;
  const code = extractCode(result);
  const session = await exchangeCodeForSession(code);   // backend call
  // NEVER store tokens in AsyncStorage — use the Keychain/Keystore backing
  // expo-secure-store (see the Device Features screen).
  await SecureStore.setItemAsync('session', JSON.stringify(session));
}`}</Code>

        <Code language="typescript">{`// The port + adapter — so the container can swap Google / Apple / custom JWT:
export interface AuthPort {
  signIn(): Promise<Session>;
  signOut(): Promise<void>;
  currentSession(): Promise<Session | null>;
}
// OAuthAdapter implements AuthPort; the resulting Session is wired into the
// container so use-cases read it via container.auth, not a global.`}</Code>
        <Text variant="caption" tone="muted">
          Cross-link: <Text style={{ fontFamily: 'monospace' }}>Device Features</Text> covers{' '}
          <Text style={{ fontFamily: 'monospace' }}>expo-secure-store</Text>;{' '}
          <Text style={{ fontFamily: 'monospace' }}>Environments</Text> covers{' '}
          <Text style={{ fontFamily: 'monospace' }}>EXPO_PUBLIC_OAUTH_CLIENT_ID</Text>.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Payments (Stripe).                                              */
/* ------------------------------------------------------------------ */

function PaymentsCard() {
  return (
    <Section
      title="Payments — StripeProvider + the client-secret-from-backend rule"
      explanation="Stripe's mobile SDK takes a publishable key (safe to ship) and a client secret fetched from YOUR backend per-payment (never ship the secret key). The StripeProvider wraps the app; useStripe() drives the payment sheet inside one adapter behind a PaymentsPort."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
          <Pill tone="danger">never</Pill>
          <Text variant="small" style={{ flexShrink: 1 }}>
            Ship the Stripe <Text style={{ fontFamily: 'monospace' }}>secret key</Text> in the
            app binary. It is extractable from any APK/IPA. Use the publishable
            key client-side; create PaymentIntents server-side.
          </Text>
        </Box>

        <Code language="typescript">{`// ILLUSTRATIVE — @stripe/stripe-react-native not installed
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

// In _layout.tsx (publishable key ONLY — safe to expose; bundles the SDK):
<StripeProvider
  publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
  urlScheme="com.rndguide.app"
  merchantIdentifier="merchant.com.rndguide.app"   // Apple Pay
>

// Inside the checkout screen — fetch the client secret from YOUR backend:
async function pay(): Promise<void>  {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { clientSecret } = await fetch('https://api.you.app/payments', {
    method: 'POST',
    body: JSON.stringify({ amount: 1999, currency: 'usd' }),
  });                            // ^ backend holds the SECRET key
  await initPaymentSheet({ merchantDisplayName: 'RN Guide', paymentIntentClientSecret: clientSecret });
  const { error } = await presentPaymentSheet();
  if (error) throw error;
}`}</Code>

        <Code language="typescript">{`// Behind a port — the app never knows it is Stripe:
export interface PaymentsPort {
  startCheckout(amount: number, currency: string): Promise<CheckoutResult>;
}
// StripePaymentsAdapter implements it; a NoopPaymentsAdapter (or a fake) is
// registered in dev so the checkout flow is testable end-to-end.`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. LIVE demo — analytics event-logger playground.                  */
/* ------------------------------------------------------------------ */

function AnalyticsPlaygroundCard() {
  const demo = useAnalyticsPlayground();
  return (
    <Section
      title="LIVE — analytics event-logger playground"
      explanation="A self-contained MockAnalytics implementation of the AnalyticsPort above. Type an event name and Track it, Identify a user, or Reset — every call is captured into a visible ring buffer (capped to 25, newest last). This is exactly the surface a real FirebaseAnalyticsAdapter exposes; only the body of track() differs."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Text variant="small" style={{ fontWeight: '600' }}>
            track(event, props)
          </Text>
          <Box row gap="xs" style={{ alignItems: 'center' }}>
            <TextInput
              value={demo.draft}
              onChangeText={demo.setDraft}
              placeholder="event name e.g. post_viewed"
              style={textInputStyle()}
            />
            <Button title="Track" variant="filled" onPress={demo.track} />
          </Box>
          <Text variant="caption" tone="muted">
            Each call also attaches{' '}
            <Text style={{ fontFamily: 'monospace' }}>{'source: "playground"'}</Text>{' '}
            + the event-name length — proving structured props survive the port.
          </Text>
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Text variant="small" style={{ fontWeight: '600' }}>
            identify(userId, traits) / reset()
          </Text>
          <Box row gap="xs" style={{ alignItems: 'center' }}>
            <TextInput
              value={demo.userIdDraft}
              onChangeText={demo.setUserIdDraft}
              placeholder="user id e.g. user_42"
              style={textInputStyle()}
            />
            <Button title="Identify" variant="outline" onPress={demo.identify} />
            <Button title="Reset" variant="outline" onPress={demo.reset} />
          </Box>
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Box row gap="sm" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="small" style={{ fontWeight: '600' }}>
              Captured events
            </Text>
            <Pill tone={demo.events.length === 0 ? 'muted' : 'primary'}>
              {String(demo.events.length)} captured
            </Pill>
          </Box>
          {demo.events.length === 0 ? (
            <Text variant="caption" tone="muted">
              No events yet. The MockAnalytics ring buffer is empty — fire one above.
            </Text>
          ) : (
            <Box gap="xxs">
              {demo.events.map((ev) => (
                <CapturedRow key={ev.id} ev={ev} />
              ))}
            </Box>
          )}
          <Box row gap="xs" style={{ flexWrap: 'wrap', marginTop: 4 }}>
            <Button title="Clear log" variant="ghost" onPress={demo.clear} />
          </Box>
        </Box>
      </Box>
    </Section>
  );
}

function CapturedRow({
  ev,
}: {
  ev: {
    id: number;
    kind: string;
    detail?: string;
    at: string;
  };
}) {
  const { theme } = useTheme();
  const isIdentify = ev.kind === 'identify';
  const isReset = ev.kind === 'reset';
  const tone = isIdentify ? 'primary' : isReset ? 'danger' : 'success';
  return (
    <Box row gap="xs" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Pill tone={tone}>{ev.kind}</Pill>
      <Text
        variant="caption"
        style={{ fontFamily: 'monospace', color: theme.colors.text, flexShrink: 1 }}
      >
        {ev.detail ?? '(no props)'}
      </Text>
      <Text variant="caption" tone="muted" style={{ marginLeft: 'auto' }}>
        {ev.at.slice(11, 19)}
      </Text>
    </Box>
  );
}

function textInputStyle() {
  return {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  };
}

/* ------------------------------------------------------------------ */
/* 7. Production notes — DO / AVOID matrix.                           */
/* ------------------------------------------------------------------ */

const SERVICE_ROWS: ReadonlyArray<{
  service: string;
  category: ServiceCategory;
  status: IntegrationStatus;
}> = [
  { service: 'Firebase Analytics', category: SERVICE_CATEGORIES.analytics, status: INTEGRATION_STATUS.devBuildOnly },
  { service: 'Sentry', category: SERVICE_CATEGORIES.crashReporting, status: INTEGRATION_STATUS.missingKey },
  { service: 'Google OAuth', category: SERVICE_CATEGORIES.auth, status: INTEGRATION_STATUS.devBuildOnly },
  { service: 'Stripe', category: SERVICE_CATEGORIES.payments, status: INTEGRATION_STATUS.missingKey },
];

function ProductionNotesCard() {
  const demoKey = 'sk_live_AbC123XyZ987secret';
  return (
    <Section
      title="Production notes — ports, secrets, dev builds, consent"
      explanation="The four rules that keep third-party services honest in production. Each is a one-time architectural decision, not a per-screen discipline."
    >
      <Box gap="sm">
        <Box gap="xs">
          {SERVICE_ROWS.map((row) => {
            const maturity = integrationMaturity(row.status);
            return (
              <Box key={row.service} p="sm" radius="sm" bg="surfaceVariant">
                <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <Text variant="small" style={{ fontWeight: '600' }}>
                    {row.service}
                  </Text>
                  <Pill tone="muted">{serviceCategoryLabel(row.category)}</Pill>
                  <Pill tone={maturity.tone}>{maturity.label}</Pill>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Never log raw secrets / PII
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            Token truncated before it touches your logger / Sentry / analytics.
            Use <Text style={{ fontFamily: 'monospace' }}>redactSecret()</Text> at the port
            boundary so every call site is safe by default.
          </Text>
          <Box p="xs" radius="sm" bg="background" mt="xs">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
                raw
              </Text>
              <Text variant="small" style={{ fontFamily: 'monospace' }}>
                {demoKey}
              </Text>
            </Box>
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline', marginTop: 4 }}>
              <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
                redacted
              </Text>
              <Text variant="small" style={{ fontFamily: 'monospace' }}>
                {redactSecret(demoKey)}
              </Text>
            </Box>
          </Box>
        </Box>

        <DoAvoidMatrix />
      </Box>
    </Section>
  );
}

function DoAvoidMatrix() {
  return (
    <Box gap="xs">
      <Row tone="success" label="DO" body="Wrap every SDK behind a port (AnalyticsPort / CrashReportingPort / AuthPort / PaymentsPort); register the adapter in the container." />
      <Row tone="success" label="DO" body="Env-gate keys via core/config + EXPO_PUBLIC_*; rotate per environment (dev/staging/prod)." />
      <Row tone="success" label="DO" body="Move SDKs needing native code into a custom dev build (eas build --profile development)." />
      <Row tone="success" label="DO" body="Redact PII / tokens at the port boundary; respect IDFA / App Tracking Transparency consent before any analytics call." />
      <Row tone="danger" label="AVOID" body="import the SDK directly inside a component — that bakes the vendor into the call site." />
      <Row tone="danger" label="AVOID" body="Ship a server secret key (Stripe secret, OAuth client secret) in the JS bundle." />
      <Row tone="danger" label="AVOID" body="Log full tokens, emails, or passwords to Sentry / analytics / the console." />
      <Row tone="danger" label="AVOID" body="Assume Expo Go can run a native SDK — most cannot (Sentry / Firebase / Stripe)." />
    </Box>
  );
}

function Row({
  tone,
  label,
  body,
}: {
  tone: 'success' | 'danger';
  label: string;
  body: string;
}) {
  return (
    <Box row gap="sm" p="sm" radius="sm" bg="surfaceVariant" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
      <Pill tone={tone}>{label}</Pill>
      <Text variant="caption" style={{ flexShrink: 1 }}>
        {body}
      </Text>
    </Box>
  );
}

// Re-exported type for the spec to import without reaching into the hooks file.
export type { AnalyticsPort };
