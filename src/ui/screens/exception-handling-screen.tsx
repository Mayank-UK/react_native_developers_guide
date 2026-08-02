import { useCallback, useEffect, useRef, useState } from 'react';
import { ScreenScaffold } from '../components/screen-scaffold';
import { ShowError } from '../components/show-error';
import { ToastStack } from '../components/toast';
import { useFailureToast } from '../hooks/use-failure-toast';
import { usePosts, isBlocking } from '../hooks/use-posts';
import { Box, Button, Card, Text } from '../design-system';
import { container } from '../../core/container';
import { ApiScenario, API_SCENARIOS } from '../../core/scenario/api-scenario';
import { DbScenario, DB_SCENARIOS } from '../../core/scenario/db-scenario';
import {
  AppException,
  AppDatabaseException,
  NetworkException,
  ServerException,
} from '../../core/error-handling/exceptions';
import { type Failure, FailureSeverity, NetworkFailure } from '../../core/error-handling/failures';
import {
  chainedCacheFailure,
  forwardNetworkFailure,
  mapExceptionToFailure,
} from '../../core/error-handling/guards';
import { Section, Code, Pill } from '../components';

/**
 * Exception Handling screen — a teaching artifact for THIS app's two-stage error
 * pipeline. Grounded in the real files:
 *   core/error-handling/exceptions.ts  (AppException — data-layer, technical)
 *   core/error-handling/failures.ts    (Failure — domain/presentation, semantic)
 *   core/error-handling/guards.ts      (mapExceptionToFailure, safeRepositoryCall)
 *   data/repositories/post-repository-impl.ts  (offline-first cache fallback)
 *
 * Every concept ships a LIVE interactive demo:
 *   1. A pipeline playground that, for each ApiScenario, deterministically
 *      constructs the SAME AppException the real FakeApiService / interceptor
 *      throws, runs the REAL mapExceptionToFailure, and shows the resulting
 *      Failure kind + severity + chosen presentation — side by side with a live
 *      usePosts fetch that actually fires the toast / ShowError.
 *   2. A chain inspector that builds a compound (cache ← network) failure using
 *      the real chainedCacheFailure helper and prints Failure.chain.
 *
 * Single-file helpers (`Section`, `Code`, `Pill`, demo sub-components) stay local
 * per convention. No `any`; strict + erasure-clean.
 */
export function ExceptionHandlingScreen() {
  return (
    <ScreenScaffold
      title="Exception Handling"
      subtitle="Engine error → AppException → Failure → Result — the two-stage pipeline."
    >
      <IntroCard />
      <PipelineDiagramCard />
      <StageOneCard />
      <StageTwoCard />
      <SeverityPresentationCard />
      <LivePipelineCard />
      <ChainInspectorCard />
      <RecapCard />
    </ScreenScaffold>
  );
}
function IntroCard() {
  return (
    <Section title="The error pipeline">
      <Text variant="body">
        Most RN apps scatter{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          try/catch
        </Text>{' '}
        around fetches and show whatever the engine threw. This app does
        something more deliberate: errors cross{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          two stages
        </Text>{' '}
        before reaching the UI — a technical one and a semantic one — so a
        screen never has to know what HTTP, JSON, or AsyncStorage is.
      </Text>
      <Box gap="xs">
        {INTRO_ROWS.map((r) => (
          <Box key={r.stage} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.stage}
              </Text>
              <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
                {r.artifact}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.role}
            </Text>
          </Box>
        ))}
      </Box>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          The payoff: the UI switches only on{' '}
          <Text style={{ fontFamily: 'monospace' }}>Failure.severity</Text> —
          critical → full-screen{' '}
          <Text style={{ fontFamily: 'monospace' }}>&lt;ShowError/&gt;</Text>,
          warning/info → a non-blocking toast — and an offline-first{' '}
          <Text style={{ fontFamily: 'monospace' }}>Result.Success</Text> can
          carry data AND a soft warning in one value.
        </Text>
      </Box>
    </Section>
  );
}

