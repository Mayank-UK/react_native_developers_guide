import type AsyncStorage from '@react-native-async-storage/async-storage';
import { AppDatabaseException } from '../../../core/error-handling/exceptions';
import {
  postDtoFromJson,
  type PostDTO,
} from '../../remote/dtos/post-dto';

/**
 * PostDao — owns the read/write of the posts collection against the underlying
 * KV store. Mirrors the sibling guides' `PostDao`. Any storage/parse failure is
 * wrapped in an `AppDatabaseException` so the guards pipeline can map it to a
 * `DatabaseFailure` / `CacheFailure` consistently.
 *
 * PostDTO is both the in-memory and on-disk shape (JSON-serialized under one
 * key). A real relational store would shard this per-row; the DAO abstraction
 * keeps that detail invisible to the repository.
 */
export class PostDao {
  private readonly storage: typeof AsyncStorage;
  private readonly key: string;

  constructor(storage: typeof AsyncStorage, key: string) {
    this.storage = storage;
    this.key = key;
  }

  async getAll(): Promise<PostDTO[]> {
    try {
      const raw = await this.storage.getItem(this.key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new AppDatabaseException('Cached posts payload was not an array');
      }
      return parsed.map((item) =>
        postDtoFromJson(item as Record<string, unknown>),
      );
    } catch (e) {
      throw e instanceof AppDatabaseException
        ? e
        : new AppDatabaseException('Failed to read posts from storage', {
            cause: e,
          });
    }
  }

  async replaceAll(posts: PostDTO[]): Promise<void> {
    try {
      await this.storage.setItem(this.key, JSON.stringify(posts));
    } catch (e) {
      throw new AppDatabaseException('Failed to write posts to storage', {
        cause: e,
      });
    }
  }

  async clear(): Promise<void> {
    try {
      await this.storage.removeItem(this.key);
    } catch (e) {
      throw new AppDatabaseException('Failed to clear posts storage', {
        cause: e,
      });
    }
  }
}
