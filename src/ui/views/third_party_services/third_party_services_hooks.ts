import { useRef, useState } from 'react';

/**
 * Third-party Services — view logic. The keystone lesson of this screen is the
 * PORT pattern: wrap every third-party SDK behind YOUR OWN interface so the
 * app depends on your abstraction, not the vendor. This mirrors the app's
 * existing DI + repository-port architecture (see the cited `core/container`
 * + `domain/repositories/post-repository.ts` in the view's `<Code>` blocks).
 *
 * No third-party SDK is installed (Sentry / Firebase / Stripe / expo-auth-session
 * would all need native modules + keys + a dev build). Instead the LIVE demo
 * uses a self-contained `MockAnalytics` implementation of the `AnalyticsPort`
 * so events are observable in-memory without any SDK.
 *
 * React-19-safe: setState in handlers, never nested inside an updater; pure
 * updaters only. No `any`; const-object + literal unions (no enums).
 */

/* ------------------------------------------------------------------ */
/* Const-object catalogues (erasable; no `enum`).                     */
/* ------------------------------------------------------------------ */

/** The four third-party service categories taught on this screen. */
export const SERVICE_CATEGORIES = {
  analytics: 'analytics',
  crashReporting: 'crash-reporting',
  auth: 'auth',
  payments: 'payments',
} as const;

export type ServiceCategory =
  (typeof SERVICE_CATEGORIES)[keyof typeof SERVICE_CATEGORIES];

/** Whether a (hypothetical) integration is wired in this app. */
export const INTEGRATION_STATUS = {
  configured: 'configured',
  missingKey: 'missing-key',
  devBuildOnly: 'dev-build-only',
} as const;

export type IntegrationStatus =
  (typeof INTEGRATION_STATUS)[keyof typeof INTEGRATION_STATUS];

/* ------------------------------------------------------------------ */
/* The port — the keystone abstraction.                               */
/* ------------------------------------------------------------------ */

/**
 * AnalyticsPort — the contract the rest of the app depends on. A real
 * implementation would delegate to `@react-native-firebase/analytics`,
 * Amplitude, PostHog, etc.; a dev/test implementation (MockAnalytics) records
 * into an in-memory ring buffer. Because call sites depend on THIS interface
 * (not the SDK), swapping vendors is a one-line wiring change in the container,
 * and tests run with zero native-module mocking.
 *
 * Mirrors the existing repository-port pattern: the UI depends on
 * `PostRepository` (interface), the container registers a `PostRepositoryImpl`.
 */
export interface AnalyticsPort {
  /** Fire an event with optional structured properties. */
  track(event: string, props?: Record<string, string | number | boolean>): void;
  /** Associate the current user with an id + traits. */
  identify(userId: string, traits?: Record<string, string | number | boolean>): void;
  /** Clear the current user (sign-out / privacy request). */
  reset(): void;
}

/* ------------------------------------------------------------------ */
/* Pure helpers.                                                      */
/* ------------------------------------------------------------------ */

/**
 * Human-readable label for a service category. Pure: same input → same output.
 */
export function serviceCategoryLabel(category: ServiceCategory): string {
  switch (category) {
    case SERVICE_CATEGORIES.analytics:
      return 'Analytics';
    case SERVICE_CATEGORIES.crashReporting:
      return 'Crash reporting';
    case SERVICE_CATEGORIES.auth:
      return 'Auth (OAuth)';
    case SERVICE_CATEGORIES.payments:
      return 'Payments';
    default: {
      // Exhaustiveness guard — no `any`, no `never` cast.
      const exhaustive: unknown = category;
      return String(exhaustive);
    }
  }
}

/**
 * Redact a secret for safe display in logs / crash reports / UI. Keeps the
 * first 2 and last 2 chars of a token and masks the middle with '…'. Short or
 * empty input is fully masked so length does not leak. This is the production
 * pattern for "never log raw secrets / PII".
 *
 * Pure: same input → same output, no side effects.
 */
export function redactSecret(secret: string): string {
  const s = secret ?? '';
  if (s.length <= 4) {
    // Never reveal short tokens — length itself can identify the secret class.
    return s.length === 0 ? '(empty)' : '••••';
  }
  const head = s.slice(0, 2);
  const tail = s.slice(-2);
  return head + '…' + tail;
}

/**
 * Whether a hypothetical service is "ready" given its status. Pure presentational
 * helper used by the production-notes matrix.
 */
export function integrationMaturity(status: IntegrationStatus): {
  label: string;
  tone: 'success' | 'danger' | 'muted';
} {
  switch (status) {
    case INTEGRATION_STATUS.configured:
      return { label: 'configured', tone: 'success' };
    case INTEGRATION_STATUS.missingKey:
      return { label: 'missing key', tone: 'danger' };
    case INTEGRATION_STATUS.devBuildOnly:
      return { label: 'dev-build only', tone: 'muted' };
    default: {
      const exhaustive: unknown = status;
      return { label: String(exhaustive), tone: 'muted' as const };
    }
  }
}

/* ------------------------------------------------------------------ */
/* MockAnalytics — the LIVE demo's in-memory implementation.          */
/* ------------------------------------------------------------------ */

