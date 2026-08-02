import Constants from 'expo-constants';
import type { ExpoConfig } from 'expo/config';
import {
  Environment,
  type AppConfig,
} from './app-config';
import {
  ApiScenario,
  API_SCENARIOS,
  type ApiScenario as ApiScenarioType,
} from '../scenario/api-scenario';
import {
  DbScenario,
  DB_SCENARIOS,
  type DbScenario as DbScenarioType,
} from '../scenario/db-scenario';

/**
 * Build the AppConfig from Expo's build-time env (`app.config.ts` `extra` →
 * `expo-constants`). `EXPO_PUBLIC_*` vars are inlined at build time; `extra`
 * is read via `Constants.expoConfig`.
 *
 * Note (RN vs web reference): the web guide keys off `import.meta.env.MODE`.
 * Expo has no per-mode bundler flag; instead `app.config.ts` reads `APP_ENV`
 * (set per EAS build profile) and forwards it through `extra.appEnv`.
 */
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function resolveEnvironment(raw: string | undefined): Environment {
  if (raw === 'staging') return Environment.Staging;
  if (raw === 'prod') return Environment.Prod;
  return Environment.Dev;
}

/** Parse + validate a scenario env var against its allowed literal set. */
function parseApiScenario(value: string | undefined): ApiScenarioType {
  if (value === undefined) return ApiScenario.Success;
  const match = API_SCENARIOS.find((s) => s === value);
  if (!match) {
    throw new Error(
      `Invalid API_SCENARIO "${value}"; expected one of ${API_SCENARIOS.join(', ')}.`,
    );
  }
  return match;
}

function parseDbScenario(value: string | undefined): DbScenarioType {
  if (value === undefined) return DbScenario.Success;
  const match = DB_SCENARIOS.find((s) => s === value);
  if (!match) {
    throw new Error(
      `Invalid DB_SCENARIO "${value}"; expected one of ${DB_SCENARIOS.join(', ')}.`,
    );
  }
  return match;
}

/** Raw env shape coming from `app.config.ts`'s `extra` block. */
export interface EnvSource {
  appEnv?: string;
  baseUrl?: string;
  useFakeApi?: string;
  useFakeDatabase?: string;
  enableLogs?: string;
  apiScenario?: string;
  dbScenario?: string;
}

/** Read the env source from expo-constants (production path). */
function readFromConstants(): EnvSource {
  const extra = (Constants.expoConfig as ExpoConfig | undefined)?.extra as
    | Record<string, unknown>
    | undefined;
  const pick = (k: string): string | undefined => {
    const v = extra?.[k];
    return typeof v === 'string' ? v : undefined;
  };
  return {
    appEnv: pick('appEnv'),
    baseUrl: pick('baseUrl'),
    useFakeApi: pick('useFakeApi'),
    useFakeDatabase: pick('useFakeDatabase'),
    enableLogs: pick('enableLogs'),
    apiScenario: pick('apiScenario'),
    dbScenario: pick('dbScenario'),
  };
}

export function createAppConfig(env: EnvSource = readFromConstants()): AppConfig {
  const environment = resolveEnvironment(env.appEnv);

  return {
    environment,
    baseUrl: env.baseUrl ?? 'https://jsonplaceholder.typicode.com',
    // Fakes + failure injection are dev-only conveniences.
    useFakeApi:
      environment === Environment.Dev
        ? parseBoolean(env.useFakeApi, true)
        : false,
    useFakeDatabase:
      environment === Environment.Dev
        ? parseBoolean(env.useFakeDatabase, true)
        : false,
    enableLogs: parseBoolean(
      env.enableLogs,
      environment !== Environment.Prod,
    ),
    apiScenario: parseApiScenario(env.apiScenario),
    dbScenario: parseDbScenario(env.dbScenario),
  };
}
