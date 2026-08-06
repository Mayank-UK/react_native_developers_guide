import {
  toAppException,
  mapExceptionToFailure,
  safeRepositoryCall,
  statusToException,
  chainedCacheFailure,
} from './guards';
import {
  AppException,
  AppDatabaseException,
  AuthException,
  NetworkException,
  ServerException,
  TimeoutException,
} from '../exceptions';
import {
  AuthFailure,
  CacheFailure,
  DatabaseFailure,
  FailureSeverity,
  NetworkFailure,
  ServerFailure,
  UnknownFailure,
} from '../failures';
import { Logger } from '../../config/logger';

const silentLogger = new Logger('test', false);

describe('toAppException', () => {
  it('is idempotent for AppException', () => {
    const e = new ServerException('boom');
    expect(toAppException(e)).toBe(e);
  });

  it('maps TypeError (fetch network failure) to NetworkException', () => {
    expect(toAppException(new TypeError('Network request failed'))).toBeInstanceOf(
      NetworkException,
    );
  });

  it('maps SyntaxError (bad JSON) to ServerException', () => {
    expect(toAppException(new SyntaxError('Unexpected token'))).toBeInstanceOf(
      ServerException,
    );
  });

  it('maps unknown errors to ServerException', () => {
    expect(toAppException('something weird')).toBeInstanceOf(ServerException);
  });
});

describe('statusToException', () => {
  it('maps 401/403 to AuthException', () => {
    expect(statusToException(401, undefined)).toBeInstanceOf(AuthException);
    expect(statusToException(403, undefined)).toBeInstanceOf(AuthException);
  });

  it('maps other statuses to ServerException', () => {
    const e = statusToException(500, { message: 'down' });
    expect(e).toBeInstanceOf(ServerException);
    expect(e.message).toBe('down');
  });
});

describe('mapExceptionToFailure', () => {
  it('maps each exception kind to the matching failure', () => {
    expect(mapExceptionToFailure(new NetworkException())).toBeInstanceOf(
      NetworkFailure,
    );
    expect(mapExceptionToFailure(new TimeoutException())).toBeInstanceOf(
      NetworkFailure,
    );
    expect(mapExceptionToFailure(new ServerException())).toBeInstanceOf(
      ServerFailure,
    );
    expect(mapExceptionToFailure(new AuthException())).toBeInstanceOf(AuthFailure);
    expect(mapExceptionToFailure(new AppDatabaseException())).toBeInstanceOf(
      DatabaseFailure,
    );
  });

  it('preserves the cause chain recursively', () => {
    const root = new NetworkException('net down');
    const mid = new ServerException('server then failed', { cause: root });
    const failure = mapExceptionToFailure(mid);

    expect(failure).toBeInstanceOf(ServerFailure);
    expect(failure.cause).toBeInstanceOf(NetworkFailure);
    expect(failure.message).toContain('net down');
    expect(failure.chain).toContain('caused by');
  });

  it('falls back to UnknownFailure', () => {
    class Weird extends AppException {}
    expect(mapExceptionToFailure(new Weird('unmapped'))).toBeInstanceOf(
      UnknownFailure,
    );
  });
});

describe('safeRepositoryCall', () => {
  it('wraps a successful call in a Success result', async () => {
    const result = await safeRepositoryCall({
      logger: silentLogger,
      call: async () => 'ok',
    });
    expect(result.ok).toBe(true);
  });

  it('converts thrown AppExceptions into a Failed result', async () => {
    const result = await safeRepositoryCall<string>({
      logger: silentLogger,
      call: async () => {
        throw new NetworkException();
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure).toBeInstanceOf(NetworkFailure);
      expect(result.failure.severity).toBe(FailureSeverity.Critical);
    }
  });

  it('invokes the network fallback when provided', async () => {
    const result = await safeRepositoryCall<number>({
      logger: silentLogger,
      call: async () => {
        throw new NetworkException();
      },
      onNetworkError: async () => ({ ok: true, value: 99 }),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(99);
  });
});

describe('chainedCacheFailure', () => {
  it('produces a Critical CacheFailure carrying the upstream failure', () => {
    const upstream = new NetworkFailure('net down');
    const result = chainedCacheFailure('cache read failed', upstream);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const f = result.failure as CacheFailure;
      expect(f.severity).toBe(FailureSeverity.Critical);
      expect(f.cause).toBe(upstream);
    }
  });
});
