import {
  DbScenario,
  type DbScenario as DbScenarioType,
} from '../../core/scenario/db-scenario';
import { AppDatabaseException } from '../../core/error-handling/exceptions';
import { AppDatabase } from '../local/app-database';
import type { PostDTO } from '../remote/dtos/post-dto';

/**
 * FakeAppDatabase — dev-only in-memory implementation of the local database.
 * Mirrors the sibling guides' `FakeAppDatabase`. Lets the Database-handling and
 * Exception-handling screens simulate cache hits, empty cache, and read/write
 * failures without a real storage backend.
 */
export class FakeAppDatabase extends AppDatabase {
  private scenario: DbScenarioType;
  private store: PostDTO[] = [];

  constructor(scenario: DbScenarioType = DbScenario.Success) {
    super();
    this.scenario = scenario;
  }

  setScenario(scenario: DbScenarioType): void {
    this.scenario = scenario;
  }

  getScenario(): DbScenarioType {
    return this.scenario;
  }

  async insertPosts(posts: PostDTO[]): Promise<void> {
    await delay(100);
    if (this.scenario === DbScenario.WriteError) {
      throw new AppDatabaseException('Simulated cache write failed');
    }
    this.store = [...posts];
  }

  async getPosts(): Promise<PostDTO[]> {
    await delay(100);
    if (this.scenario === DbScenario.ReadError) {
      throw new AppDatabaseException('Simulated cache read failed');
    }
    if (this.scenario === DbScenario.Empty) {
      return [];
    }
    return [...this.store];
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
