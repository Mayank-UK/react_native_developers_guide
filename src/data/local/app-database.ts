import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PostDTO } from '../remote/dtos/post-dto';
import { PostDao } from './daos/post-dao';

/**
 * AppDatabase — the local persistence layer. Mirrors the sibling guides'
 * `AppDatabase` (abstract contract) + `AppDatabaseImpl` (the concrete connection
 * that owns DAOs and delegates to them). This file is the connection/provider;
 * per-entity queries live in `daos/*` (see `PostDao`), matching how the remote
 * layer separates `http-client` from `*-remote-data-source`.
 *
 * Note (RN storage choice): the web guide uses IndexedDB via Dexie; the Flutter
 * guide uses `sqflite`. For RN we pick `@react-native-async-storage/async-
 * storage` — the most portable RN-standard KV store (works in Expo Go, iOS,
 * Android, and web) — behind a DAO that (de)serializes the posts collection to
 * JSON. This keeps the DAO seam that the architecture teaches while remaining
 * dependency-light. For relational/relational-heavy data, `expo-sqlite` or
 * WatermelonDB would be the production choice (documented in ARCHITECTURE.md).
 */
export abstract class AppDatabase {
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

  insertPosts(posts: PostDTO[]): Promise<void> {
    return this.postDao.replaceAll(posts);
  }

  getPosts(): Promise<PostDTO[]> {
    return this.postDao.getAll();
  }

  async clearPosts(): Promise<void> {
    await this.postDao.clear();
  }
}
