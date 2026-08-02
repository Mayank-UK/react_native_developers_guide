import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * app.config.ts — Expo environment-driven config (the RN analogue of Vite's env
 * modes + the reference's `src/core/config/index.ts`). Expo resolves this file
 * at build time; EAS passes `APP_ENV` (dev|staging|prod) via the build profile's
 * `env:` map. `process.env` is therefore build-time, not runtime.
 *
 * Note (RN vs web reference): the web guide resolves env from `import.meta.env`
 * per Vite mode. Expo's standard is `app.config.ts` + `process.env` + an
 * `extra` object consumed in-app via `expo-constants`. See
 * `src/core/config/index.ts`.
 */

type AppEnv = 'dev' | 'staging' | 'prod';

function resolveEnv(raw: string | undefined): AppEnv {
  if (raw === 'staging' || raw === 'prod') return raw;
  return 'dev';
}

const env = resolveEnv(process.env.APP_ENV);
const isProd = env === 'prod';
const appName =
  env === 'prod' ? 'RN Developers Guide' : `RN Guide (${env})`;
const bundleId =
  env === 'prod'
    ? 'com.rndguide.app'
    : `com.rndguide.${env}`;

const config: ExpoConfig = {
  name: appName,
  slug: 'react-native-developers-guide',
  version: '1.0.0',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  scheme: 'rndguide',
  splash: {
    backgroundColor: '#0b1220',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: '#0b1220',
    },
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  plugins: ['expo-router', 'expo-font'],
  experiments: {
    tsconfigPaths: true,
  },
  extra: {
    appEnv: env,
    baseUrl:
      process.env.EXPO_PUBLIC_BASE_URL ?? 'https://jsonplaceholder.typicode.com',
    useFakeApi: process.env.EXPO_PUBLIC_USE_FAKE_API ?? (isProd ? 'false' : 'true'),
    useFakeDatabase:
      process.env.EXPO_PUBLIC_USE_FAKE_DB ?? (isProd ? 'false' : 'true'),
    enableLogs: process.env.EXPO_PUBLIC_ENABLE_LOGS ?? (isProd ? 'false' : 'true'),
    apiScenario: process.env.EXPO_PUBLIC_API_SCENARIO ?? 'success',
    dbScenario: process.env.EXPO_PUBLIC_DB_SCENARIO ?? 'success',
    eas: {
      projectId: '',
    },
  },
};

export default config;
