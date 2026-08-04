import { container } from './container';
import { createAppConfig } from '../config';
import { ApiScenario } from '../scenario/api-scenario';
import { DbScenario } from '../scenario/db-scenario';
import { FakeApiService } from '../../data/fake/fake-api-service';
import { FakeAppDatabase } from '../../data/fake/fake-app-database';

describe('container', () => {
  // The global jest.setup.ts initializes + disposes the container per test, so
  // each spec here starts from a fully wired dev graph.

  it('resolves the full use case graph through accessors', () => {
    expect(container.getPostsUseCase).toBeDefined();
    expect(container.postRepository).toBeDefined();
    expect(container.postRemoteDataSource).toBeDefined();
    expect(container.appDatabase).toBeDefined();
  });

  it('uses fakes in dev by default', () => {
    expect(container.postRemoteDataSource).toBeInstanceOf(FakeApiService);
    expect(container.appDatabase).toBeInstanceOf(FakeAppDatabase);
  });

  it('swaps remote source on setUseFakeApi and rebuilds the graph', () => {
    container.setUseFakeApi(false);
    expect(container.postRemoteDataSource).not.toBeInstanceOf(FakeApiService);
    // flipping back restores the fake path
    container.setUseFakeApi(true);
    expect(container.postRemoteDataSource).toBeInstanceOf(FakeApiService);
  });

  it('forwards scenario changes to the fake api service', () => {
    container.setApiScenario(ApiScenario.ServerError);
    expect(container.getApiScenario()).toBe(ApiScenario.ServerError);
    expect(container.postRemoteDataSource).toBeInstanceOf(FakeApiService);
    const fake = container.postRemoteDataSource as FakeApiService;
    expect(fake.getScenario()).toBe(ApiScenario.ServerError);
  });

  it('honours a non-fake-db AppConfig by building a real AppDatabase', () => {
    container.initialize(
      createAppConfig({
        appEnv: 'dev',
        baseUrl: 'https://x.example.com',
        useFakeApi: 'true',
        useFakeDatabase: 'false',
        enableLogs: 'false',
        apiScenario: ApiScenario.Success,
        dbScenario: DbScenario.Success,
      }),
    );
    expect(container.appDatabase).not.toBeInstanceOf(FakeAppDatabase);
  });
});
