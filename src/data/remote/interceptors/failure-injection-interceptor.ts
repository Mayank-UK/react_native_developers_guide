import {
  ApiScenario,
  type ApiScenario as ApiScenarioType,
} from '../../../core/scenario/api-scenario';
import {
  NetworkException,
  ServerException,
} from '../../../core/error-handling/exceptions';
import type { RequestInterceptor } from '../http-client';

/**
 * FailureInjectionInterceptor — dev-only. Mirrors the sibling guides'
 * `FailureInjectionInterceptor`. Lets you force the data layer down a specific
 * failure path (network / timeout / server / invalid-json) so the entire error
 * pipeline can be exercised without a real failing server.
 *
 * It inspects the active `ApiScenario` (mutable, so the API/Exception-handling
 * screen can flip it at runtime) and throws a typed AppException *before* the
 * request is dispatched.
 */
export class FailureInjectionInterceptor {
  private readonly getScenario: () => ApiScenarioType;

  constructor(getScenario: () => ApiScenario) {
    this.getScenario = getScenario;
  }

  attach(registry: RequestInterceptor[]): void {
    registry.push((req) => {
      switch (this.getScenario()) {
        case ApiScenario.NetworkError:
          throw new NetworkException('Simulated no internet connection');
        case ApiScenario.Timeout:
          throw new NetworkException('Simulated request timed out');
        case ApiScenario.ServerError:
          throw new ServerException('Simulated server returned 500');
        case ApiScenario.InvalidJson:
          throw new ServerException('Simulated invalid response format');
        case ApiScenario.Success:
        default:
          return req;
      }
    });
  }
}
