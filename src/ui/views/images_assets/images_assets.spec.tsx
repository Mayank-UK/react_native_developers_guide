import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { ImagesAssetsView } from './images_assets_view';
import {
  ASSET_TYPE,
  CONTENT_FIT,
  LOAD_STATE,
  RESIZE_MODES,
  imageLoaderLabel,
  iconSizeLabel,
  resizeModeLabel,
  useAssetBundleDemo,
  useImageLoaderDemo,
} from './images_assets_hooks';

// The dumb view is wrapped in ScreenScaffold, which needs expo-router nav +
// SafeAreaProvider contexts. For this smoke test we only care that the view's
// own composition renders, so mock the scaffold to pass children through.
jest.mock('../../components/screen-scaffold', () => {
  const { View } = require('react-native');
  return {
    ScreenScaffold: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

// expo-image is a native module; mock it per-spec (only this view uses it).
// `Image` becomes a plain View that captures the onLoad/onError callbacks via
// the test-handles map so a hook test can fire them. The props are typed via
// the type-only `ImageProps` import (no `any`, erasure-clean).
import type { ImageProps } from 'expo-image';

type LoadHandlers = {
  onLoad?: () => void;
  onError?: () => void;
};
const mockImageHandles: LoadHandlers = {};

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    Image: (props: ImageProps) => {
      // Capture the callbacks so the hook test can drive the lifecycle.
      mockImageHandles.onLoad = props.onLoad as (() => void) | undefined;
      mockImageHandles.onError = props.onError as (() => void) | undefined;
      return <View />;
    },
  };
});

/**
 * Tests for the images-assets view's LOGIC (pure helpers + the two hooks) and
 * a smoke render of the dumb view. expo-image is mocked per-spec (above); the
 * mock's <Image> captures onLoad/onError into `mockImageHandles` so the hook
 * test can fire them after a render.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

/* ------------------------------------------------------------------ */
/* pure helpers                                                       */
/* ------------------------------------------------------------------ */

describe('imageLoaderLabel', () => {
  it('labels each of the four load states', () => {
    expect(imageLoaderLabel('idle')).toBe('Idle');
    expect(imageLoaderLabel('loading')).toBe('Loading…');
    expect(imageLoaderLabel('loaded')).toBe('Loaded');
    expect(imageLoaderLabel('error')).toMatch(/Error/);
  });
});

