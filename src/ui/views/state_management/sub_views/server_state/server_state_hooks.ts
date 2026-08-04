import { useCallback, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { container } from '../../../../../core/container';
import { ApiScenario } from '../../../../../core/scenario/api-scenario';
import type { Post } from '../../../../../domain/models/post';

/**
 * Server-state view logic — TanStack Query owns the cache, retry, loading/error
 * flags. The queryFn calls THIS app's GetPostsUseCase (clean architecture:
 * repository → usecase → query) and unwraps the Result<T>. The QueryClient +
 * <QueryClientProvider> wrap ONLY this view's demo subtree, NOT _layout. No
 * `any`; strict + erasableSyntaxOnly-clean.
 */

/**
 * The queryFn calls THIS app's GetPostsUseCase (clean architecture: repository
 * → usecase → query). It unwraps the Result<T>: ok → data, !ok → throw so Query
 * sees an error.
 */
export async function fetchPosts(): Promise<Post[]> {
  const result = await container.getPostsUseCase.execute();
  if (!result.ok) throw new Error(result.failure.message);
  return result.value;
}

export const POSTS_QUERY_KEY = ['posts'] as const;

export interface PostsQuery {
  data: Post[] | undefined;
  status: 'pending' | 'success' | 'error';
  error: unknown;
  refetch: () => void;
  isFetching: boolean;
}

/** The list that consumes the cached server state. */
export function usePostsQuery(): PostsQuery {
  const { data, status, error, refetch, isFetching } = useQuery({
    queryKey: POSTS_QUERY_KEY,
    queryFn: fetchPosts,
  });
  return { data, status, error, refetch, isFetching };
}

export interface PostsCacheProof {
  data: Post[] | undefined;
  status: 'pending' | 'success' | 'error';
}

/** A SECOND consumer of the SAME query key — it reads the cache, no new fetch. */
export function usePostsCacheProof(): PostsCacheProof {
  // Same queryKey → no second network call; it subscribes to the cache.
  const { data, status } = useQuery({
    queryKey: POSTS_QUERY_KEY,
    queryFn: fetchPosts,
  });
  return { data, status };
}

export interface ServerStateDemo {
  queryClient: QueryClient;
  scenario: ApiScenario;
  setScenarioAndLog: (next: ApiScenario) => void;
  /** Re-exported so the view wraps the demo subtree with the client. */
  QueryClientProvider: typeof QueryClientProvider;
}

/** Server-state demo: owns the QueryClient + the dev scenario knob. */
export function useServerStateDemo(): ServerStateDemo {
  // QueryClient created ONCE for this demo subtree.
  const [queryClient] = useState(() => new QueryClient());
  const [scenario, setScenario] = useState<ApiScenario>(ApiScenario.Success);

  const setScenarioAndLog = useCallback((next: ApiScenario) => {
    container.setApiScenario(next);
    setScenario(next);
  }, []);

  return { queryClient, scenario, setScenarioAndLog, QueryClientProvider };
}

/* -------------------------------------------------------------------------- */
/* Shared static content tables (kept co-located with the logic)              */
/* -------------------------------------------------------------------------- */

export const SERVER_STATE_SCENARIOS: ReadonlyArray<ApiScenario> = [
  ApiScenario.Success,
  ApiScenario.NetworkError,
  ApiScenario.ServerError,
];
