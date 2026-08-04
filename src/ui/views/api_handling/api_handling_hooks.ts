import { useEffect, useRef } from 'react';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import { useFailureToast } from '../../hooks/use-failure-toast';
import { usePosts } from '../../hooks/use-posts';

/**
 * API-handling view logic — owns the live demo's state + behaviour so the view
 * stays a dumb structure. Grounded in the real files:
 *   ui/hooks/use-posts.ts                          (state machine + dispatch)
 *   domain/usecases/get-posts-usecase.ts           (orchestration seam)
 *   domain/repositories/post-repository.ts         (port)
 *   data/repositories/post-repository-impl.ts      (offline-first impl)
 *   data/remote/post-remote-data-source.ts         (+ http-client.ts)
 *   data/local/daos/post-dao.ts                    (+ app-database.ts)
 *
 * The hook owns: usePosts state, the non-blocking toast warning effect, the
 * scenario/source knobs (driving the container), and the refetch entry point.
 * The pure `labelFor` helper is exported for unit testing.
 */

export interface ApiHandlingDemo {
  /** Live usePosts state (idle/loading/loaded/error + posts/warning/failure). */
  state: ReturnType<typeof usePosts>['state'];
  /** Re-run the current scenario through the real pipeline. */
  fetch: () => void;
  /** Non-blocking toast store for surfaced warnings. */
  toast: ReturnType<typeof useFailureToast>;
  /** Currently-active failure-injection scenario (read from the container). */
  apiScenario: ApiScenario;
  /** Whether the FakeApi (canned) source is active vs live jsonplaceholder. */
  useFakeApi: boolean;
  /** Switch the failure-injection scenario and force a cache miss + refetch. */
  setScenario: (next: ApiScenario) => void;
  /** Flip the FakeApi/live source and refetch. */
  toggleSource: () => void;
}

export function useApiHandlingDemo(): ApiHandlingDemo {
  const { state, fetch } = usePosts();
  const toast = useFailureToast();
  const lastWarningRef = useRef<unknown>(null);

  // Surface non-blocking warnings from the live fetch exactly once per value.
  useEffect(() => {
    if (state.status === 'loaded' && state.warning && state.warning !== lastWarningRef.current) {
      toast.show(state.warning);
      lastWarningRef.current = state.warning;
    }
  }, [state, toast]);

  const setScenario = (next: ApiScenario) => {
    container.setApiScenario(next);
    // Force a cache miss so the chosen scenario is immediately visible.
    void container.setDbScenario(DbScenario.Empty);
    fetch();
  };

  const toggleSource = () => {
    container.setUseFakeApi(!container.getUseFakeApi());
    fetch();
  };

  return {
    state,
    fetch,
    toast,
    apiScenario: container.getApiScenario(),
    useFakeApi: container.getUseFakeApi(),
    setScenario,
    toggleSource,
  };
}

/** Human-readable label for a failure-injection scenario button. Pure. */
export function labelFor(scenario: ApiScenario): string {
  switch (scenario) {
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
