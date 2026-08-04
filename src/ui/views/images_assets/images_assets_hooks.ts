import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageContentFit } from 'expo-image';

/**
 * Images, Icons, Splash & Assets — view logic. All React state + the
 * (simulated) native-call surfaces live here so the view stays a dumb
 * structure. Three teaching artefacts:
 *
 *  - `useImageLoaderDemo()`   — drives a LIVE expo-image `<Image>` load via
 *                                `onLoad`/`onError` callbacks, mirroring the
 *                                load lifecycle into React state.
 *  - `useAssetBundleDemo()`   — illustrates `expo-asset`'s `Asset.loadAsync`
 *                                remote-bundle download/cache WITHOUT calling
 *                                it (a simulated progress curve so the demo
 *                                is observable offline).
 *  - pure helpers + const-objects — `imageLoaderLabel`, `resizeModeLabel`,
 *                                `iconSizeLabel`, `LOAD_STATE`, `RESIZE_MODES`,
 *                                `ASSET_TYPE`, plus the `CONTENT_FIT` matrix.
 *
 * No `any`; strict + erasure-clean (const-object + literal union, no enums).
 * React-19-safe: every `setState` happens in an event callback or an effect,
 * NEVER nested inside another updater; updaters are pure (the asset-bundle
 * progress is read from a ref mirror, not from state inside an updater —
 * mirrors the `useTimerDemo`/`useAppStateLog` patterns in sibling screens).
 */

/* ------------------------------------------------------------------ */
/* 0. Pure const-objects + literal unions (NO enums)                   */
/* ------------------------------------------------------------------ */

/**
 * The four lifecycle states the LIVE expo-image demo surfaces. expo-image
 * fires `onLoadStart` → (`onLoad` | `onError`) → `onLoadEnd`; we collapse
 * that to a UI-friendly state machine that the view branches on. Pure data,
 * NOT an `enum` (survives `erasableSyntaxOnly`).
 */
export const LOAD_STATE = {
  idle: 'idle',
  loading: 'loading',
  loaded: 'loaded',
  error: 'error',
} as const;

export type LoadState = (typeof LOAD_STATE)[keyof typeof LOAD_STATE];

/**
 * RN's built-in `ImageResizeMode` values (cover/contain/stretch/center/repeat).
 * These are the *built-in `<Image>`* prop values — kept distinct from
 * `expo-image`'s `contentFit`, whose vocabulary differs slightly (it uses
 * `fill` instead of `stretch` and adds `scale-down`/`none`; see CONTENT_FIT).
 * Cited verbatim by the view's resize-modes section.
 */
export const RESIZE_MODES = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'stretch',
  center: 'center',
  repeat: 'repeat',
} as const;

export type ResizeMode = (typeof RESIZE_MODES)[keyof typeof RESIZE_MODES];

/**
 * The three ways an image/font asset can be wired into a RN bundle. Cited by
 * the dynamic-asset-loading section. Pure data, NOT an `enum`.
 */
export const ASSET_TYPE = {
  static: 'static',
  dynamic: 'dynamic',
  bundled: 'bundled',
} as const;

export type AssetType = (typeof ASSET_TYPE)[keyof typeof ASSET_TYPE];

/**
 * expo-image `contentFit` values (the expo-image analogue of RN's
 * `resizeMode`). Each row pairs the value with a one-line description so the
 * view can render the comparison matrix without a switch in JSX. The
 * `fit` field is typed as `ImageContentFit` so the value is directly
 * assignable to the `<Image contentFit>` prop.
 */
export interface ContentFitRow {
  fit: ImageContentFit;
  label: string;
  description: string;
}

export const CONTENT_FIT: readonly ContentFitRow[] = [
  { fit: 'cover', label: 'cover', description: 'Fill the frame, crop overflow. The default.' },
  { fit: 'contain', label: 'contain', description: 'Whole image visible; letterboxed.' },
  { fit: 'fill', label: 'fill', description: 'Stretch to fill (distorts aspect ratio).' },
  { fit: 'scale-down', label: 'scale-down', description: 'Fit like contain, never upscale.' },
  { fit: 'none', label: 'none', description: 'Render at natural size; overflow clipped.' },
];

/* ------------------------------------------------------------------ */
/* 1. Pure helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Map a load lifecycle state to a short UI label. Pure — exported for unit
 * testing. `error` carries a hint because the demo's only failure mode is a
 * network/decode error (the URL is unreachable or the bytes aren't an image).
 */
export function imageLoaderLabel(state: LoadState): string {
  switch (state) {
    case 'idle':
      return 'Idle';
    case 'loading':
      return 'Loading…';
    case 'loaded':
      return 'Loaded';
    case 'error':
      return 'Error — unreachable URL or bad bytes';
  }
}

/**
 * Map a built-in `<Image>` resize mode to a one-line description. Pure —
 * exported for unit testing. Used by the resize-modes matrix in the view.
 */
export function resizeModeLabel(mode: ResizeMode): string {
  switch (mode) {
    case 'cover':
      return 'Fill frame, crop overflow';
    case 'contain':
      return 'Whole image, letterboxed';
    case 'stretch':
      return 'Stretch to fill (distorts)';
    case 'center':
      return 'Centered at natural size';
    case 'repeat':
      return 'Tile across the view (iOS only)';
  }
}

