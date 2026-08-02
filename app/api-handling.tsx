import { useEffect } from 'react';
import { FlatList } from 'react-native';
import { ScreenScaffold } from '../src/ui/components/screen-scaffold';
import { ShowError } from '../src/ui/components/show-error';
import { ToastStack } from '../src/ui/components/toast';
import { usePosts, isBlocking } from '../src/ui/hooks/use-posts';
import { useFailureToast } from '../src/ui/hooks/use-failure-toast';
import {
  ApiScenario,
  API_SCENARIOS,
} from '../src/core/scenario/api-scenario';
import { DbScenario } from '../src/core/scenario/db-scenario';
import { container } from '../src/core/container';
import {
  Box,
  Button,
  Card,
  Text,
  useTheme,
} from '../src/ui/design-system';

/**
 * API Handling screen — the live demonstration of the full clean-architecture
 * pipeline: hook → GetPostsUseCase → PostRepository → remote/local → Result,
 * with both success and error states exercisable through the dev scenario
 * knobs (mirrors the sibling guides' API/Exception-handling screens).
 */
export default function ApiHandlingScreen() {
  const { state, fetch } = usePosts();
  const { theme } = useTheme();
  const toast = useFailureToast();

  // Surface any non-blocking warning exactly once per warning.
  useEffect(() => {
    if (state.status === 'loaded' && state.warning) {
      toast.show(state.warning);
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

  return (
    <ScreenScaffold
      title="API Handling"
      subtitle="usecase → repository → remote/local → Result"
    >
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Box gap="sm">
          <Text variant="h3">Failure-injection scenario</Text>
          <Text variant="small" tone="muted">
            Active source: {container.getUseFakeApi() ? 'FakeApi (canned)' : 'live jsonplaceholder'}.
            Flip the source or a failure path to exercise the whole pipeline.
          </Text>
          <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
            {API_SCENARIOS.map((scenario) => (
              <Button
                key={scenario}
                title={labelFor(scenario)}
                variant={container.getApiScenario() === scenario ? 'filled' : 'outline'}
                onPress={() => setScenario(scenario)}
              />
            ))}
          </Box>
          <Button title="Toggle fake / live source" variant="ghost" onPress={toggleSource} />
          <Button title="Refetch" onPress={fetch} />
        </Box>
      </Card>

      <PostsBody state={state} onRetry={fetch} />
      <ToastStack entries={toast.entries} onDismiss={toast.dismiss} />
    </ScreenScaffold>
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

function labelFor(scenario: ApiScenario): string {
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
