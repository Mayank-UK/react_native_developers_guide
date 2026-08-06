import { ScreenScaffold } from '../../../../components/screen-scaffold';
import { Box, Button, Text } from '../../../../components';
import { Section, Code, Pill } from '../../../../components';
import {
  SERVER_STATE_SCENARIOS,
  usePostsCacheProof,
  usePostsQuery,
  useServerStateDemo,
} from './server_state_hooks';

/**
 * ServerStateView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (server_state_hooks.ts); this file only renders.
 *
 * TanStack Query demo. The <QueryClientProvider client={queryClient}> wraps ONLY
 * this view's demo subtree — NOT _layout, NOT the section hub. The app itself
 * remains a DI-service-locator + usecases + useReducer-hook app; React Query is
 * a teaching artifact scoped to this subtree (see the decision log: "State libs
 * added for the state-management teaching screen"). No `any`; strict +
 * erasableSyntaxOnly-clean.
 */
export function ServerStateView() {
  return (
    <ScreenScaffold title="Server State">
      <ServerStateQueryCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* SERVER state — TanStack Query (LIVE)                             */
/* ------------------------------------------------------------------ */

/** The list that consumes the cached server state. */
function PostsQueryList() {
  const { data, status, error, refetch, isFetching } = usePostsQuery();
  return (
    <Box gap="xs">
      <Box row gap="sm" style={{ alignItems: 'center' }}>
        <Pill
          tone={
            status === 'success' ? 'primary' : status === 'error' ? 'danger' : 'muted'
          }
        >
          {`${status}${isFetching ? ' · refetching' : ''}`}
        </Pill>
        <Button title="refetch" variant="ghost" onPress={() => void refetch()} />
      </Box>
      {status === 'pending' ? (
        <Text variant="small" tone="muted">
          loading… (first fetch; cache empty)
        </Text>
      ) : status === 'error' ? (
        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" tone="danger" style={{ fontWeight: '600' }}>
            error: {error instanceof Error ? error.message : 'unknown'}
          </Text>
        </Box>
      ) : (
        <Box gap="xxs">
          {(data ?? []).slice(0, 4).map((p) => (
            <Box key={p.id} p="sm" radius="sm" bg="surfaceVariant">
              <Text variant="small" style={{ fontWeight: '600' }}>
                #{p.id} {p.title}
              </Text>
            </Box>
          ))}
          <Text variant="caption" tone="muted">
            {(data ?? []).length} posts cached
          </Text>
        </Box>
      )}
    </Box>
  );
}

/** A SECOND consumer of the SAME query key — it reads the cache, no new fetch. */
function PostsCacheProof() {
  const { data, status } = usePostsCacheProof();
  return (
    <Box p="sm" radius="md" bg="surfaceVariant">
      <Text variant="caption" tone="muted">
        Second component, same queryKey → reads cache → status:{' '}
        <Text style={{ fontWeight: '600' }}>{status}</Text>, cached posts:{' '}
        <Text style={{ fontWeight: '600' }}>{(data ?? []).length}</Text>
      </Text>
    </Box>
  );
}

function ServerStateQueryCard() {
  const { queryClient, scenario, setScenarioAndLog, QueryClientProvider } = useServerStateDemo();

  return (
    <Section
      title="Server state — TanStack Query"
      explanation="Server state is DIFFERENT from client state: the data is async, lives on a server, can be stale, and needs cache + invalidation + retry. TanStack Query (React Query) owns all of that. Note how the queryFn calls THIS app's GetPostsUseCase — Query sits ABOVE the clean-architecture repository/usecase layer, it does not replace it."
    >
      <QueryClientProvider client={queryClient}>
        <Box gap="sm">
          <PostsQueryList />
          <PostsCacheProof />

          <Box gap="xs">
            <Text variant="caption" tone="muted">
              Flip the dev scenario to force the fake API down a failure path,
              then refetch — watch the SAME query transition success → error →
              success. (The real jsonplaceholder path is unaffected; this knob
              drives the FakeApiService / failure-injection interceptor.)
            </Text>
            <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
              {SERVER_STATE_SCENARIOS.map((s) => (
                <Button
                  key={s}
                  title={s}
                  variant={scenario === s ? 'filled' : 'outline'}
                  onPress={() => setScenarioAndLog(s)}
                />
              ))}
            </Box>
          </Box>

          <Code>{`import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

async function fetchPosts() {
  const result = await container.getPostsUseCase.execute(); // clean arch
  if (!result.ok) throw new Error(result.failure.message); // error → Query
  return result.value;
}

const { data, status, error, refetch } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
});
// status: 'pending' | 'success' | 'error' — owned by Query, not by you`}</Code>
          <Text variant="caption" tone="muted">
            What you get for free: automatic cache by query key (the second
            component showed cached data instantly), background refetch, retry,
            stale-while-revalidate, and{' '}
            <Text style={{ fontFamily: 'monospace' }}>queryClient.invalidateQueries(['posts'])</Text>{' '}
            to mark data stale after a mutation. This is the work teams
            incorrectly copy into Redux actions. Query keeps it at the edge.
          </Text>
        </Box>
      </QueryClientProvider>
    </Section>
  );
}
