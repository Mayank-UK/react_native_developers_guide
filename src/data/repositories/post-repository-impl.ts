import { Logger } from '../../core/config/logger';
import { success } from '../../core/result';
import {
  AppDatabaseException,
  type AppException,
} from '../../core/error-handling/exceptions';
import {
  chainedCacheFailure,
  forwardNetworkFailure,
  mapExceptionToFailure,
  safeRepositoryCall,
} from '../../core/error-handling/guards';
import { FailureSeverity } from '../../core/error-handling/failures';
import type { Post } from '../../domain/models/post';
import type { PostRepository } from '../../domain/repositories/post-repository';
import type { AppDatabase } from '../local/app-database';
import type { PostRemoteDataSource } from '../remote/post-remote-data-source';
import { toPost } from '../remote/dtos/post-dto';

/**
 * PostRepositoryImpl — orchestrates remote + local sources and implements the
 * offline-first fallback strategy. Mirrors the sibling guides'
 * `PostRepositoryImpl`.
 *
 * Flow:
 *   1. Fetch from the remote source.
 *   2. Cache the result locally (best-effort; a cache write failure is only
 *      logged, never surfaced to the user).
 *   3. On network/server failure, fall back to the local cache:
 *        - cache hit  → Success(posts, warning = upstreamFailure.asWarning()) [non-blocking, Warning]
 *        - cache miss → Failed(upstreamFailure)                       [blocking, Critical]
 *        - cache read fails → Failed(CacheFailure ← upstreamFailure)  [blocking, chained, Critical]
 */
export class PostRepositoryImpl implements PostRepository {
  private readonly remote: PostRemoteDataSource;
  private readonly local: AppDatabase;
  private readonly logger: Logger;

  constructor(
    remote: PostRemoteDataSource,
    local: AppDatabase,
    logger: Logger,
  ) {
    this.remote = remote;
    this.local = local;
    this.logger = logger;
  }

  async getPosts() {
    return safeRepositoryCall<Post[]>({
      logger: this.logger,
      call: async () => {
        const remotePosts = await this.remote.getPosts();
        try {
          await this.local.insertPosts(remotePosts);
        } catch (e) {
          this.logger.warning('Failed to cache posts', e);
        }
        return remotePosts.map(toPost);
      },
      onNetworkError: (cause) => this.serveFromCache(cause),
      onServerError: (cause) => this.serveFromCache(cause),
    });
  }

  /** Cache fallback shared by network + server error paths. */
  private async serveFromCache(cause: AppException) {
    this.logger.warning(
      `Remote fetch failed (${cause.constructor.name}), falling back to cache`,
    );

    // Map the upstream exception ONCE. The resulting Failure is reused for
    // every branch: downgraded to Warning when stale cache is served (so
    // severity matches the non-blocking presentation), or forwarded at its
    // original Critical severity when there is nothing to show.
    const upstreamFailure = mapExceptionToFailure(cause);

    try {
      const cached = await this.local.getPosts();
      if (cached.length > 0) {
        // Non-blocking: show stale data + a Warning (severity lowered because
        // the failure is presented as a toast, not a full-screen error).
        return success(
          cached.map(toPost),
          upstreamFailure.withSeverity(FailureSeverity.Warning),
        );
      }
      // No cache → surface the original upstream failure (blocking, Critical).
      return forwardNetworkFailure(upstreamFailure);
    } catch (e) {
      const dbError =
        e instanceof AppDatabaseException
          ? e
          : new AppDatabaseException('Cache read failed', { cause: e });
      const result = chainedCacheFailure(dbError.message, upstreamFailure);
      this.logger.error(`Cache fallback also failed:\n${result.failure.chain}`);
      return result;
    }
  }
}