const INTRO_ROWS: ReadonlyArray<{ stage: string; artifact: string; role: string }> = [
  {
    stage: 'Stage 1 — technical',
    artifact: 'AppException (data/)',
    role: 'What BROKE, in engine terms: NetworkException, ServerException, AppDatabaseException… Chained via .cause. Never shown to users.',
  },
  {
    stage: 'Stage 2 — semantic',
    artifact: 'Failure (domain/)',
    role: 'What to TELL the user and how LOUDLY: kind + severity + message. The only error type the UI ever imports.',
  },
  {
    stage: 'The bridge',
    artifact: 'Result<T> (core/)',
    role: 'Success<T,warning?> | Failed. Forces every fallible call site to acknowledge failure at the type level — no forgotten catch.',
  },
];

/* ------------------------------------------------------------------ */
/* 2. The pipeline diagram                                             */
/* ------------------------------------------------------------------ */

function PipelineDiagramCard() {
  return (
    <Section
      title="The pipeline — one error, four shapes"
      explanation="This is the exact path a fetch / storage / JSON error takes through the app. Each arrow is one real function in core/error-handling/guards.ts."
    >
      <Box gap="sm">
        <Code>{`engine error (fetch / AsyncStorage / JSON.parse)
   │   guardedApiCall  ──────────── data/remote + data/local catch
   ▼
AppException      (data-layer; typed; .cause chain)
   │   mapExceptionToFailure   ──── recursive over the cause chain
   ▼
Failure           (domain; kind + severity + message; .cause chain)
   │   safeRepositoryCall  ──────── with optional per-error fallbacks
   ▼                                    (e.g. serve cache on network error)
Result<T>         (Success<T,warning?> | Failed)   ── what the UI consumes`}</Code>
        <Box gap="xs">
          {STAGE_CALLERS.map((c) => (
            <Box key={c.fn} p="sm" radius="sm" bg="surfaceVariant">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                  {c.fn}
                </Text>
                <Text variant="caption" tone="muted">
                  {c.where}
                </Text>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {c.does}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Section>
  );
}

const STAGE_CALLERS: ReadonlyArray<{ fn: string; where: string; does: string }> = [
  {
    fn: 'guardedApiCall',
    where: 'data/remote/*',
    does: 'Wraps a raw fetch/storage op and upgrades the thrown engine signal (TypeError, SyntaxError, DOMException, non-2xx) into a typed AppException.',
  },
  {
    fn: 'mapExceptionToFailure',
    where: 'core/error-handling/guards.ts',
    does: 'Turns one AppException into one Failure, recursively mapping the .cause chain so nothing is lost.',
  },
  {
    fn: 'safeRepositoryCall',
    where: 'data/repositories/*',
    does: 'Wraps a repository method, catches exceptions, runs optional per-type fallbacks, and returns a Result<T>.',
  },
];

/* ------------------------------------------------------------------ */
/* 3. Stage one — AppException                                         */
/* ------------------------------------------------------------------ */

function StageOneCard() {
  return (
    <Section
      title="Stage 1 — AppException (technical, data-layer only)"
      explanation="The raw engine error wrapped in a typed, chainable exception. Subclassed by what broke. These live strictly inside data/; the UI never imports them."
    >
      <Box gap="sm">
        <Code>{`// core/error-handling/exceptions.ts
abstract class AppException extends Error {
  override readonly cause?: unknown;          // original engine error
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = this.constructor.name;        // "NetworkException", etc.
    this.cause = options.cause;               // preserved for the chain
  }
}
class NetworkException  extends AppException { … }   // fetch TypeError
class TimeoutException  extends NetworkException { … } // AbortController
class ServerException   extends AppException { … }   // non-2xx / bad JSON
class AuthException     extends AppException { … }   // 401/403
class AppDatabaseException extends AppException { … } // storage`}</Code>
        <Box gap="xs">
          {EXCEPTION_ROWS.map((r) => (
            <Box key={r.cls} p="sm" radius="sm" bg="surfaceVariant">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text variant="small" style={{ fontWeight: '600' }}>
                  {r.cls}
                </Text>
                <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                  {r.signal}
                </Text>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.note}
              </Text>
            </Box>
          ))}
        </Box>
        <Text variant="caption" tone="muted">
          Note the RN-specific adapter in{' '}
          <Text style={{ fontFamily: 'monospace' }}>toAppException</Text>: fetch's
          network failure is a{' '}
          <Text style={{ fontFamily: 'monospace' }}>TypeError</Text> (“Network
          request failed”), bad JSON is a{' '}
          <Text style={{ fontFamily: 'monospace' }}>SyntaxError</Text>, and a
          timeout is a <Text style={{ fontFamily: 'monospace' }}>DOMException</Text>{' '}
          named <Text style={{ fontFamily: 'monospace' }}>TimeoutError</Text>. The
          web guide keys off{' '}
          <Text style={{ fontFamily: 'monospace' }}>axios.isAxiosError</Text>; the
          two-stage pipeline is identical, only the engine adapter differs.
        </Text>
      </Box>
    </Section>
  );
}

const EXCEPTION_ROWS: ReadonlyArray<{ cls: string; signal: string; note: string }> = [
  { cls: 'NetworkException', signal: 'TypeError', note: 'fetch throws TypeError when DNS/offline/cert fails. TimeoutException extends it (an abort is conceptually a network failure).' },
  { cls: 'ServerException', signal: '!response.ok / SyntaxError', note: 'A non-2xx status → statusToException; unparseable body → "Invalid response format".' },
  { cls: 'AuthException', signal: '401 / 403', note: 'Mapped from status codes in statusToException — surfaces as a non-blocking Warning (let the UI re-auth).' },
  { cls: 'AppDatabaseException', signal: 'storage throw', note: 'Thrown by PostDao when the cache payload is corrupt or a read/write fails. Becomes a DatabaseFailure / CacheFailure.' },
];

/* ------------------------------------------------------------------ */
/* 4. Stage two — Failure (the mapping)                                */
/* ------------------------------------------------------------------ */

function StageTwoCard() {
  return (
    <Section
      title="Stage 2 — mapExceptionToFailure → Failure (semantic)"
      explanation="One function turns each AppException into a user-facing Failure, preserving the cause chain. The UI switches on kind + severity — never on HTTP concepts."
    >
      <Box gap="sm">
        <Code>{`// core/error-handling/guards.ts — recursive over the .cause chain
export function mapExceptionToFailure(e: AppException): Failure {
  const innerCause =
    e.cause instanceof AppException ? mapExceptionToFailure(e.cause) : undefined;
  if (e instanceof TimeoutException) return new NetworkFailure(e.message, innerCause);
  if (e instanceof NetworkException)  return new NetworkFailure(e.message, innerCause);
  if (e instanceof ServerException)   return new ServerFailure (e.message, innerCause);
  if (e instanceof AuthException)     return new AuthFailure   (e.message, innerCause);
  if (e instanceof AppDatabaseException) return new DatabaseFailure(e.message, innerCause);
  return new UnknownFailure(e.message, innerCause);
}`}</Code>
        <Box gap="xs">
          {MAPPING_ROWS.map((r) => (
            <Box key={r.exc} p="sm" radius="sm" bg="surfaceVariant" row gap="sm" style={{ alignItems: 'stretch' }}>
              <Box flex={1}>
                <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
                  exception
                </Text>
                <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
                  {r.exc}
                </Text>
              </Box>
              <Text variant="small" tone="muted" style={{ alignSelf: 'center' }}>
                →
              </Text>
              <Box flex={1}>
                <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
                  failure
                </Text>
                <Text variant="small" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                  {r.fail}
                </Text>
              </Box>
              <Box flex={1}>
                <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
                  severity
                </Text>
                <Pill tone={r.sev === FailureSeverity.Critical ? 'danger' : 'primary'}>
                  {r.sev}
                </Pill>
              </Box>
            </Box>
          ))}
        </Box>
        <Text variant="caption" tone="muted">
          Two things make this decoupling valuable: (1) the UI imports{' '}
          <Text style={{ fontFamily: 'monospace' }}>Failure</Text> only — it has no
          idea axios/fetch/AsyncStorage exist; (2) you can change how loudly an error
          is surfaced by editing one severity here, not by hunting through screens.
        </Text>
      </Box>
    </Section>
  );
}

const MAPPING_ROWS: ReadonlyArray<{
  exc: string;
  fail: string;
  sev: FailureSeverity;
}> = [
  { exc: 'NetworkException', fail: 'NetworkFailure', sev: FailureSeverity.Critical },
  { exc: 'TimeoutException', fail: 'NetworkFailure', sev: FailureSeverity.Critical },
  { exc: 'ServerException', fail: 'ServerFailure', sev: FailureSeverity.Critical },
  { exc: 'AuthException', fail: 'AuthFailure', sev: FailureSeverity.Warning },
  { exc: 'AppDatabaseException', fail: 'DatabaseFailure', sev: FailureSeverity.Critical },
];

/* ------------------------------------------------------------------ */
/* 5. Severity → presentation                                          */
/* ------------------------------------------------------------------ */

function SeverityPresentationCard() {
  return (
    <Section
      title="Severity → presentation (and the offline-first warning)"
      explanation="One field — Failure.severity — decides the UI. Critical blocks the screen; warning/info does not. And Result.Success may carry a non-blocking warning: stale data + a network failure in a single value."
    >
      <Box gap="xs">
        {SEVERITY_ROWS.map((r) => (
          <Box key={r.level} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Pill tone={r.level === FailureSeverity.Critical ? 'danger' : 'primary'}>
                {r.level}
              </Pill>
              <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
                {r.render}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.note}
            </Text>
          </Box>
        ))}
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            The offline-first trick: Success&lt;T, warning?&gt;
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            A network failure is not necessarily a hard error. If a cache exists,
            the repository returns{' '}
            <Text style={{ fontFamily: 'monospace' }}>success(posts, networkFailure)</Text>{' '}
            — the call SUCCEEDS, the data renders, and the warning fires a
            dismissible toast (“showing offline data”). One value carries both the
            data and the soft notice, instead of forcing an either/or.
          </Text>
        </Box>
        <Code>{`// src/ui/hooks/use-posts.ts — the UI's only branching
if (result.ok) {
  dispatch({ type: 'loaded', posts: result.value, warning: result.warning });
} else {
  dispatch({ type: 'error', failure: result.failure });
}

// In the screen:
if (isBlocking(failure)) return <ShowError message={failure.message} onRetry={…} />;
//   else → toast (useFailureToast) for warnings/info.`}</Code>
      </Box>
    </Section>
  );
}

const SEVERITY_ROWS: ReadonlyArray<{
  level: FailureSeverity;
  render: string;
  note: string;
}> = [
  {
    level: FailureSeverity.Critical,
    render: '<ShowError/> (full-screen)',
    note: 'The screen has no data. Blocks all interaction, offers Retry. NetworkFailure / ServerFailure / DatabaseFailure / UnknownFailure.',
  },
  {
    level: FailureSeverity.Warning,
    render: 'Toast (non-blocking)',
    note: 'Data is still usable or the error is recoverable. AuthFailure (re-auth), CacheFailure when stale data was served.',
  },
  {
    level: FailureSeverity.Info,
    render: 'Toast (dismissible)',
    note: 'Gentlest notice. Rare in practice — reserved for purely informational, fully-recoverable events.',
  },
];

/* ------------------------------------------------------------------ */
/* 6. LIVE pipeline playground                                         */
/* ------------------------------------------------------------------ */

/**
 * Deterministically construct the SAME AppException the real data layer throws
 * for a given ApiScenario — mirrors the logic in FakeApiService and the
 * FailureInjectionInterceptor. Used so the playground can show the exception →
 * failure mapping INSTANTLY (no network round-trip), while the live usePosts
 * fetch below proves the same mapping drives the actual UI.
 */
function exceptionForScenario(api: ApiScenario): AppException {
  switch (api) {
    case ApiScenario.NetworkError:
      return new NetworkException('Simulated no internet connection');
    case ApiScenario.Timeout:
      return new NetworkException('Simulated request timed out');
    case ApiScenario.ServerError:
      return new ServerException('Simulated server returned 500');
    case ApiScenario.InvalidJson:
      return new ServerException('Simulated invalid response format');
    case ApiScenario.Success:
    default:
      return new ServerException('(success path — no exception)');
  }
}

/** Severity → coloured pill label, reused across the playground. */
function severityTone(sev: FailureSeverity): 'danger' | 'primary' | 'muted' {
  return sev === FailureSeverity.Critical ? 'danger' : sev === FailureSeverity.Warning ? 'primary' : 'muted';
}

function LivePipelineCard() {
  const { state, fetch } = usePosts();
  const toast = useFailureToast();
  const [api, setApi] = useState<ApiScenario>(ApiScenario.Success);
  const [db, setDb] = useState<DbScenario>(DbScenario.Success);
  const lastWarningRef = useRef<unknown>(null);

  // Surface non-blocking warnings from the live fetch exactly once per value.
  useEffect(() => {
    if (state.status === 'loaded' && state.warning && state.warning !== lastWarningRef.current) {
      toast.show(state.warning);
      lastWarningRef.current = state.warning;
    }
  }, [state, toast]);

  const run = useCallback(
    (nextApi: ApiScenario, nextDb: DbScenario) => {
      setApi(nextApi);
      setDb(nextDb);
      container.setApiScenario(nextApi);
      container.setDbScenario(nextDb);
      fetch();
    },
    [fetch],
  );

  // Deterministic mapping for the currently-selected api scenario (instant).
  const exc = exceptionForScenario(api);
  const isSuccessScenario = api === ApiScenario.Success;
  const mapped: Failure = isSuccessScenario
    ? new NetworkFailure('(n/a)') // placeholder, not shown on success
    : mapExceptionToFailure(exc);

  return (
    <Section
      title="LIVE — pipeline playground (scenario → exception → failure → UI)"
      explanation="Tap an API scenario. The top block deterministically runs the REAL mapExceptionToFailure on the same exception the data layer would throw — so you see the mapping instantly. The bottom block runs the SAME scenario through the real container + usePosts, so you watch the toast / full-screen ShowError actually fire."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {API_SCENARIOS.map((s) => (
            <Button
              key={s}
              title={apiLabel(s)}
              variant={api === s ? 'filled' : 'outline'}
              onPress={() => run(s, db)}
            />
          ))}
        </Box>
        <Box row gap="xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Text variant="caption" tone="muted">
            db cache:
          </Text>
          {DB_SCENARIOS.map((s) => (
            <Button
              key={s}
              title={dbLabel(s)}
              variant={db === s ? 'filled' : 'ghost'}
              onPress={() => run(api, s)}
            />
          ))}
          <Button title="refetch" variant="ghost" onPress={fetch} />
        </Box>

        {/* Deterministic mapping block (instant). */}
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            STAGE-BY-STAGE (deterministic, via the real guards)
          </Text>
          <Box gap="xs" mt="xs">
            <StageRow label="engine signal" value={engineSignal(api)} mono />
            <StageRow
              label="AppException"
              value={isSuccessScenario ? '— (success path)' : exc.constructor.name}
              mono
              tone="primary"
            />
            <StageRow
              label="Failure.kind"
              value={isSuccessScenario ? '—' : mapped.kind}
              mono
            />
            <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
                Failure.severity
              </Text>
              {isSuccessScenario ? (
                <Text variant="caption">—</Text>
              ) : (
                <Pill tone={severityTone(mapped.severity)}>{mapped.severity}</Pill>
              )}
            </Box>
            <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
                presentation
              </Text>
              <Pill tone={presentationTone(api, db)}>{presentationFor(api, db)}</Pill>
            </Box>
          </Box>
        </Box>

        {/* Live fetch block (actually fires toast / ShowError). */}
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            LIVE FETCH (container → usecase → repo → remote/local → Result)
          </Text>
          <Box mt="xs">
            <LiveFetchBody state={state} onRetry={fetch} />
          </Box>
        </Box>

        <Code>{`// data/repositories/post-repository-impl.ts — the offline-first branch
async getPosts() {
  return safeRepositoryCall<Post[]>({
    call: async () => {
      const remote = await this.remote.getPosts();   // throws AppException
      await this.local.insertPosts(remote);          // best-effort cache write
      return remote.map(toPost);
    },
    onNetworkError: (c) => this.serveFromCache(c),   // ← fallback on failure
    onServerError:  (c) => this.serveFromCache(c),
  });
}
// serveFromCache:
//   cache hit       → success(posts, networkFailure)   [non-blocking warning]
//   cache empty     → failed(networkFailure)            [blocking]
//   cache read fail → chainedCacheFailure(…)            [blocking, CHAINED]`}</Code>
        <Text variant="caption" tone="muted">
          The api-handling screen demonstrates the same pipeline end-to-end on
          real posts; this one isolates the exception → failure → presentation
          mechanics so you can see WHY each scenario surfaces the way it does.
        </Text>
      </Box>
      <ToastStack entries={toast.entries} onDismiss={toast.dismiss} />
    </Section>
  );
}

function StageRow({
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

function LiveFetchBody({
  state,
  onRetry,
}: {
  state: ReturnType<typeof usePosts>['state'];
  onRetry: () => void;
}) {
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <Text variant="small" tone="muted">
        fetching…
      </Text>
    );
  }
  if (state.status === 'error') {
    if (isBlocking(state.failure)) {
      return <ShowError message={state.failure.message} onRetry={onRetry} />;
    }
    return (
      <Text variant="small" tone="danger">
        non-blocking error: {state.failure.message}
      </Text>
    );
  }
  // loaded
  return (
    <Box gap="xs">
      <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Pill tone="primary">{`${state.posts.length} posts`}</Pill>
        {state.warning ? (
          <Pill tone="primary">{`warning: ${state.warning.kind}`}</Pill>
        ) : null}
      </Box>
      {state.posts.slice(0, 2).map((p) => (
        <Text key={p.id} variant="caption" tone="muted">
          #{p.id} {p.title}
        </Text>
      ))}
    </Box>
  );
}

function apiLabel(s: ApiScenario): string {
  switch (s) {
    case ApiScenario.Success:
      return 'Success';
    case ApiScenario.NetworkError:
      return 'Network';
    case ApiScenario.Timeout:
      return 'Timeout';
    case ApiScenario.ServerError:
      return 'Server';
    case ApiScenario.InvalidJson:
      return 'Bad JSON';
  }
}

function dbLabel(s: DbScenario): string {
  switch (s) {
    case DbScenario.Success:
      return 'cache hit';
    case DbScenario.Empty:
      return 'empty';
    case DbScenario.ReadError:
      return 'read fail';
    case DbScenario.WriteError:
      return 'write fail';
  }
}

function engineSignal(api: ApiScenario): string {
  switch (api) {
    case ApiScenario.Success:
      return '200 OK + valid JSON';
    case ApiScenario.NetworkError:
      return 'TypeError: Network request failed';
    case ApiScenario.Timeout:
      return 'DOMException: TimeoutError (AbortController)';
    case ApiScenario.ServerError:
      return 'response.ok === false (500)';
    case ApiScenario.InvalidJson:
      return 'SyntaxError: Unexpected token';
  }
}

/** What the user will see, given both knobs (mirrors serveFromCache). */
function presentationFor(api: ApiScenario, db: DbScenario): string {
  if (api === ApiScenario.Success) return 'posts render (no toast)';
  const isNetworkLike =
    api === ApiScenario.NetworkError || api === ApiScenario.Timeout;
  // network/timeout/server fall back to cache
  if (db === DbScenario.Success) return 'toast (stale cache + warning)';
  if (db === DbScenario.Empty) return isNetworkLike ? 'full-screen ShowError' : 'full-screen ShowError';
  if (db === DbScenario.ReadError) return 'full-screen ShowError (chained)';
  return 'full-screen ShowError';
}

function presentationTone(
  api: ApiScenario,
  db: DbScenario,
): 'muted' | 'primary' | 'danger' {
  if (api === ApiScenario.Success) return 'primary';
  if (db === DbScenario.Success) return 'primary'; // non-blocking warning
  return 'danger';
}

/* ------------------------------------------------------------------ */
/* 7. Chain inspector — compound failures                              */
/* ------------------------------------------------------------------ */

/**
 * Build the three real Failure shapes the repository produces, using the actual
 * helpers (forwardNetworkFailure / success(…) / chainedCacheFailure) on a real
 * upstream exception — so the printed `.chain` is exactly what a log line would
 * show.
 */
function buildCompoundExamples(): ReadonlyArray<{ label: string; failure: Failure; note: string }> {
  const upstreamExc: AppException = new NetworkException('No internet connection');
  const dbError: AppDatabaseException = new AppDatabaseException('Cache read failed');

  return [
    {
      label: 'Blocking — empty cache',
      failure: forwardNetworkFailure(upstreamExc).failure,
      note: 'Remote failed AND the cache was empty. The upstream NetworkFailure is the whole story — one link.',
    },
    {
      label: 'Non-blocking — stale cache + warning',
      failure: new NetworkFailure('No internet connection'),
      note: 'Remote failed but a cache was served. Result.Success carries this NetworkFailure as a non-blocking warning (data + soft notice in one value).',
    },
    {
      label: 'Chained — cache read ALSO failed',
      failure: chainedCacheFailure(dbError, mapExceptionToFailure(upstreamExc)).failure,
      note: 'The worst case: remote failed, then the cache fallback threw too. A CacheFailure CHAINED on the NetworkFailure — Critical, and .chain reconstructs the whole story.',
    },
  ];
}

function ChainInspectorCard() {
  const [idx, setIdx] = useState(2); // start on the chained one — most illustrative
  const examples = buildCompoundExamples();
  const current = examples[idx]!;

  return (
    <Section
      title="Chain inspector — compound failures reconstruct the story"
      explanation="Both AppException.cause and Failure.cause chain, so a compound failure (“served nothing, because cache read failed, because the network was down”) prints its whole causal story for logs via Failure.chain. These are the REAL helpers the repository uses."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {examples.map((e, i) => (
            <Button
              key={e.label}
              title={e.label}
              variant={idx === i ? 'filled' : 'outline'}
              onPress={() => setIdx(i)}
            />
          ))}
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant">
          <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
              built with
            </Text>
            <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
              {buildCall(idx)}
            </Text>
          </Box>
          <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }} mt="xs">
            <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
              severity
            </Text>
            <Pill tone={current.failure.severity === FailureSeverity.Critical ? 'danger' : 'primary'}>
              {current.failure.severity}
            </Pill>
            <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
              kind
            </Text>
            <Text variant="small" style={{ fontFamily: 'monospace' }}>
              {current.failure.kind}
            </Text>
          </Box>
        </Box>

        <Text variant="caption" tone="muted">
          {current.note}
        </Text>

        <Code>{`// Failure.chain — multi-line trace, what the logger writes:
${current.failure.chain}

// Failure.message — single joined line:
${current.failure.message}`}</Code>

        <Text variant="caption" tone="muted">
          The chain is preserved across BOTH stages:{' '}
          <Text style={{ fontFamily: 'monospace' }}>mapExceptionToFailure</Text>{' '}
          recurses through <Text style={{ fontFamily: 'monospace' }}>AppException.cause</Text>{' '}
          so each technical link becomes a Failure link, and{' '}
          <Text style={{ fontFamily: 'monospace' }}>chainedCacheFailure</Text>{' '}
          stacks a CacheFailure on top — giving you a log line that reads like a
          sentence.
        </Text>
      </Box>
    </Section>
  );
}

