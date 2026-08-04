import { useCallback, useEffect, useRef, useState } from 'react';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import {
  AppException,
  AppDatabaseException,
  NetworkException,
  ServerException,
} from '../../../core/error-handling/exceptions';
import { type Failure, FailureSeverity, NetworkFailure } from '../../../core/error-handling/failures';
import {
  chainedCacheFailure,
  forwardNetworkFailure,
  mapExceptionToFailure,
} from '../../../core/error-handling/guards';
import { useFailureToast } from '../../hooks/use-failure-toast';
import { usePosts } from '../../hooks/use-posts';

/**
 * Exception-handling view logic — owns the two LIVE demos' state + behaviour so
 * the view stays a dumb structure. Grounded in the real files:
 *   core/error-handling/exceptions.ts / failures.ts / guards.ts
 *
 * Two hooks:
 *  - usePipelineDemo: scenario knobs + the deterministic exception→failure
 *    mapping, AND the live usePosts fetch whose warnings it surfaces once.
 *  - useChainInspector: which compound-failure example is selected.
 *
 * Pure helpers below compute the SAME shapes the real data layer produces, so
 * what the playground prints matches what a log line would.
 */

export interface PipelineDemo {
  api: ApiScenario;
  db: DbScenario;
  /** Switch both knobs and fire the real fetch through the container. */
  run: (nextApi: ApiScenario, nextDb: DbScenario) => void;
  /** Re-run the current scenario through the real pipeline. */
  fetch: () => void;
  /** Live usePosts state (idle/loading/loaded/error + posts/warning/failure). */
  state: ReturnType<typeof usePosts>['state'];
  /** Non-blocking toast store for surfaced warnings. */
  toast: ReturnType<typeof useFailureToast>;
  /** Deterministic mapping block values (instant — no network round-trip). */
  exc: AppException;
  isSuccessScenario: boolean;
  mapped: Failure;
}

export function usePipelineDemo(): PipelineDemo {
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

  return { api, db, run, fetch, state, toast, exc, isSuccessScenario, mapped };
}

export interface ChainInspector {
  idx: number;
  setIdx: (i: number) => void;
  examples: ReadonlyArray<{ label: string; failure: Failure; note: string }>;
  current: { label: string; failure: Failure; note: string };
}

export function useChainInspector(): ChainInspector {
  const [idx, setIdx] = useState(2); // start on the chained one — most illustrative
  const examples = buildCompoundExamples();
  const current = examples[idx]!;
  return { idx, setIdx, examples, current };
}

/* -------------------------------------------------------------------------- */
/* Pure domain helpers — compute the SAME shapes the real data layer produces */
/* -------------------------------------------------------------------------- */

/**
 * Deterministically construct the SAME AppException the real data layer throws
 * for a given ApiScenario — mirrors FakeApiService + FailureInjectionInterceptor.
 */
export function exceptionForScenario(api: ApiScenario): AppException {
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

/** Severity → coloured pill label. */
export function severityTone(sev: FailureSeverity): 'danger' | 'primary' | 'muted' {
  return sev === FailureSeverity.Critical ? 'danger' : sev === FailureSeverity.Warning ? 'primary' : 'muted';
}

/** What the user will see, given both knobs (mirrors serveFromCache). */
export function presentationFor(api: ApiScenario, db: DbScenario): string {
  if (api === ApiScenario.Success) return 'posts render (no toast)';
  // network/timeout/server fall back to cache
  if (db === DbScenario.Success) return 'toast (stale cache + warning)';
  if (db === DbScenario.Empty) return 'full-screen ShowError';
  if (db === DbScenario.ReadError) return 'full-screen ShowError (chained)';
  return 'full-screen ShowError';
}

export function presentationTone(api: ApiScenario, db: DbScenario): 'muted' | 'primary' | 'danger' {
  if (api === ApiScenario.Success) return 'primary';
  if (db === DbScenario.Success) return 'primary'; // non-blocking warning
  return 'danger';
}

export function engineSignal(api: ApiScenario): string {
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

export function apiLabel(s: ApiScenario): string {
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

export function dbLabel(s: DbScenario): string {
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

/**
 * Build the three real Failure shapes the repository produces, using the actual
 * helpers (forwardNetworkFailure / chainedCacheFailure) on a real upstream
 * exception — so the printed `.chain` is exactly what a log line would show.
 */
export function buildCompoundExamples(): ReadonlyArray<{ label: string; failure: Failure; note: string }> {
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

export function buildCall(idx: number): string {
  return (
    [
      'forwardNetworkFailure(networkExc).failure',
      'success(posts, networkFailure)  // Result',
      'chainedCacheFailure(dbError, networkFailure).failure',
    ][idx] ?? ''
  );
}
