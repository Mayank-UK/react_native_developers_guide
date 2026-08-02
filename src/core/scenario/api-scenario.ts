/**
 * Selects which failure path the dev-only failure-injection interceptor (and the
 * FakeApiService) simulates. Mirrors the sibling guides' `ApiScenario`.
 *
 * The active scenario can be flipped at runtime from the API/Exception-handling
 * screen to exercise the full error pipeline without a real failing server.
 *
 * Const object + literal union (not an `enum`) — keeps types erasable
 * (`erasableSyntaxOnly`) and gives a runtime value table too.
 */
export const ApiScenario = {
  Success: 'success',
  NetworkError: 'networkError',
  Timeout: 'timeout',
  ServerError: 'serverError',
  InvalidJson: 'invalidJson',
} as const;

export type ApiScenario = (typeof ApiScenario)[keyof typeof ApiScenario];

export const API_SCENARIOS: readonly ApiScenario[] = Object.values(ApiScenario);
