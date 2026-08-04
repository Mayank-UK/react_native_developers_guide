import { FlatList } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { ShowError } from '../../components/show-error';
import { ToastStack } from '../../components/toast';
import { Section, Code } from '../../components';
import { Box, Button, Card, Text } from '../../design-system';
import { usePosts, isBlocking } from '../../hooks/use-posts';
import { API_SCENARIOS } from '../../../core/scenario/api-scenario';
import {
  useApiHandlingDemo,
  labelFor,
} from './api_handling_hooks';

/**
 * ApiHandlingView — a dumb structure. All state/behaviour lives in the
 * co-located hook (api_handling_hooks.ts); this file only renders.
 *
 * Teaching artifact for THIS app's full clean-architecture data pipeline:
 *   ui/hooks/use-posts.ts                       (state machine the screen uses)
 *   domain/usecases/get-posts-usecase.ts        (thin orchestration seam)
 *   domain/repositories/post-repository.ts      (the port)
 *   data/repositories/post-repository-impl.ts   (offline-first impl + Result)
 *   data/remote/post-remote-data-source.ts      (+ dtos/post-dto.ts)
 *   data/remote/http-client.ts                  (+ interceptors/*.ts)
 *   data/local/daos/post-dao.ts                 (+ app-database.ts)
 *
 * The live demo at the bottom wires the SAME pipeline through the real
 * container, so scenario knobs drive an actual fetch through every layer above.
 */
