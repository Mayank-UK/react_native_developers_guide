import { useState } from 'react';
import Constants from 'expo-constants';
import type { ExpoConfig } from 'expo/config';
import { container } from '../../../core/container';
import type { AppConfig } from '../../../core/config/app-config';

/**
 * Environments view logic — owns the two LIVE interactive demos' state +
 * container reads so the view stays a dumb structure. Grounded in the real
 * files:
 *   app.config.ts                 (build-time config from process.env.APP_ENV)
 *   eas.json                      (build profiles → APP_ENV)
 *   core/config/index.ts          (createAppConfig reads expo-constants)
 *   core/config/app-config.ts     (AppConfig shape + Environment const-object)
 *
 * Hooks:
 *  - useLiveResolved: re-render trigger + the live read of the resolved
 *    AppConfig + expo-constants identity (name/bundle id/env).
 *  - useFlagPlayground: the dev-only diagnostics panel state (devPanel +
 *    verbose toggles) plus all container reads the panel renders.
 *
 * Pure helper (readLiveConfig) is exported for unit testing.
 */

export interface LiveConfig {
  config: AppConfig;
  appName: string;
  bundleId: string;
  androidPackage: string;
  appEnv: string;
}

/** Read non-sensitive values from the live expo-constants + AppConfig. */
export function readLiveConfig(): LiveConfig {
  const expo = Constants.expoConfig as ExpoConfig | undefined;
  const extra = expo?.extra as Record<string, unknown> | undefined;
  return {
    config: container.appConfig,
    appName: expo?.name ?? '(unknown)',
    bundleId: expo?.ios?.bundleIdentifier ?? '(unknown)',
    androidPackage: expo?.android?.package ?? '(unknown)',
    appEnv: typeof extra?.appEnv === 'string' ? extra.appEnv : '(unknown)',
  };
}

export interface LiveResolved {
  live: LiveConfig;
  /** Re-read expo-constants + the container on demand. */
  reread: () => void;
}

/** The current resolved config + a re-read trigger for the LIVE panel. */
export function useLiveResolved(): LiveResolved {
  const [, force] = useState(0);
  const live = readLiveConfig();
  return {
    live,
    reread: () => force((n) => n + 1),
  };
}

export interface FlagPlayground {
  config: AppConfig;
  devPanel: boolean;
  setDevPanel: (v: boolean) => void;
  verbose: boolean;
  setVerbose: (v: boolean) => void;
  apiScenario: string;
  dbScenario: string;
  useFakeApi: boolean;
}

/** The dev-only diagnostics panel state + all container reads it renders. */
export function useFlagPlayground(): FlagPlayground {
  const config = container.appConfig;
  const [devPanel, setDevPanel] = useState(true);
  const [verbose, setVerbose] = useState(config.enableLogs);
  return {
    config,
    devPanel,
    setDevPanel,
    verbose,
    setVerbose,
    apiScenario: container.getApiScenario(),
    dbScenario: container.getDbScenario(),
    useFakeApi: container.getUseFakeApi(),
  };
}