/** One captured analytics event (or identify/reset) in the demo log. */
export interface CapturedEvent {
  /** Monotonic id so the FlatList/render key is stable. */
  id: number;
  /** The operation kind: a `track` event name, or `identify` / `reset`. */
  kind: string;
  /** Optional properties / traits, formatted as a stable JSON string. */
  detail?: string;
  /** ISO timestamp for display only (not parsed by anything). */
  at: string;
}

/** Maximum events retained in the ring buffer (keeps UI bounded). */
const RING_BUFFER_CAP = 25;

/**
 * An in-memory `AnalyticsPort` implementation. Each call captures a
 * `CapturedEvent` into a capped ring buffer that the playground hook reads.
 * This is exactly the shape a real `FirebaseAnalytics` adapter would take —
 * only the body of `track`/`identify`/`reset` changes (it would forward to the
 * SDK instead of pushing to a buffer).
 */
export class MockAnalytics implements AnalyticsPort {
  private readonly events: CapturedEvent[] = [];
  private seq = 0;

  /** Returns a snapshot of the captured events (newest last). */
  captured(): readonly CapturedEvent[] {
    return this.events;
  }

  track(
    event: string,
    props?: Record<string, string | number | boolean>,
  ): void {
    this.push(event, props);
  }

  identify(
    userId: string,
    traits?: Record<string, string | number | boolean>,
  ): void {
    this.push('identify', { userId, ...(traits ?? {}) });
  }

  reset(): void {
    this.push('reset');
  }

  /** Clear the buffer (used by the playground's "Clear" button). */
  flush(): void {
    this.events.length = 0;
  }

  private push(
    kind: string,
    props?: Record<string, string | number | boolean>,
  ): void {
    this.seq += 1;
    this.events.push({
      id: this.seq,
      kind,
      detail: props ? stableStringify(props) : undefined,
      at: new Date().toISOString(),
    });
    if (this.events.length > RING_BUFFER_CAP) {
      // Drop the oldest so the buffer never grows unbounded.
      this.events.shift();
    }
  }
}

/**
 * Stable, key-sorted JSON.stringify so captured event detail is deterministic
 * (the same call renders identically across renders / spec runs). Also avoids
 * the BigInt/Symbol JSON crash path documented in the bug history.
 */
function stableStringify(value: Record<string, unknown>): string {
  const seen: Array<[string, unknown]> = Object.entries(value).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const out: Record<string, unknown> = {};
  for (const [k, v] of seen) {
    out[k] = v;
  }
  return JSON.stringify(out);
}

/* ------------------------------------------------------------------ */
/* useAnalyticsPlayground — owns the LIVE demo state.                 */
/* ------------------------------------------------------------------ */

export interface AnalyticsPlayground {
  /** Current event-name draft (TextInput value). */
  draft: string;
  /** Update the draft from the TextInput. */
  setDraft: (v: string) => void;
  /** Current identify userId draft. */
  userIdDraft: string;
  /** Update the identify userId draft. */
  setUserIdDraft: (v: string) => void;
  /** The captured events (newest last, capped to RING_BUFFER_CAP). */
  events: readonly CapturedEvent[];
  /** Fire a `track` event with the current draft + a couple of demo props. */
  track: () => void;
  /** Fire an `identify` call with the current userId draft. */
  identify: () => void;
  /** Fire a `reset` call (sign-out / privacy). */
  reset: () => void;
  /** Clear the captured-events log. */
  clear: () => void;
}

/**
 * LIVE demo hook. Owns the `MockAnalytics` instance + the two TextInput drafts.
 * React-19-safe: each handler builds the new captured-events array OUTSIDE the
 * setState (the MockAnalytics mutates its own internal array, then we hand React
 * a brand-new array reference so it re-renders without setState-in-updater).
 *
 * The instance lives in a ref so it survives re-renders unchanged (the same way
 * the container holds a singleton; here it's local to the screen).
 */
export function useAnalyticsPlayground(): AnalyticsPlayground {
  // useRef so the MockAnalytics instance is stable across renders (one port
  // per screen, exactly like one repository per container).
  const analyticsRef = useRef<MockAnalytics | null>(null);
  if (analyticsRef.current === null) {
    analyticsRef.current = new MockAnalytics();
  }
  const analytics = analyticsRef.current;

  const [draft, setDraft] = useState('');
  const [userIdDraft, setUserIdDraft] = useState('');
  const [events, setEvents] = useState<readonly CapturedEvent[]>([]);

  const snapshot = (): readonly CapturedEvent[] => analytics.captured().slice();

  const track = (): void => {
    const name = draft.trim();
    if (name.length === 0) return;
    analytics.track(name, { source: 'playground', count: name.length });
    // setState in the handler, not inside an updater — pure assignment.
    setEvents(snapshot());
    setDraft('');
  };

  const identify = (): void => {
    const id = userIdDraft.trim();
    if (id.length === 0) return;
    analytics.identify(id, { plan: 'demo' });
    setEvents(snapshot());
    setUserIdDraft('');
  };

  const reset = (): void => {
    analytics.reset();
    setEvents(snapshot());
  };

  const clear = (): void => {
    analytics.flush();
    setEvents([]);
  };

  return {
    draft,
    setDraft,
    userIdDraft,
    setUserIdDraft,
    events,
    track,
    identify,
    reset,
    clear,
  };
}