describe('resizeModeLabel', () => {
  it('describes each built-in resize mode', () => {
    (Object.keys(RESIZE_MODES) as Array<keyof typeof RESIZE_MODES>).forEach((mode) => {
      const label = resizeModeLabel(mode);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
    expect(resizeModeLabel('cover')).toMatch(/crop/i);
    expect(resizeModeLabel('repeat')).toMatch(/iOS/);
  });
});

describe('iconSizeLabel', () => {
  it('mentions the 1024 master + adaptive foreground', () => {
    const label = iconSizeLabel();
    expect(label).toMatch(/1024/);
    expect(label).toMatch(/adaptive/i);
    expect(label).toMatch(/foreground/i);
  });
});

describe('LOAD_STATE / RESIZE_MODES / ASSET_TYPE', () => {
  it('encodes the load lifecycle as a const-object', () => {
    expect(LOAD_STATE).toEqual({
      idle: 'idle',
      loading: 'loading',
      loaded: 'loaded',
      error: 'error',
    });
  });

  it('encodes the five built-in resize modes', () => {
    expect(RESIZE_MODES).toEqual({
      cover: 'cover',
      contain: 'contain',
      stretch: 'stretch',
      center: 'center',
      repeat: 'repeat',
    });
  });

  it('encodes the three asset-loading channels', () => {
    expect(ASSET_TYPE).toEqual({
      static: 'static',
      dynamic: 'dynamic',
      bundled: 'bundled',
    });
  });
});

describe('CONTENT_FIT', () => {
  it('lists the five expo-image contentFit values', () => {
    const fits = CONTENT_FIT.map((row) => row.fit);
    expect(fits).toEqual(['cover', 'contain', 'fill', 'scale-down', 'none']);
  });

  it('pairs each fit with a non-empty description', () => {
    CONTENT_FIT.forEach((row) => {
      expect(row.description.length).toBeGreaterThan(0);
      expect(row.label).toBe(row.fit);
    });
  });
});

/* ------------------------------------------------------------------ */
/* useImageLoaderDemo                                                 */
/* ------------------------------------------------------------------ */

describe('useImageLoaderDemo', () => {
  it('starts in the loading state with a picsum source + cover contentFit', () => {
    const { result, unmount } = renderHook(() => useImageLoaderDemo(), { wrapper });
    expect(result.current.state).toBe('loading');
    expect(result.current.loadCount).toBe(0);
    expect(result.current.source.uri).toMatch(/picsum\.photos/);
    expect(result.current.contentFit).toBe('cover');
    expect(typeof result.current.placeholder).toBe('string');
    expect(result.current.placeholder.length).toBeGreaterThan(0);
    unmount();
  });

  it('onLoad flips state to loaded + bumps the count', () => {
    const { result, unmount } = renderHook(() => useImageLoaderDemo(), { wrapper });
    act(() => result.current.onLoad());
    expect(result.current.state).toBe('loaded');
    expect(result.current.loadCount).toBe(1);
    act(() => result.current.onLoad());
    expect(result.current.loadCount).toBe(2);
    unmount();
  });

  it('onError flips state to error without bumping the count', () => {
    const { result, unmount } = renderHook(() => useImageLoaderDemo(), { wrapper });
    act(() => result.current.onError());
    expect(result.current.state).toBe('error');
    expect(result.current.loadCount).toBe(0);
    unmount();
  });

  it('reload swaps the URL (cache-bust) and returns to loading', () => {
    const { result, unmount } = renderHook(() => useImageLoaderDemo(), { wrapper });
    const before = result.current.source.uri;
    act(() => {
      result.current.onLoad();
      result.current.reload();
    });
    expect(result.current.state).toBe('loading');
    expect(result.current.source.uri).not.toBe(before);
    unmount();
  });
});

/* ------------------------------------------------------------------ */
/* useAssetBundleDemo                                                 */
/* ------------------------------------------------------------------ */

describe('useAssetBundleDemo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts idle at 0% and is not running', () => {
    const { result, unmount } = renderHook(() => useAssetBundleDemo(), { wrapper });
    expect(result.current.progress).toBe(0);
    expect(result.current.running).toBe(false);
    unmount();
  });

  it('start advances progress to 100% and clears running when done', () => {
    const { result, unmount } = renderHook(() => useAssetBundleDemo(), { wrapper });
    act(() => result.current.start());
    expect(result.current.running).toBe(true);
    // 10 steps of 0.1 at 250ms each — advance past the full curve.
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.progress).toBe(1);
    expect(result.current.running).toBe(false);
    unmount();
  });

  it('reset zeros the progress and stops a running timer', () => {
    const { result, unmount } = renderHook(() => useAssetBundleDemo(), { wrapper });
    act(() => result.current.start());
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.progress).toBeGreaterThan(0);
    act(() => result.current.reset());
    expect(result.current.progress).toBe(0);
    expect(result.current.running).toBe(false);
    // Advancing again should NOT bump progress — the timer was cleared.
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.progress).toBe(0);
    unmount();
  });

  it('start is a no-op while already running', () => {
    const { result, unmount } = renderHook(() => useAssetBundleDemo(), { wrapper });
    act(() => result.current.start());
    act(() => result.current.start()); // second call — ignored
    act(() => {
      jest.advanceTimersByTime(250);
    });
    // Only ONE timer is active, so after one 250ms tick progress is exactly 0.1.
    expect(result.current.progress).toBeCloseTo(0.1, 5);
    unmount();
  });
});

/* ------------------------------------------------------------------ */
/* ImagesAssetsView (smoke)                                           */
/* ------------------------------------------------------------------ */

describe('ImagesAssetsView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON, unmount } = render(<ImagesAssetsView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    // The asset-bundle demo mounts a live interval once `start` is pressed;
    // we never press it here, but the cleanup effect still needs to run.
    unmount();
  });

  it('exposes the mocked expo-image onLoad handler through the test handle', () => {
    // Mounting the view mounts useImageLoaderDemo, which passes onLoad to the
    // mocked <Image>. The mock captures it into mockImageHandles.
    const { unmount } = render(<ImagesAssetsView />, { wrapper });
    expect(typeof mockImageHandles.onLoad).toBe('function');
    expect(typeof mockImageHandles.onError).toBe('function');
    unmount();
  });
});
