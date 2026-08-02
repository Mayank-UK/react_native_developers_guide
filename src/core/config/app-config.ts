import type { ApiScenario } from '../scenario/api-scenario';
import type { DbScenario } from '../scenario/db-scenario';

/**
 * Application configuration — mirrors the sibling guides' `AppConfig`.
 *
 * Note (RN vs web reference): the web guide resolves env from Vite's
 * `import.meta.env` per `--mode`. Expo's standard is `app.config.ts` +
 * `EXPO_PUBLIC_*` env vars, surfaced in-app via `expo-constants`. See
 * `src/core/config/index.ts`.
 *
 * `Environment` is a const object + literal union (not an `enum`) to stay
 * compatible with `erasableSyntaxOnly`.
 */
export const Environment = {
  Dev: 'dev',
  Staging: 'staging',
  Prod: 'prod',
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];

export interface AppConfig {
  environment: Environment;
  baseUrl: string;
  useFakeApi: boolean;
  useFakeDatabase: boolean;
  enableLogs: boolean;
  /** Dev-only failure simulation for the REST client + FakeApiService. */
  apiScenario: ApiScenario;
  /** Dev-only failure simulation for the local database + FakeAppDatabase. */
  dbScenario: DbScenario;
}

export const isDev = (c: AppConfig): boolean => c.environment === Environment.Dev;
export const isStaging = (c: AppConfig): boolean =>
  c.environment === Environment.Staging;
export const isProd = (c: AppConfig): boolean => c.environment === Environment.Prod;
