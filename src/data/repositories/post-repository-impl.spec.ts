import { PostRepositoryImpl } from './post-repository-impl';
import { Logger } from '../../core/config/logger';
import { FakeApiService } from '../fake/fake-api-service';
import { FakeAppDatabase } from '../fake/fake-app-database';
import { ApiScenario } from '../../core/scenario/api-scenario';
import { DbScenario } from '../../core/scenario/db-scenario';
import {
  NetworkException,
  ServerException,
} from '../../core/error-handling/exceptions';
import {
  FailureSeverity,
  NetworkFailure,
  UnknownFailure,
} from '../../core/error-handling/failures';

const logger = new Logger('test', false);

describe('PostRepositoryImpl', () => {
  it('returns posts from the remote source on success', async () => {
    const remote = new FakeApiService(ApiScenario.Success);
    const local = new FakeAppDatabase(DbScenario.Success);
    const repo = new PostRepositoryImpl(remote, local, logger);

    const result = await repo.getPosts();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(3);
      const first = result.value[0];
      expect(first).toBeDefined();
      expect(first?.title).toBe('Fake post');
      expect(result.warning).toBeUndefined();
    }
  });

  it('caches posts so a subsequent network failure serves stale data (non-blocking)', async () => {
    const remote = new FakeApiService(ApiScenario.Success);
    const local = new FakeAppDatabase(DbScenario.Success);
    const repo = new PostRepositoryImpl(remote, local, logger);

    // First call: succeeds + caches.
    const first = await repo.getPosts();
    expect(first.ok).toBe(true);

    // Second call: remote fails, but cache has the previous posts.
    remote.setScenario(ApiScenario.NetworkError);
    const result = await repo.getPosts();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(3);
      // The upstream NetworkFailure is downgraded to a non-blocking Warning
      // (served-from-cache): kind and message are preserved (delegated to the
      // underlying NetworkFailure) but severity reflects the toast
      // presentation, not the original Critical.
      expect(result.warning?.kind).toBe('network');
      expect(result.warning?.severity).toBe(FailureSeverity.Warning);
      expect(result.warning?.message).toBe(
        new NetworkFailure().message,
      );
    }
  });

  it('returns a blocking failure when remote fails and cache is empty', async () => {
    const remote = new FakeApiService(ApiScenario.ServerError);
    const local = new FakeAppDatabase(DbScenario.Empty);
    const repo = new PostRepositoryImpl(remote, local, logger);

    const result = await repo.getPosts();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.severity).toBe(FailureSeverity.Critical);
    }
  });

  it('defensively buckets an untyped throw as an UnknownFailure', async () => {
    // A data source is contractually expected to throw typed AppExceptions
    // (it wraps its work in guardedApiCall). If something bypasses that and
    // throws raw, safeRepositoryCall must still produce a Result rather than
    // propagating — bucketed as UnknownFailure.
    const remote: FakeApiService = new FakeApiService(ApiScenario.Success);
    jest.spyOn(remote, 'getPosts').mockRejectedValueOnce(new TypeError('boom'));
    const local = new FakeAppDatabase(DbScenario.Empty);
    const repo = new PostRepositoryImpl(remote, local, logger);

    const result = await repo.getPosts();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure).toBeInstanceOf(UnknownFailure);
    }
  });

  it('chains a CacheFailure when cache read also fails after a network error', async () => {
    const remote = new FakeApiService(ApiScenario.NetworkError);
    const local = new FakeAppDatabase(DbScenario.ReadError);
    const repo = new PostRepositoryImpl(remote, local, logger);

    const result = await repo.getPosts();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.severity).toBe(FailureSeverity.Critical);
      expect(result.failure.cause).toBeInstanceOf(NetworkFailure);
    }
  });

  it('exposes the underlying exception type for orchestration tests', () => {
    // Sanity: the typed exceptions used above exist and chain as expected.
    const net = new NetworkException();
    const server = new ServerException('s', { cause: net });
    expect(server.cause).toBe(net);
  });
});
