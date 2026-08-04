import { useState } from 'react';
import { Dimensions, Platform, PixelRatio } from 'react-native';
import { platformMessage, nativeGreeting } from './platform_message';

/**
 * Platform-Specific Code — view logic. Platform reads + the LIVE demo state
 * live here so the view stays a dumb structure. Three artefacts the view's
 * `<Code>` blocks cite:
 *
 *  - `platformFacts()`      — pure read of Platform / PixelRatio / Dimensions
 *  - `selectByPlatform<T>()`— pure wrapper around `Platform.select`
 *  - `usePlatformDemo()`    — small interactive demo (toggle + per-platform value)
 *
 * Plus `platformMessage` / `nativeGreeting`, which come from the
 * `platform_message.*` extension pair — the LIVE proof that Metro's
 * platform-extension resolution works (see the view's "File extensions" section).
 *
 * `Platform.OS` is 'ios' under jest-expo by default. Pure helpers take an
 * optional override so a spec can exercise the android branch without mocking.
 * No `any`; strict + erasure-clean.
 */

/** The platforms React Native targets. */
export const PLATFORMS = {
  ios: 'ios',
  android: 'android',
  web: 'web',
} as const;

export type PlatformId = (typeof PLATFORMS)[keyof typeof PLATFORMS];

/** A window-size bucket reported by `platformFacts`. */
export interface WindowSize {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

/** A plain snapshot of the host platform — fully serialisable, test-friendly. */
export interface PlatformFacts {
  os: PlatformId | string;
  version: number | string;
  pixelRatio: number;
  isTV: boolean;
  isTesting: boolean;
  window: WindowSize;
}

/**
 * Read a plain snapshot of the current platform. Pure given its inputs —
 * `Dimensions.get('window')` is read inside so callers don't have to thread it,
 * but the override arguments exist so specs can exercise branches deterministically.
 */
export function platformFacts(
  overrides: { os?: PlatformId | string; version?: number | string } = {},
  window = Dimensions.get('window'),
): PlatformFacts {
  return {
    os: overrides.os ?? Platform.OS,
    version: overrides.version ?? Platform.Version,
    pixelRatio: PixelRatio.get(),
    isTV: Platform.isTV ?? false,
    isTesting: Platform.isTesting ?? false,
    window: {
      width: window.width,
      height: window.height,
      scale: window.scale,
      fontScale: window.fontScale,
    },
  };
}

/**
 * Pure wrapper around `Platform.select`. Returns the value for the current
 * platform. `web` is optional — omitting it means "no web-specific value" (the
 * function then returns `undefined` on web, mirroring `Platform.select`).
 */
export function selectByPlatform<T>(
  ios: T,
  android: T,
  web?: T,
  os: PlatformId | string = Platform.OS,
): T | undefined {
  if (os === PLATFORMS.ios) return ios;
  if (os === PLATFORMS.android) return android;
  if (os === PLATFORMS.web) return web;
  return undefined;
}

/** Per-platform accent label used by the LIVE `Platform.select` demo. */
export const PLATFORM_LABELS = {
  ios: 'iOS · system blue',
  android: 'Android · Material teal',
  web: 'Web · CSS link blue',
} as const;

/** Per-platform accent colour token name for the LIVE demo. */
export const PLATFORM_ACCENT = {
  ios: 'primary',
  android: 'success',
  web: 'danger',
} as const;

export interface PlatformDemo {
  facts: PlatformFacts;
  /** The resolved per-platform label for the current OS (LIVE). */
  example: string;
  /** The string the extension-resolution demo received from Metro. */
  resolvedMessage: string;
  resolvedGreeting: string;
  /** Whether the toggle is on (purely presentational state). */
  toggle: boolean;
  setToggle: (v: boolean) => void;
}

/**
 * Small LIVE demo: surface the resolved platform facts + the per-platform value
 * chosen by `Platform.select`, plus the resolved `platform_message.*` import so
 * the view can prove the extension resolution worked. The toggle is presentational
 * state — it lets the view demonstrate toggling a branch without wiring real logic.
 */
export function usePlatformDemo(): PlatformDemo {
  const [toggle, setToggle] = useState(false);
  const facts = platformFacts();
  const example =
    selectByPlatform(
      PLATFORM_LABELS.ios,
      PLATFORM_LABELS.android,
      PLATFORM_LABELS.web,
      facts.os,
    ) ?? '(unknown platform)';
  return {
    facts,
    example,
    resolvedMessage: platformMessage,
    resolvedGreeting: nativeGreeting,
    toggle,
    setToggle,
  };
}
