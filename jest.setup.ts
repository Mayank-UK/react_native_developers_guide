/**
 * Per-test setup — runs after the test framework is ready (so `beforeEach` /
 * `afterEach` exist). Resets the DI container between specs so they stay
 * isolated. Native-module mocks live in `jest.mocks.ts` (registered earlier,
 * before the container's module graph loads).
 */
import { container } from './src/core/container';
import { createAppConfig } from './src/core/config';
import { ApiScenario } from './src/core/scenario/api-scenario';
import { DbScenario } from './src/core/scenario/db-scenario';

beforeEach(() => {
  container.initialize(
    createAppConfig({
      appEnv: 'dev',
      baseUrl: 'https://test.example.com',
      useFakeApi: 'true',
      useFakeDatabase: 'true',
      enableLogs: 'false',
      apiScenario: ApiScenario.Success,
      dbScenario: DbScenario.Success,
    }),
  );
});

afterEach(() => {
  container.dispose();
});