export function ApiHandlingView() {
  return (
    <ScreenScaffold
      title="API Handling"
      subtitle="usecase → repository → remote/local → Result — the full pipeline."
    >
      <PipelineCard />
      <DomainContractCard />
      <RemoteSourceCard />
      <HttpClientCard />
      <LocalCacheCard />
      <RepositoryImplCard />
      <HookCard />
      <LiveDemoCard />
      <RecapCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. The pipeline                                                     */
/* ------------------------------------------------------------------ */

function PipelineCard() {
  return (
    <Section
      title="The pipeline — one fetch, every layer"
      explanation="A tap on 'refetch' below is the user action; everything between it and the rendered posts is the clean-architecture pipeline this app teaches. Each box is one real file in this repo."
    >
      <Box gap="sm">
        <Code>{`UI (this screen)
  │  usePosts()                                   ui/hooks/use-posts.ts
  ▼
GetPostsUseCase.execute()                          domain/usecases/get-posts-usecase.ts
  │  → repository.getPosts()
  ▼
PostRepository (interface)                         domain/repositories/post-repository.ts
  │  implemented by PostRepositoryImpl             data/repositories/post-repository-impl.ts
  ▼
PostRemoteDataSource  +  AppDatabase (DAO)         data/remote/*  +  data/local/*
  │  HttpClient (fetch + interceptors + retry)     data/remote/http-client.ts
  ▼
Result<Post[]>  (Success<T, warning?> | Failed)    core/result.ts
  │  consumed by the hook → state → UI branches on severity
  ▼
<ShowError/> (critical)  |  posts + toast (warning)`}</Code>
        <Text variant="caption" tone="muted">
          The dependency rule is the point: every arrow depends on something
          inner (closer to{' '}
          <Text style={{ fontFamily: 'monospace' }}>domain/</Text>), never outer.
          The UI never imports{' '}
          <Text style={{ fontFamily: 'monospace' }}>fetch</Text>,{' '}
          <Text style={{ fontFamily: 'monospace' }}>AsyncStorage</Text>, or a DTO — it
          only consumes a{' '}
          <Text style={{ fontFamily: 'monospace' }}>Result</Text>.
        </Text>
        <Code language="ts" caption="domain/usecases/get-posts-usecase.ts">{`export class GetPostsUseCase {
  private readonly repository: PostRepository;

  constructor(repository: PostRepository) {
    this.repository = repository;
  }

  execute(): Promise<Result<Post[]>> {
    return this.repository.getPosts();   // a one-liner today — the seam is the point
  }
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Domain contract                                                  */
/* ------------------------------------------------------------------ */

function DomainContractCard() {
  return (
    <Section
      title="Domain contract — the repository port"
      explanation="The use case depends on an interface in domain/, not on a concrete implementation. That is what lets the offline-first impl, the fakes, and the tests all sit behind the same shape."
    >
      <Code language="ts" caption="domain/repositories/post-repository.ts">{`import type { Post } from '../models/post';
import type { Result } from '../../core/result';

/** The UI / use cases depend on this interface, never on the implementation. */
export interface PostRepository {
  getPosts(): Promise<Result<Post[]>>;
}`}</Code>
      <Text variant="caption" tone="muted">
        Note the return type:{' '}
        <Text style={{ fontFamily: 'monospace' }}>Promise&lt;Result&lt;Post[]&gt;&gt;</Text>{' '}
        — never a thrown exception, never a raw{' '}
        <Text style={{ fontFamily: 'monospace' }}>Post[]</Text>. Failure is a value,
        encoded in the type, so callers cannot forget to handle it.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Remote source + DTO                                              */
/* ------------------------------------------------------------------ */

function RemoteSourceCard() {
  return (
    <Section
      title="Remote source + DTO — engine errors become typed exceptions"
      explanation="The remote data source does the actual network call and returns DTOs (the wire shape). Raw engine errors (fetch's TypeError, SyntaxError) are upgraded to typed AppExceptions by guardedApiCall; non-2xx statuses become ServerException / AuthException."
    >
      <Box gap="sm">
        <Code language="ts" caption="data/remote/post-remote-data-source.ts">{`export class JsonPlaceholderPostRemoteDataSource implements PostRemoteDataSource {
  constructor(private readonly http: HttpClient) {}

  getPosts(): Promise<PostDTO[]> {
    return guardedApiCall(async () => {
      const json = await this.http.get<unknown>('/posts');
      if (!Array.isArray(json)) {
        throw new ServerException('Expected a list of posts');
      }
      return json.map((item) => postDtoFromJson(item as Record<string, unknown>));
    });
  }
}`}</Code>
        <Code language="ts" caption="data/remote/dtos/post-dto.ts — DTO → domain mapping">{`export interface PostDTO { id: number; title: string; body: string; }

export function postDtoFromJson(json: Record<string, unknown>): PostDTO {
  const { id, title, body } = json;
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    throw new Error('Invalid post: id must be an integer');   // surfaces as a typed exception
  }
  if (typeof title !== 'string') throw new Error('Invalid post: title must be a string');
  if (typeof body  !== 'string') throw new Error('Invalid post: body must be a string');
  return { id, title, body };
}

export function toPost(dto: PostDTO): Post {
  return { id: dto.id, title: dto.title, body: dto.body };
}`}</Code>
        <Text variant="caption" tone="muted">
          The DTO validates rather than coerces — a malformed post surfaces as a
          typed exception instead of leaking{' '}
          <Text style={{ fontFamily: 'monospace' }}>NaN</Text> ids or{' '}
          <Text style={{ fontFamily: 'monospace' }}>[object Object]</Text> titles into the
          UI. <Text style={{ fontFamily: 'monospace' }}>toPost</Text> is the only bridge
          between the wire shape and the domain model.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. HTTP client + interceptors                                       */
/* ------------------------------------------------------------------ */

function HttpClientCard() {
  return (
    <Section
      title="HTTP client + interceptor pipeline"
      explanation="fetch-based engine for React Native (the web guide uses axios; RN's standard is the built-in fetch). A small explicit interceptor pipeline wraps it: auth → failure-injection on the request side, then dispatch (timeout + retry) → response → JSON parse → status guard."
    >
      <Box gap="sm">
        <Code language="ts" caption="data/remote/http-client.ts">{`export function createHttpClient(deps: HttpClientDeps): HttpClient {
  const requestInterceptors: RequestInterceptor[] = [];
  new AuthTokenInterceptor(deps.getToken).attach(requestInterceptors);          // adds Authorization
  if (deps.config.environment === 'dev') {
    new FailureInjectionInterceptor(deps.getScenario).attach(requestInterceptors); // dev-only knobs
  }

  const retry = new RetryPolicy({
    attempts: 2,
    baseDelayMs: 300,
    retryOn: (error) => error instanceof TypeError,   // only transient network failures
  });

  async function dispatch(req: HttpRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);   // → TimeoutError
    try {
      const response = await fetch(req.url, { /* … */ signal: controller.signal });
      if (!response.ok) throw statusToException(response.status, await response.json());
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function run(req: HttpRequest) {
    let current = req;
    for (const it of requestInterceptors) current = await it(current);  // auth → failure-injection
    return retry.run(() => dispatch(current), req.url, deps.logger);
  }
  // …
}`}</Code>
        <Box gap="xs">
          <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
            interceptors/
          </Text>
          <Code language="ts" caption="the three interceptors wired in above">{`auth-token-interceptor.ts       // attaches the bearer token to every request
failure-injection-interceptor.ts // dev-only: simulates network/timeout/server/bad-json
retry-policy.ts                  // exponential backoff for transient TypeError failures`}</Code>
        </Box>
        <Text variant="caption" tone="muted">
          Retry lives in the dispatcher (the natural place for fetch), not in a
          response interceptor as on web. The two-stage error mapping is
          identical across guides — only the engine adapter differs.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Local cache (DAO)                                                */
/* ------------------------------------------------------------------ */

function LocalCacheCard() {
  return (
    <Section
      title="Local cache — the DAO behind AsyncStorage"
      explanation="The local source mirrors the remote one but talks to storage, not the network. The AppDatabase is the connection/provider; per-entity queries live in DAOs. Any storage/parse failure is wrapped in an AppDatabaseException so it flows through the SAME guards pipeline as a network error."
    >
      <Box gap="sm">
        <Code language="ts" caption="data/local/daos/post-dao.ts">{`export class PostDao {
  constructor(private readonly storage: typeof AsyncStorage, private readonly key: string) {}

  async getAll(): Promise<PostDTO[]> {
    try {
      const raw = await this.storage.getItem(this.key);
      if (!raw) return [];                                   // cache miss — not an error
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new AppDatabaseException('Cached posts payload was not an array');
      }
      return parsed.map((item) => postDtoFromJson(item as Record<string, unknown>));
    } catch (e) {
      throw e instanceof AppDatabaseException
        ? e
        : new AppDatabaseException('Failed to read posts from storage', { cause: e });
    }
  }

  async replaceAll(posts: PostDTO[]): Promise<void> { /* setItem(this.key, JSON.stringify(posts)) */ }
}`}</Code>
        <Code language="ts" caption="data/local/app-database.ts — the connection that owns DAOs">{`export abstract class AppDatabase {
  abstract insertPosts(posts: PostDTO[]): Promise<void>;
  abstract getPosts(): Promise<PostDTO[]>;
}

const STORAGE_KEY = 'rndg.posts';

export class AppDatabaseImpl extends AppDatabase {
  private readonly postDao: PostDao;
  constructor(storage: typeof AsyncStorage = AsyncStorage) {
    super();
    this.postDao = new PostDao(storage, STORAGE_KEY);
  }
  insertPosts(posts: PostDTO[]) { return this.postDao.replaceAll(posts); }
  getPosts()                    { return this.postDao.getAll(); }
}`}</Code>
        <Text variant="caption" tone="muted">
          RN pick: <Text style={{ fontFamily: 'monospace' }}>AsyncStorage</Text> behind a DAO
          (the most portable RN-standard KV store). For relational data,
          <Text style={{ fontFamily: 'monospace' }}> expo-sqlite</Text> /
          <Text style={{ fontFamily: 'monospace' }}> WatermelonDB</Text> would slot in behind the
          same <Text style={{ fontFamily: 'monospace' }}>AppDatabase</Text> seam.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Repository impl + error → Result                                 */
/* ------------------------------------------------------------------ */

function RepositoryImplCard() {
  return (
    <Section
      title="Repository impl — error → Result, with an offline-first fallback"
      explanation="This is where the pipeline pays off. safeRepositoryCall wraps the remote fetch + cache write; on network/server failure it falls back to the local cache. Three outcomes, encoded as a Result: success with stale data + a warning, a blocking failure, or a chained failure when the cache itself also failed."
    >
      <Box gap="sm">
        <Code language="ts" caption="data/repositories/post-repository-impl.ts">{`export class PostRepositoryImpl implements PostRepository {
  async getPosts() {
    return safeRepositoryCall<Post[]>({
      call: async () => {
        const remotePosts = await this.remote.getPosts();   // throws AppException on failure
        try { await this.local.insertPosts(remotePosts); }  // best-effort cache write
        catch (e) { this.logger.warning('Failed to cache posts', e); }
        return remotePosts.map(toPost);                      // DTO → domain
      },
      onNetworkError: (cause) => this.serveFromCache(cause), // ← fallback
      onServerError:  (cause) => this.serveFromCache(cause),
    });
  }

  private async serveFromCache(cause: AppException) {
    const upstreamFailure = mapExceptionToFailure(cause);
    const cached = await this.local.getPosts();
    if (cached.length > 0) {
      return success(cached.map(toPost), upstreamFailure);   // non-blocking: data + soft warning
    }
    return forwardNetworkFailure(cause);                      // blocking: nothing to show
    // (a cache READ failure → chainedCacheFailure: CacheFailure ← NetworkFailure)
  }
}`}</Code>
        <Box gap="xs">
          {RESULT_ROWS.map((r) => (
            <Box key={r.shape} p="sm" radius="sm" bg="surfaceVariant">
              <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                {r.shape}
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

const RESULT_ROWS: ReadonlyArray<{ shape: string; note: string }> = [
  {
    shape: 'success(posts, networkFailure)',
    note: 'Remote failed but a cache was served. The call SUCCEEDS, posts render, and the failure fires a dismissible toast — one value carries data + soft notice.',
  },
  {
    shape: 'failed(networkFailure)',
    note: 'Remote failed AND the cache was empty. Blocking — the screen has no data; <ShowError/> with Retry.',
  },
  {
    shape: 'failed(CacheFailure ← NetworkFailure)',
    note: 'The worst case: remote failed, then the cache fallback threw too. Chained via chainedCacheFailure — Critical, and .chain reconstructs the whole story.',
  },
];

/* ------------------------------------------------------------------ */
/* 7. The hook the screen uses                                         */
/* ------------------------------------------------------------------ */

function HookCard() {
  return (
    <Section
      title="The hook the screen uses — usePosts"
      explanation="The React analogue of the Flutter PostsBloc / web usePosts. A useReducer state machine drives the use case and branches a single time on result.ok. Critical → blocking ShowError; warning → non-blocking toast (via useFailureToast)."
    >
      <Code language="ts" caption="ui/hooks/use-posts.ts">{`type PostsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; posts: Post[]; warning?: Failure }
  | { status: 'error'; failure: Failure };

export function usePosts(getPostsUseCase = container.getPostsUseCase) {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });

  const fetch = useCallback(() => {
    let cancelled = false;
    void (async () => {
      dispatch({ type: 'fetch' });
      const result = await getPostsUseCase.execute();   // Promise<Result<Post[]>>
      if (cancelled) return;
      if (result.ok) {
        dispatch({ type: 'loaded', posts: result.value, warning: result.warning });
      } else {
        dispatch({ type: 'error', failure: result.failure });
      }
    })();
    return () => { cancelled = true; };
  }, [getPostsUseCase]);

  useEffect(() => fetch(), [fetch]);   // auto-fetch on mount
  return { state, fetch };
}

export function isBlocking(failure: Failure): boolean {
  return failure.severity === FailureSeverity.Critical;
}`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. LIVE demo                                                        */
/* ------------------------------------------------------------------ */

function LiveDemoCard() {
  const { state, fetch, toast, apiScenario, useFakeApi, setScenario, toggleSource } =
    useApiHandlingDemo();

  return (
    <Section
      title="LIVE — drive the real pipeline"
      explanation={
        'Flip a failure-injection scenario or the fake/live source. Each tap runs through every layer above for real: hook → usecase → repository → remote/local → Result → UI. Critical failures block with <ShowError/>; warnings fire a dismissible toast.'
      }
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          {API_SCENARIOS.map((scenario) => (
            <Button
              key={scenario}
              title={labelFor(scenario)}
              variant={apiScenario === scenario ? 'filled' : 'outline'}
              onPress={() => setScenario(scenario)}
            />
          ))}
        </Box>
        <Button title="Toggle fake / live source" variant="ghost" onPress={toggleSource} />
        <Text variant="small" tone="muted">
          Active source:{' '}
          <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
            {useFakeApi ? 'FakeApi (canned)' : 'live jsonplaceholder'}
          </Text>
          . Scenario knobs set the cache to empty so the chosen path is immediately visible.
        </Text>
        <Button title="Refetch" onPress={fetch} />
        <PostsBody state={state} onRetry={fetch} />
      </Box>
      <ToastStack entries={toast.entries} onDismiss={toast.dismiss} />
    </Section>
  );
}

function PostsBody({
  state,
  onRetry,
}: {
  state: ReturnType<typeof usePosts>['state'];
  onRetry: () => void;
}) {
  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <Card>
        <Text variant="body" tone="muted">
          Loading posts…
        </Text>
      </Card>
    );
  }

  if (state.status === 'error' && isBlocking(state.failure)) {
    return <ShowError message={state.failure.message} onRetry={onRetry} />;
  }

  if (state.status === 'error') {
    // Non-blocking error surfaced as a toast; show a gentle inline note too.
    return (
      <Card>
        <Text variant="body" tone="muted">
          No posts to show — see the toast for details.
        </Text>
      </Card>
    );
  }

  return (
    <FlatList
      data={state.posts}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: 8 }}>
          <Text variant="small" tone="primary" style={{ fontWeight: '600' }}>
            #{item.id}
          </Text>
          <Text variant="body">{item.title}</Text>
          <Text variant="caption" tone="muted" mt="xs">
            {item.body}
          </Text>
        </Card>
      )}
      keyExtractor={(item) => String(item.id)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* 9. Recap                                                            */
/* ------------------------------------------------------------------ */

function RecapCard() {
  return (
    <Section
      title="Recap — the pipeline in one breath"
      explanation="Five invariants. They are why this screen looks the way it does."
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
    title: 'Dependencies point inward',
    body: 'UI → use case → repository interface (domain/). The UI never imports fetch, AsyncStorage, or a DTO — only a Result<Post[]>.',
  },
  {
    title: 'Failure is a value, not a throw',
    body: 'Repository methods return Promise<Result<T>>. Callers cannot forget to handle failure — the type forces it. safeRepositoryCall is where exceptions become Results.',
  },
  {
    title: 'Two-stage error mapping',
    body: 'Engine errors → AppException (data-layer, technical) → Failure (domain, semantic). The UI branches on Failure.severity, never on HTTP/storage concepts.',
  },
  {
    title: 'Offline-first via Success<T, warning?>',
    body: 'A network failure with a cache hit returns success(posts, networkFailure) — data renders, a soft toast fires. One value carries both.',
  },
  {
    title: 'Severity drives presentation',
    body: 'Critical → blocking <ShowError/> with Retry; Warning/Info → non-blocking toast. One field decides; no scattered if/else across screens.',
  },
];
