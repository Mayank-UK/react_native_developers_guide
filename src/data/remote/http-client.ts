import type { AppConfig } from '../../core/config/app-config';
import type { Logger } from '../../core/config/logger';
import type { ApiScenario } from '../../core/scenario/api-scenario';
import { statusToException } from '../../core/error-handling/guards';
import { AuthTokenInterceptor } from './interceptors/auth-token-interceptor';
import { FailureInjectionInterceptor } from './interceptors/failure-injection-interceptor';
import { RetryPolicy } from './interceptors/retry-policy';

/**
 * http-client — fetch-based HTTP engine for React Native. Mirrors the sibling
 * guides' HTTP client shape (base URL, interceptors, retry, failure-injection)
 * but uses RN's built-in `fetch` instead of axios.
 *
 * Note (RN vs web reference): the web guide uses `axios` with request/response
 * interceptor managers. RN's standard HTTP engine is the built-in `fetch`, so
 * we implement a small, explicit interceptor pipeline around it:
 *
 *   request interceptors (auth, failure-injection) → dispatch (timeout + retry)
 *     → response → JSON parse → status guard
 *
 * Retry lives in the dispatcher (the natural place for fetch) rather than a
 * response interceptor. The two-stage error mapping is identical: the guards
 * convert fetch's raw signals (TypeError, SyntaxError, DOMException, status
 * codes) into typed `AppException`s.
 */

export interface HttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body?: unknown;
}

export type RequestInterceptor = (
  req: HttpRequest,
) => HttpRequest | Promise<HttpRequest>;

export interface HttpClient {
  get<T>(path: string): Promise<T>;
  request<T>(req: HttpRequest): Promise<T>;
}

export interface HttpClientDeps {
  config: AppConfig;
  logger: Logger;
  getToken?: () => string | null;
  getScenario: () => ApiScenario;
}

export function createHttpClient(deps: HttpClientDeps): HttpClient {
  const {
    config,
    logger,
    getToken = () => null,
    getScenario,
  } = deps;

  const requestInterceptors: RequestInterceptor[] = [];
  // Request interceptors: order mirrors the web reference.
  new AuthTokenInterceptor(getToken).attach(requestInterceptors);
  if (config.environment === 'dev') {
    new FailureInjectionInterceptor(getScenario).attach(requestInterceptors);
  }

  const retry = new RetryPolicy({
    attempts: 2,
    baseDelayMs: 300,
    retryOn: (error) => {
      // Only retry transient network failures (not server statuses, which are
      // thrown as ServerException / AuthException and surfaced by reference).
      return error instanceof TypeError;
    },
  });

  async function dispatch(req: HttpRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.environment === 'dev' ? 10_000 : 15_000,
    );

    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          // No/partial body — fall through with undefined.
        }
        throw statusToException(response.status, body);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function run(req: HttpRequest): Promise<unknown> {
    // Apply request interceptors in order (auth → failure-injection).
    let current = req;
    for (const interceptor of requestInterceptors) {
      current = await interceptor(current);
    }

    if (config.enableLogs) {
      logger.debug(`→ ${current.method} ${current.url}`);
    }

    return retry.run(() => dispatch(current), current.url, logger);
  }

  return {
    async request<T>(req: HttpRequest): Promise<T> {
      const json = await run(req);
      return json as T;
    },
    get<T>(path: string): Promise<T> {
      return this.request<T>({
        url: `${config.baseUrl}${path}`,
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    },
  };
}