/**
 * The canonical app-icon dimension guidance. Pure — exported for unit
 * testing. Returns the master size + the adaptive-icon foreground/background
 * note (cited by the app-icon section). One string so the view can render it
 * verbatim and the spec can assert on it without re-deriving the rule.
 */
export function iconSizeLabel(): string {
  return '1024×1024 PNG master · Android adaptive: 108dp (foreground safe-zone 66dp) · iOS @1x 1024px';
}

/* ------------------------------------------------------------------ */
/* 2. useImageLoaderDemo — LIVE expo-image load                        */
/* ------------------------------------------------------------------ */

/**
 * A stable public placeholder image (Lorem Picsum). Seeded so each `reload()`
 * re-fetches a fresh image. NOTE: requires network — works in Expo Go on a
 * real device; the web export may be offline (the view surfaces this caveat).
 */
function imageSourceFor(seed: number): { uri: string } {
  return { uri: 'https://picsum.photos/seed/' + seed + '/600/400' };
}

/** A real blurhash placeholder (grey gradient) used by the LIVE demo. */
const PLACEHOLDER_BLURHASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

export interface ImageLoaderDemo {
  /** Current load lifecycle state (drives the Pill + the placeholder reveal). */
  state: LoadState;
  /** Number of successful loads observed (increments on each onLoad). */
  loadCount: number;
  /** The source passed to `<Image>` (changes each reload to defeat the cache). */
  source: { uri: string };
  /** blurhash placeholder string for the `<Image placeholder>` prop. */
  placeholder: string;
  /** contentFit passed to the `<Image>` (cover — the sensible default). */
  contentFit: ImageContentFit;
  /** Pass to `<Image onLoad={...}>`. Transitions to `loaded` + bumps count. */
  onLoad: () => void;
  /** Pass to `<Image onError={...}>`. Transitions to `error`. */
  onError: () => void;
  /** Force a fresh URL + flip back to `loading` (the cache-busting reload). */
  reload: () => void;
}

/**
 * Drives a LIVE expo-image `<Image>` load. The hook owns the load-state
 * machine + the cache-busting seed; the view only wires `onLoad`/`onError`
 * straight to the `<Image>` callbacks (React-19-safe: setState is in the
 * callback, NOT inside an updater). The initial state is `loading` because
 * expo-image begins fetching as soon as it mounts with a source.
 */
export function useImageLoaderDemo(): ImageLoaderDemo {
  const [state, setState] = useState<LoadState>(LOAD_STATE.loading);
  const [loadCount, setLoadCount] = useState(0);
  const [seed, setSeed] = useState(1);

  const onLoad = useCallback(() => {
    setState(LOAD_STATE.loaded);
    setLoadCount((c) => c + 1);
  }, []);

  const onError = useCallback(() => {
    setState(LOAD_STATE.error);
  }, []);

  const reload = useCallback(() => {
    setState(LOAD_STATE.loading);
    setSeed((s) => s + 1);
  }, []);

  return {
    state,
    loadCount,
    source: imageSourceFor(seed),
    placeholder: PLACEHOLDER_BLURHASH,
    contentFit: 'cover',
    onLoad,
    onError,
    reload,
  };
}

/* ------------------------------------------------------------------ */
/* 3. useAssetBundleDemo — simulated expo-asset bundle download        */
/* ------------------------------------------------------------------ */

export interface AssetBundleDemo {
  /** Simulated download progress in [0, 1]. */
  progress: number;
  /** Whether the (simulated) download is in flight. */
  running: boolean;
  /** Start the simulated download. No-op if already running. */
  start: () => void;
  /** Cancel + zero the progress. */
  reset: () => void;
}

/**
 * Illustrates `expo-asset`'s `Asset.loadAsync(...)` WITHOUT calling it (the
 * screen does not depend on `expo-asset` at runtime; the API is taught via
 * the view's `<Code>` block). Instead, the hook advances a progress value on
 * a timer so the demo is observable offline. React-19-safe: the next-progress
 * value is computed in the interval callback (reading a ref mirror of the
 * current progress, NOT state inside an updater), and every setState happens
 * in the callback/effect — never nested. The timer is held in a ref and
 * cleared on unmount so the jest worker doesn't leak (smoke tests unmount).
 */
export function useAssetBundleDemo(): AssetBundleDemo {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timerRef.current !== null) return; // already running
    progressRef.current = 0;
    setProgress(0);
    setRunning(true);
    timerRef.current = setInterval(() => {
      const next = Math.min(1, progressRef.current + 0.1);
      progressRef.current = next;
      setProgress(next);
      if (next >= 1) {
        // Stop the timer here (in the callback, not inside an updater).
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRunning(false);
      }
    }, 250);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    progressRef.current = 0;
    setProgress(0);
    setRunning(false);
  }, [clearTimer]);

  // Clear the timer on unmount so no setState lands on an unmounted component
  // and the jest worker exits cleanly (mirrors the useTimerDemo cleanup).
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { progress, running, start, reset };
}
