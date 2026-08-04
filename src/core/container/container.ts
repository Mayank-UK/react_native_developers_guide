import { type AppConfig } from '../config/app-config';
import { Logger } from '../config/logger';
import { ApiScenario, type ApiScenario as ApiScenarioType } from '../scenario/api-scenario';
import { DbScenario, type DbScenario as DbScenarioType } from '../scenario/db-scenario';
import { createHttpClient, type HttpClient } from '../../data/remote/http-client';
import {
  type PostRemoteDataSource,
  JsonPlaceholderPostRemoteDataSource,
} from '../../data/remote/post-remote-data-source';
import { AppDatabase, AppDatabaseImpl } from '../../data/local/app-database';
import { PostRepositoryImpl } from '../../data/repositories/post-repository-impl';
import type { PostRepository } from '../../domain/repositories/post-repository';
import { GetPostsUseCase } from '../../domain/usecases/get-posts-usecase';
import { FakeApiService } from '../../data/fake/fake-api-service';
import { FakeAppDatabase } from '../../data/fake/fake-app-database';

/**
 * Service-locator container — mirrors the sibling guides' `getIt` /
 * `injection_module.dart` (Flutter) and the web guide's `container.ts`.
 *
 * Note (RN vs Flutter): Flutter uses `get_it` + `@injectable` codegen so
 * constructors auto-wire. Neither RN nor React has an equivalent standard, so
 * this is a small hand-rolled locator: `register` singletons, `resolve` them.
 * It keeps wiring in one explicit, debuggable place and lets screens resolve
 * dependencies without prop-drilling or a global variable per service.
 *
 * Dev builds swap in `FakeApiService` / `FakeAppDatabase`, driven by a mutable
 * scenario holder so the API-handling screen can flip outcomes at runtime.
 */

interface ScenarioHolder {
  api: ApiScenarioType;
  db: DbScenarioType;
}

class Container {
  private config!: AppConfig;
  private readonly registry = new Map<symbol, unknown>();
  private readonly scenario: ScenarioHolder = {
    api: ApiScenario.Success,
    db: DbScenario.Success,
  };
  /**
   * Mutable mirror of `config.useFakeApi`. Kept separate from the immutable
   * config so the API-handling screen can flip between the canned FakeApiService
   * and the real jsonplaceholder data source at runtime via `setUseFakeApi`.
   */
  private useFakeApi = true;
  private fakeApi?: FakeApiService;
  private fakeDb?: FakeAppDatabase;

  initialize(config: AppConfig): void {
    this.config = config;
    this.scenario.api = config.apiScenario;
    this.scenario.db = config.dbScenario;
    this.useFakeApi = config.useFakeApi;

    // Eager singletons.
    this.register('AppConfig', config);
    this.register(
      'Logger',
      new Logger(config.environment, config.enableLogs),
    );
    this.register(
      'HttpClient',
      createHttpClient({
        config,
        logger: this.logger,
        getScenario: () => this.scenario.api,
      }),
    );
    this.register('PostRemoteDataSource', this.createPostRemoteDataSource());
    this.register('AppDatabase', this.createAppDatabase());
    this.register('PostRepository', this.createPostRepository());
    this.register('GetPostsUseCase', this.createGetPostsUseCase());
  }

  // ---- service accessors ----

  get appConfig(): AppConfig {
    return this.resolve('AppConfig') as AppConfig;
  }
  get logger(): Logger {
    return this.resolve('Logger') as Logger;
  }
  get httpClient(): HttpClient {
    return this.resolve('HttpClient') as HttpClient;
  }
  get postRemoteDataSource(): PostRemoteDataSource {
    return this.resolve('PostRemoteDataSource') as PostRemoteDataSource;
  }
  get appDatabase(): AppDatabase {
    return this.resolve('AppDatabase') as AppDatabase;
  }
  get postRepository(): PostRepository {
    return this.resolve('PostRepository') as PostRepository;
  }
  get getPostsUseCase(): GetPostsUseCase {
    return this.resolve('GetPostsUseCase') as GetPostsUseCase;
  }

  // ---- runtime scenario control (dev) ----

  setApiScenario(scenario: ApiScenarioType): void {
    this.scenario.api = scenario;
    this.fakeApi?.setScenario(scenario);
  }
  setDbScenario(scenario: DbScenarioType): void {
    this.scenario.db = scenario;
    this.fakeDb?.setScenario(scenario);
  }
  getApiScenario(): ApiScenarioType {
    return this.scenario.api;
  }
  getDbScenario(): DbScenarioType {
    return this.scenario.db;
  }

  /**
   * Flip between the canned FakeApiService and the real jsonplaceholder data
   * source at runtime. Swapping the source rebuilds the remote → repository →
   * use case graph so consumers that resolve `getPostsUseCase` afresh pick up
   * the new path and refetch. The live path still simulates failures because
   * the http client's failure-injection interceptor reads the live API scenario.
   */
  setUseFakeApi(useFakeApi: boolean): void {
    if (this.useFakeApi === useFakeApi) return;
    this.useFakeApi = useFakeApi;
    this.register('PostRemoteDataSource', this.createPostRemoteDataSource());
    this.register('PostRepository', this.createPostRepository());
    this.register('GetPostsUseCase', this.createGetPostsUseCase());
  }
  getUseFakeApi(): boolean {
    return this.useFakeApi;
  }

  /** Test-only: tear down registered singletons. */
  dispose(): void {
    this.registry.clear();
    this.fakeApi = undefined;
    this.fakeDb = undefined;
  }

  // ---- wiring helpers ----

  private createPostRemoteDataSource(): PostRemoteDataSource {
    if (this.useFakeApi) {
      this.fakeApi = new FakeApiService(this.scenario.api);
      return this.fakeApi;
    }
    // Live path: real jsonplaceholder calls through the shared http client,
    // whose failure-injection interceptor still honours the live API scenario.
    this.fakeApi = undefined;
    return new JsonPlaceholderPostRemoteDataSource(this.httpClient);
  }

  private createAppDatabase(): AppDatabase {
    if (this.config.useFakeDatabase) {
      this.fakeDb = new FakeAppDatabase(this.scenario.db);
      return this.fakeDb;
    }
    return new AppDatabaseImpl();
  }

  private createPostRepository(): PostRepository {
    return new PostRepositoryImpl(
      this.postRemoteDataSource,
      this.appDatabase,
      this.logger,
    );
  }

  private createGetPostsUseCase(): GetPostsUseCase {
    return new GetPostsUseCase(this.postRepository);
  }

  private register(name: string, instance: unknown): void {
    this.registry.set(key(name), instance);
  }

  private resolve(name: string): unknown {
    const instance = this.registry.get(key(name));
    if (instance === undefined) {
      throw new Error(`Dependency "${name}" is not registered`);
    }
    return instance;
  }
}

const KEY_REGISTRY = new Map<string, symbol>();
function key(name: string): symbol {
  let sym = KEY_REGISTRY.get(name);
  if (!sym) {
    sym = Symbol(name);
    KEY_REGISTRY.set(name, sym);
  }
  return sym;
}

export const container = new Container();
