import type { RequestInterceptor } from '../http-client';

/**
 * AuthTokenInterceptor — attaches the auth header to every request. Mirrors the
 * sibling guides' interceptor. Token resolution is deferred via `getToken` so
 * the header always reflects the current session, not a value captured at
 * construction.
 */
export class AuthTokenInterceptor {
  private readonly getToken: () => string | null;

  constructor(getToken: () => string | null) {
    this.getToken = getToken;
  }

  attach(registry: RequestInterceptor[]): void {
    registry.push((req) => {
      const token = this.getToken();
      if (token) {
        return {
          ...req,
          headers: { ...req.headers, Authorization: `Bearer ${token}` },
        };
      }
      return req;
    });
  }
}
