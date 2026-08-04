import { useState } from 'react';

/**
 * Build & Deployment view logic — owns the LIVE profile-selector state and the
 * pure domain helpers the view renders. Grounded in the real files:
 *   eas.json                      (build profiles → APP_ENV, distribution, etc.)
 *   app.config.ts                 (build-time config from process.env.APP_ENV)
 *   core/config/index.ts          (createAppConfig reads expo-constants)
 *
 * The EAS profile table is a const-object that MIRRORS `eas.json` (which is not
 * importable as a module at runtime). Keep it in sync with that file.
 */

/** The three EAS build profiles that exist in the real `eas.json`. */
export type BuildProfileName = 'development' | 'staging' | 'production';

/** Per-profile resolved summary derived from the mirrored `eas.json` shape. */
export interface BuildProfileSummary {
  /** `distribution` field from `eas.json` — who the binary is built for. */
  distribution: 'internal' | 'store';
  /** Whether the profile produces an Expo Dev Client build (vs Expo Go). */
  developmentClient: boolean;
  /** Whether `autoIncrement` bumps the build number per build. */
  autoIncrement: boolean;
  /** The `env.APP_ENV` value the profile injects into `app.config.ts`. */
  appEnv: 'dev' | 'staging' | 'prod';
}

/** Shape of one entry in the mirrored `eas.json` build block. */
export interface EasProfileEntry {
  developmentClient?: boolean;
  distribution?: 'internal' | 'store';
  autoIncrement?: boolean;
  env: { APP_ENV: 'dev' | 'staging' | 'prod' };
}

/**
 * A const-object MIRROR of `eas.json`'s `build` block. It is NOT imported from
 * the JSON (that is not a runtime module); it is kept here as the single
 * in-app source of the same data so the selector demo is honest. If you edit
 * `eas.json`, edit this object to match.
 */
export const EAS_PROFILES: Record<BuildProfileName, EasProfileEntry> = {
  development: {
    developmentClient: true,
    distribution: 'internal',
    env: { APP_ENV: 'dev' },
  },
  staging: {
    distribution: 'internal',
    env: { APP_ENV: 'staging' },
  },
  production: {
    autoIncrement: true,
    env: { APP_ENV: 'prod' },
  },
};

/**
 * Derive a presentational summary per profile from the mirrored `eas.json`
 * shape. Pure: same input → same output, no side effects. Keys: the three
 * profile names; values: a resolved `BuildProfileSummary`.
 */
export function buildProfileSummary(): Record<
  BuildProfileName,
  BuildProfileSummary
> {
  const resolve = (
    name: BuildProfileName,
  ): BuildProfileSummary => {
    const p = EAS_PROFILES[name];
    // Production's `distribution` is implicit `store` (the default when omitted
    // and the profile is the store-release one); dev/staging are `internal`.
    const distribution: 'internal' | 'store' =
      name === 'production' ? 'store' : 'internal';
    return {
      distribution,
      developmentClient: p.developmentClient ?? false,
      autoIncrement: p.autoIncrement ?? false,
      appEnv: p.env.APP_ENV,
    };
  };
  return {
    development: resolve('development'),
    staging: resolve('staging'),
    production: resolve('production'),
  };
}

/** A single pre-release step in the release checklist (presentational). */
export interface ReleaseStep {
  /** 1-based order in the checklist. */
  order: number;
  /** Short imperative title, e.g. "Bump version". */
  title: string;
  /** Why/where — the real file or command this step touches. */
  detail: string;
}

/**
 * The ordered pre-release checklist. Pure presentational data; the order is
 * load-bearing (each step assumes the previous one is done).
 */
export function releaseChecklist(): readonly ReleaseStep[] {
  return [
    {
      order: 1,
      title: 'Bump version',
      detail: 'Bump `version` in app.config.ts (and/or let `autoIncrement` bump the build number via eas.json).',
    },
    {
      order: 2,
      title: 'Select the production profile',
      detail: '`eas build --profile production` sets APP_ENV=prod so app.config.ts resolves the store name + bundle id.',
    },
    {
      order: 3,
      title: 'Verify signing credentials',
      detail: '`eas credentials` — iOS (Apple Developer + provisioning) and Android (upload keystore). Use EAS-managed unless you have a reason not to.',
    },
    {
      order: 4,
      title: 'Prepare store listing assets',
      detail: 'Icons, screenshots, descriptions, privacy URL — App Store Connect + Google Play Console.',
    },
    {
      order: 5,
      title: 'Build + submit',
      detail: '`eas build --profile production --platform <ios|android>` then `eas submit` (or `--auto-submit`).',
    },
    {
      order: 6,
      title: 'Roll an OTA update if needed',
      detail: 'For JS-only fixes: `eas update` with a matching runtimeVersion. No store re-review for JS-bundle-only changes.',
    },
  ];
}

export interface BuildPlayground {
  /** Currently selected profile name. */
  profile: BuildProfileName;
  /** Switch the selected profile (drives the resolved summary below). */
  setProfile: (p: BuildProfileName) => void;
  /** All profile summaries (so the UI can show the full table too). */
  summaries: Record<BuildProfileName, BuildProfileSummary>;
  /** The resolved summary for the currently selected profile. */
  selected: BuildProfileSummary;
}

/** LIVE profile selector — exposes the 3 profiles + the resolved summary. */
export function useBuildPlayground(
  initial: BuildProfileName = 'development',
): BuildPlayground {
  const [profile, setProfile] = useState<BuildProfileName>(initial);
  const summaries = buildProfileSummary();
  return {
    profile,
    setProfile,
    summaries,
    selected: summaries[profile],
  };
}
