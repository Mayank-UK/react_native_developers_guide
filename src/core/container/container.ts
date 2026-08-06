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
 * this is a small hand-rolled locator: `initialize` wires singletons onto typed
 * fields, accessors read them. It keeps wiring in one explicit, debuggable
 * place and lets screens resolve dependencies without prop-drilling or a global
 * variable per service.
 *
 * Dev builds swap in `FakeApiService` / `FakeAppDatabase`, driven by a mutable
 * scenario holder so the API-handling screen can flip outcomes at runtime.
 *
 * Initialization invariant: the container MUST be `initialize`d before any
 * accessor is read. In the app this happens synchronously at module-eval time
 * via `src/core/container/bootstrap.ts` (imported once by `app/_layout.tsx`
 * before the Drawer — and therefore any child — can mount), so registration
 * completes before React renders. `resolve` enforces the invariant with a
 * clear error so a misordered import surfaces immediately instead of crashing
 * deep inside a use case.
 */

interface ScenarioHolder {
  api: ApiScenarioType;
  db: DbScenarioType;
}

class Container {
  private configField?: AppConfig;
  private loggerField?: Logger;
  private httpClientField?: HttpClient;
  private postRemoteDataSourceField?: PostRemoteDataSource;
  private appDatabaseField?: AppDatabase;
  private postRepositoryField?: PostRepository;
  private getPostsUseCaseField?: GetPostsUseCase;
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

  /**
   * Wire every singleton onto its typed field. Idempotent: re-running (e.g. the
   * per-test jest.setup, or a future hot reload) just rebinds the same fields.
   */
  initialize(config: AppConfig): void {
    this.configField = config;
    this.scenario.api = config.apiScenario;
    this.scenario.db = config.dbScenario;
    this.useFakeApi = config.useFakeApi;

    // Eager singletons — built in dependency order onto typed fields (no
    // string-keyed registry, no `as` casts: the 7 singletons are all known).
    this.loggerField = new Logger(config.environment, config.enableLogs);
    this.httpClientField = createHttpClient({
      config,
      logger: this.loggerField,
      getScenario: () => this.scenario.api,
    });
    this.postRemoteDataSourceField = this.createPostRemoteDataSource();
    this.appDatabaseField = this.createAppDatabase();
    this.postRepositoryField = this.createPostRepository();
    this.getPostsUseCaseField = this.createGetPostsUseCase();
  }

  // ---- service accessors ----

  get appConfig(): AppConfig {
    return this.resolve(this.configField, 'AppConfig');
  }
  get logger(): Logger {
    return this.resolve(this.loggerField, 'Logger');
  }
  get httpClient(): HttpClient {
    return this.resolve(this.httpClientField, 'HttpClient');
  }
  get postRemoteDataSource(): PostRemoteDataSource {
    return this.resolve(this.postRemoteDataSourceField, 'PostRemoteDataSource');
  }
  get appDatabase(): AppDatabase {
    return this.resolve(this.appDatabaseField, 'AppDatabase');
  }
  get postRepository(): PostRepository {
    return this.resolve(this.postRepositoryField, 'PostRepository');
  }
  get getPostsUseCase(): GetPostsUseCase {
    return this.resolve(this.getPostsUseCaseField, 'GetPostsUseCase');
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
    this.postRemoteDataSourceField = this.createPostRemoteDataSource();
    this.postRepositoryField = this.createPostRepository();
    this.getPostsUseCaseField = this.createGetPostsUseCase();
  }
  getUseFakeApi(): boolean {
    return this.useFakeApi;
  }

  /** Test-only: tear down wired singletons. */
  dispose(): void {
    this.configField = undefined;
    this.loggerField = undefined;
    this.httpClientField = undefined;
    this.postRemoteDataSourceField = undefined;
    this.appDatabaseField = undefined;
    this.postRepositoryField = undefined;
    this.getPostsUseCaseField = undefined;
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
    if (this.appConfig.useFakeDatabase) {
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

  /**
   * Enforce the init invariant. A missing field means `initialize` hasn't run
   * (or `dispose` ran) before an accessor was read — fail fast with a message
   * that names the fix rather than crashing later inside a use case.
   */
  private resolve<T>(instance: T | undefined, name: string): T {
    if (instance === undefined) {
      throw new Error(
        `Container not initialized — call initialize(createAppConfig()) before resolving "${name}".`,
      );
    }
    return instance;
  }
}

export const container = new Container();