function buildCall(idx: number): string {
  return [
    'forwardNetworkFailure(networkExc).failure',
    'success(posts, networkFailure)  // Result',
    'chainedCacheFailure(dbError, networkFailure).failure',
  ][idx] ?? '';
}

/* ------------------------------------------------------------------ */
/* 8. Recap                                                            */
/* ------------------------------------------------------------------ */

function RecapCard() {
  return (
    <Section
      title="Recap — the pipeline in one breath"
      explanation="Four invariants. They are why errors in this app look the way they do."
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
    title: 'Two stages, not one',
    body: 'AppException (technical, data/) → Failure (semantic, domain). The UI reasons only about Failure.kind/severity and never imports HTTP/storage concepts.',
  },
  {
    title: 'Causality is preserved',
    body: 'Both .cause chains recurse. A compound failure reconstructs its whole story for logs via Failure.chain — never lose the root cause.',
  },
  {
    title: 'Severity drives presentation',
    body: 'Critical → full-screen <ShowError/>; Warning/Info → non-blocking toast. One field decides; no scattered if/else across screens.',
  },
  {
    title: 'Success can still warn',
    body: 'Result.Success<T, warning?> carries stale data + a network failure in one value. That is the offline-first pattern — a soft notice, not a hard error.',
  },
];

