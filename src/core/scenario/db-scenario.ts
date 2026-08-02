/**
 * Selects which failure path the dev-only FakeAppDatabase simulates. Mirrors the
 * sibling guides' `DbScenario`.
 */
export const DbScenario = {
  Success: 'success',
  Empty: 'empty',
  ReadError: 'readError',
  WriteError: 'writeError',
} as const;

export type DbScenario = (typeof DbScenario)[keyof typeof DbScenario];

export const DB_SCENARIOS: readonly DbScenario[] = Object.values(DbScenario);
