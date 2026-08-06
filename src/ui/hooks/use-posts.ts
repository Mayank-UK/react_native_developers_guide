import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { Post } from '../../domain/models/post';
import type { Failure } from '../../core/error-handling/failures';
import { FailureSeverity } from '../../core/error-handling/failures';
import type { GetPostsUseCase } from '../../domain/usecases/get-posts-usecase';
import { container } from '../../core/container';
import { assertNever } from '../../core/utils/types';

/**
 * usePosts — the React analogue of the Flutter `PostsBloc` / web guide's
 * `usePosts`. It owns the `idle / loading / loaded(warning?) / error(failure)`
 * state machine, drives the `GetPostsUseCase`, and surfaces the resulting
 * `Failure` so the UI can branch on severity (blocking ShowError vs non-blocking
 * toast).
 *
 * Idiomatic React here is a `useReducer` store exposed via a hook — same states,
 * same transitions, no extra library.
 */

type PostsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; posts: Post[]; warning?: Failure }
  | { status: 'error'; failure: Failure };

type PostsAction =
  | { type: 'fetch' }
  | { type: 'loaded'; posts: Post[]; warning?: Failure }
  | { type: 'error'; failure: Failure };

function reducer(_state: PostsState, action: PostsAction): PostsState {
  switch (action.type) {
    case 'fetch':
      return { status: 'loading' };
    case 'loaded':
      return { status: 'loaded', posts: action.posts, warning: action.warning };
    case 'error':
      return { status: 'error', failure: action.failure };
    default:
      // Exhaustiveness: adding a new PostsAction variant without handling it
      // here becomes a compile error.
      assertNever(action);
  }
}

export interface UsePostsResult {
  state: PostsState;
  fetch: () => void;
}

export function usePosts(
  getPostsUseCase: GetPostsUseCase = container.getPostsUseCase,
): UsePostsResult {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });

  const fetch = useCallback(() => {
    let cancelled = false;
    void (async () => {
      dispatch({ type: 'fetch' });
      const result = await getPostsUseCase.execute();
      if (cancelled) return;
      if (result.ok) {
        dispatch({
          type: 'loaded',
          posts: result.value,
          warning: result.warning,
        });
      } else {
        dispatch({ type: 'error', failure: result.failure });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getPostsUseCase]);

  useEffect(() => {
    const cleanup = fetch();
    return cleanup;
  }, [fetch]);

  return useMemo(() => ({ state, fetch }), [state, fetch]);
}

/** True when a failure should block the whole screen (critical). */
export function isBlocking(failure: Failure): boolean {
  return failure.severity === FailureSeverity.Critical;
}
