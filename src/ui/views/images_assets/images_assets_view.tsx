import { Image } from 'expo-image';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Section, Code, Pill } from '../../components';
import { Box, Button, Card, Text } from '../../design-system';
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
  type AssetType,
  type ResizeMode,
} from './images_assets_hooks';

/**
 * ImagesAssetsView — a dumb structure. All React state + the simulated
 * download live in the co-located hooks file; this file only renders. The
 * screen teaches the asset pipeline: the built-in `<Image>` vs `expo-image`,
 * resize modes / contentFit, the app icon, the splash screen, and dynamic
 * asset loading via `expo-asset`.
 */
export function ImagesAssetsView() {
  return (
    <ScreenScaffold
      title="Images, Icons, Splash & Assets"
      subtitle="expo-image, app icon, splash, dynamic asset loading."
    >
      <ImageChoiceCard />
      <LiveImageLoadCard />
      <ResizeModesCard />
      <AppIconCard />
      <SplashCard />
      <DynamicAssetCard />
      <ProductionNotesCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Built-in <Image> vs expo-image                                   */
/* ------------------------------------------------------------------ */

function ImageChoiceCard() {
  return (
    <Section
      title="Image loading: built-in <Image> vs expo-image"
      explanation="React Native ships a built-in <Image>, but the RN-standard recommendation in 2026 is expo-image — it is faster (native decoding + disk cache), supports blurhash/thumbhash placeholders, crossfades, GIFs, and works uniformly across iOS/Android/web. Use the built-in only as a last resort."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Pill label="expo-image" value="recommended" tone="success" />
          <Pill label="built-in <Image>" value="legacy" tone="muted" />
          <Pill label="expo-asset" value="runtime require" tone="primary" />
        </Box>
        <Code language="tsx" caption="the built-in <Image> — plain URI source, no cache control, no placeholder">{`import { Image } from 'react-native';

<Image
  source={\{ uri: 'https://example.com/photo.jpg' }}
  style={\{ width: '100%', height: 200 }}
  resizeMode="cover"        // 'cover' | 'contain' | 'stretch' | 'center' | 'repeat'
  // No disk-cache control, no blurhash, no crossfade. Re-mounts re-fetch.
/>`}</Code>
        <Code language="tsx" caption="expo-image — placeholder + contentFit + transition + cachePolicy">{`import { Image } from 'expo-image';

<Image
  source="https://example.com/photo.jpg"
  placeholder={blurhash}            // blurhash/thumbhash shown while loading
  contentFit="cover"                // cover | contain | fill | scale-down | none
  transition={200}                  // crossfade ms once the source arrives
  cachePolicy="memory-disk"         // memory-disk | memory | disk | none
  onLoad={(e) => console.log(e.source)}
  onError={(e) => console.warn(e.error)}
  style={\{ width: '100%', height: 200 }}
/>`}</Code>
        <Text variant="caption" tone="muted">
          The decision matrix: prefer <Text style={{ fontFamily: 'monospace' }}>expo-image</Text> for
          remote/decoded images (it caches, placeholders, and transitions); use a
          bundled <Text style={{ fontFamily: 'monospace' }}>require()</Text> with the built-in
          only if you cannot add the dep. The screen below uses{' '}
          <Text style={{ fontFamily: 'monospace' }}>expo-image</Text> for its LIVE demo
          (scoped to this screen — not adopted app-wide).
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. LIVE expo-image load                                             */
/* ------------------------------------------------------------------ */

function LiveImageLoadCard() {
  const demo = useImageLoaderDemo();
  return (
    <Section
      title="expo-image load — LIVE"
      explanation="A remote image fetched through expo-image's <Image> with onLoad/onError callbacks. The Pill mirrors the load lifecycle; reload swaps the URL (cache-bust). The blurhash placeholder fades into the final frame via the transition prop."
    >
      <Box gap="sm">
        <Box row gap="xs" center style={{ flexWrap: 'wrap' }}>
          <Pill
            label="state"
            value={imageLoaderLabel(demo.state)}
            tone={
              demo.state === 'loaded'
                ? 'success'
                : demo.state === 'error'
                  ? 'danger'
                  : 'primary'
            }
          />
          <Pill label="loads" value={String(demo.loadCount)} />
          <Pill label="contentFit" value={demo.contentFit} />
        </Box>
        <Image
          source={demo.source.uri}
          placeholder={demo.placeholder}
          contentFit={demo.contentFit}
          transition={250}
          cachePolicy="memory-disk"
          onLoad={demo.onLoad}
          onError={demo.onError}
          style={{ width: '100%', height: 200, borderRadius: 8, backgroundColor: '#0b1220' }}
        />
        <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
          {demo.source.uri}
        </Text>
        <Box row gap="sm">
          <Button title="Reload (cache-bust)" variant="outline" onPress={demo.reload} />
        </Box>
        <Text variant="caption" tone="muted">
          Network caveat: works inside Expo Go on a real device. The web export of this
          app may be offline, in which case the frame stays on the placeholder and the
          state flips to <Text style={{ fontFamily: 'monospace' }}>error</Text> — itself a
          useful demonstration of the <Text style={{ fontFamily: 'monospace' }}>onError</Text> path.
        </Text>
        <Code language="tsx" caption="images_assets_hooks.ts — the real hook driving this card">{`export function useImageLoaderDemo(): ImageLoaderDemo {
  const [state, setState] = useState<LoadState>(LOAD_STATE.loading);
  const [loadCount, setLoadCount] = useState(0);
  const [seed, setSeed] = useState(1);

  const onLoad = useCallback(() => {
    setState(LOAD_STATE.loaded);          // setState in the callback,
    setLoadCount((c) => c + 1);           // NOT nested in another updater
  }, []);
  const onError = useCallback(() => {
    setState(LOAD_STATE.error);
  }, []);
  const reload = useCallback(() => {
    setState(LOAD_STATE.loading);
    setSeed((s) => s + 1);                // new URL -> defeats the cache
  }, []);

  return { state, loadCount, source: { uri: imageSourceFor(seed) },
           placeholder: PLACEHOLDER_BLURHASH, contentFit: 'cover',
           onLoad, onError, reload };
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Resize modes (built-in) + contentFit (expo-image)               */
/* ------------------------------------------------------------------ */

function ResizeModesCard() {
  return (
    <Section
      title="Resize modes & contentFit"
      explanation="The built-in <Image> takes resizeMode (cover/contain/stretch/center/repeat). expo-image replaces it with contentFit — a slightly different vocabulary (fill instead of stretch, plus scale-down and none). Pick by how the asset should fill its frame."
    >
      <Box gap="sm">
        <Text variant="small" tone="muted">
          Built-in <Text style={{ fontFamily: 'monospace' }}>resizeMode</Text> (RN{' '}
          <Text style={{ fontFamily: 'monospace' }}>ImageResizeMode</Text>):
        </Text>
        <Box gap="xs">
          {(Object.keys(RESIZE_MODES) as readonly ResizeMode[]).map((mode) => (
            <Box key={mode} p="sm" radius="sm" bg="surfaceVariant" row gap="sm" center>
              <Pill value={mode} tone="primary" />
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                {resizeModeLabel(mode)}
              </Text>
            </Box>
          ))}
        </Box>
        <Text variant="small" tone="muted">
          <Text style={{ fontFamily: 'monospace' }}>expo-image</Text>{' '}
          <Text style={{ fontFamily: 'monospace' }}>contentFit</Text>:
        </Text>
        <Box gap="xs">
          {CONTENT_FIT.map((row) => (
            <Box key={row.label} p="sm" radius="sm" bg="surfaceVariant" row gap="sm" center>
              <Pill value={row.fit} tone="primary" />
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                {row.description}
              </Text>
            </Box>
          ))}
        </Box>
        <Code language="tsx" caption="the const-objects behind the two matrices">{`export const RESIZE_MODES = {
  cover: 'cover', contain: 'contain', stretch: 'stretch',
  center: 'center', repeat: 'repeat',
} as const;                            // built-in <Image> resizeMode

export const CONTENT_FIT = [
  { fit: 'cover',       description: 'Fill the frame, crop overflow.' },
  { fit: 'contain',     description: 'Whole image visible; letterboxed.' },
  { fit: 'fill',        description: 'Stretch to fill (distorts aspect ratio).' },
  { fit: 'scale-down',  description: 'Fit like contain, never upscale.' },
  { fit: 'none',        description: 'Render at natural size; overflow clipped.' },
];                                     // expo-image contentFit (typed ImageContentFit)`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. App icon                                                         */
/* ------------------------------------------------------------------ */

function AppIconCard() {
  return (
    <Section
      title="App icon & adaptive icons"
      explanation="Expo reads the icon from app.config.ts at build time. iOS wants a single 1024×1024 master; Android wants an adaptive icon — a foreground foreground image plus a background colour, composed by the launcher. expo-notifications + FCM also need their own white-on-transparent icons."
    >
      <Box gap="sm">
        <Card>
          <Text variant="caption" tone="muted">
            Canonical sizes
          </Text>
          <Text variant="small" tone="primary" mt="xxs" style={{ fontFamily: 'monospace' }}>
            {iconSizeLabel()}
          </Text>
        </Card>
        <Code language="ts" caption="app.config.ts — this app's REAL icon + adaptive-icon config">{`const config: ExpoConfig = {
  // ...
  icon: './assets/icon.png',                 // (added when you ship a real icon)
  ios: { supportsTablet: true, bundleIdentifier: bundleId },
  android: {
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: '#0b1220',            // this app's REAL adaptive bg
      foregroundImage: './assets/adaptive-icon.png',
    },
  },
  plugins: ['expo-router', 'expo-font'],
};`}</Code>
        <Text variant="caption" tone="muted">
          <Text style={{ fontWeight: '600' }}>Adaptive icons (Android).</Text> The launcher composes
          a <Text style={{ fontFamily: 'monospace' }}>foregroundImage</Text> over a{' '}
          <Text style={{ fontFamily: 'monospace' }}>backgroundColor</Text> (or{' '}
          <Text style={{ fontFamily: 'monospace' }}>backgroundImage</Text>). Keep the foreground
          art inside the 66dp safe zone (the outer 21dp per side is masked/animated by the OS).
        </Text>
        <Text variant="caption" tone="muted">
          <Text style={{ fontWeight: '600' }}>Notification icons.</Text>{' '}
          <Text style={{ fontFamily: 'monospace' }}>expo-notifications</Text> ships a default icon;
          to customise, pass a white-on-transparent PNG via the plugin's{' '}
          <Text style={{ fontFamily: 'monospace' }}>icon</Text> arg. FCM requires the same
          white-on-transparent treatment for the Android status-bar icon (colourised icons render as
          a white square).
        </Text>
        <Code language="ts" caption="app.config.ts plugin arg — the notification icon (illustrative)">{`plugins: [
  ['expo-notifications', {
    icon: './assets/notification-icon.png',  // white-on-transparent, ~24dp
    color: '#0b1220',                        // accent colour for the banner
  }],
]`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Splash screen                                                    */
/* ------------------------------------------------------------------ */

function SplashCard() {
  return (
    <Section
      title="Splash screen — expo-splash-screen"
      explanation="Expo shows the splash image + background colour (from app.config.ts) while the JS bundle loads. For an instant-feeling app you keep the native splash up just long enough to fetch fonts + critical config, then call SplashScreen.hideAsync(). This app already gates first paint on useAppFonts() — the natural splash-hide seam."
    >
      <Box gap="sm">
        <Code language="ts" caption="app.config.ts — this app's REAL splash config (background only)">{`const config: ExpoConfig = {
  // ...
  splash: {
    backgroundColor: '#0b1220',           // this app's REAL splash bg
    // image: './assets/splash.png',      // (added when you ship a splash)
    // resizeMode: 'contain' | 'cover',   // default 'cover'
  },
};`}</Code>
        <Code language="tsx" caption="app/_layout.tsx — the REAL pattern this app uses: hold first paint on fonts">{`function Bootstrap() {
  const { theme } = useTheme();
  const [fontsLoaded] = useAppFonts();    // expo-font + bundled .ttf
  useEffect(() => {
    container.initialize(createAppConfig());
  }, []);

  // The native splash stays up while fontsLoaded === false; once fonts are
  // registered, this gate flips and the first themed screen paints — no
  // system-font flash. (For manual control: SplashScreen.preventAutoHideAsync()
  // in _layout, then SplashScreen.hideAsync() after your own ready-check.)
  if (!fontsLoaded) {
    return <GestureHandlerRootView style={\{ flex: 1, backgroundColor: theme.colors.background }} />;
  }
  return (/* ... */);
}`}</Code>
        <Code language="ts" caption="manual hide — when you need to wait on something fonts can't">{`import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();        // opt into manual control

// ...after your ready-check resolves:
await SplashScreen.hideAsync();              // crossfades to your first screen`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Dynamic asset loading — expo-asset (simulated)                  */
/* ------------------------------------------------------------------ */

function DynamicAssetCard() {
  const demo = useAssetBundleDemo();
  const pct = Math.round(demo.progress * 100);
  return (
    <Section
      title="Dynamic asset loading — expo-asset"
      explanation="Static assets (require() / import) are bundled at build time — small, cacheable, instant. Dynamic assets (downloaded at runtime) go through expo-asset's Asset.loadAsync, which fetches, decodes, and caches on disk so the next mount is instant. Below is a SIMULATED bundle download (no network call) so the progress curve is observable offline."
    >
      <Box gap="sm">
        <Box row gap="xs" center style={{ flexWrap: 'wrap' }}>
          {(Object.keys(ASSET_TYPE) as readonly AssetType[]).map((t) => (
            <Pill key={t} value={t} tone={t === 'dynamic' ? 'primary' : 'muted'} />
          ))}
        </Box>
        <Code language="ts" caption="the three ways an asset enters your bundle">{`// 1. STATIC — resolved at build time by Metro, inlined as a numeric id.
const logo = require('./assets/logo.png');        // assetType: 'static'

// 2. DYNAMIC — fetched + cached at runtime via expo-asset.
import { Asset } from 'expo-asset';
const [{ localUri }] = await Asset.loadAsync(     // assetType: 'dynamic'
  'https://cdn.example.com/hero.webp',
);
<Image source={\{ uri: localUri }} />;              // reads from disk cache on re-mount

// 3. BUNDLED — a static asset imported as a module reference.
import hero from './assets/hero.png';             // assetType: 'bundled'`}</Code>
        <Card>
          <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
            <Box>
              <Text variant="caption" tone="muted">
                Simulated bundle download
              </Text>
              <Text variant="small" tone="primary" mt="xxs" style={{ fontFamily: 'monospace' }}>
                {demo.running ? 'downloading…' : pct >= 100 ? 'ready · disk-cached' : 'idle'}
              </Text>
            </Box>
            <Pill value={pct + '%'} tone={pct >= 100 ? 'success' : 'primary'} />
          </Box>
          <Box
            mt="sm"
            radius="sm"
            style={{
              height: 8,
              backgroundColor: '#1f2a3d',
              overflow: 'hidden',
            }}
          >
            <Box
              style={{
                height: 8,
                width: `${pct}%`,
                backgroundColor: '#3b82f6',
              }}
            />
          </Box>
        </Card>
        <Box row gap="sm">
          <Button
            title={demo.running ? 'Downloading…' : 'Simulate bundle load'}
            variant="outline"
            onPress={demo.start}
            disabled={demo.running || pct >= 100}
          />
          <Button title="Reset" variant="ghost" onPress={demo.reset} />
        </Box>
        <Text variant="caption" tone="muted">
          The bar above is driven by <Text style={{ fontFamily: 'monospace' }}>useAssetBundleDemo</Text>{' '}
          — a timer-advanced curve, NOT a real fetch. In production you would{' '}
          <Text style={{ fontFamily: 'monospace' }}>await Asset.loadAsync(uri)</Text> and the OS would
          report decode/cache progress; expo-image's own disk cache (the{' '}
          <Text style={{ fontFamily: 'monospace' }}>cachePolicy</Text> prop) often removes the need to
          touch <Text style={{ fontFamily: 'monospace' }}>expo-asset</Text> at all.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Production notes                                                 */
/* ------------------------------------------------------------------ */

const PRODUCTION_DO: readonly string[] = [
  'Serve WebP/AVIF — 30–60% smaller than PNG at equal quality',
  'Bundle icons/splash as PNG (the OS rescales); 1024×1024 master covers every density',
  'Prefer expo-image cachePolicy="memory-disk" for remote images',
  'Add accessibilityLabel to every meaningful <Image>',
  'Reuse one <Image> source across screens; the cache makes the second mount free',
];

const PRODUCTION_AVOID: readonly string[] = [
  'Base64 data-URIs for photos (defeats caching + bloats the bundle)',
  'Oversized assets — measure the frame, request the matching density',
  'Custom native splash modules under Expo Go (they need a dev/EAS build)',
  'Shipping photo assets in the JS bundle — use a CDN + expo-image cache',
  'Untyped adaptive-icon foreground art outside the 66dp safe zone',
];

function ProductionNotesCard() {
  return (
    <Section
      title="Production notes"
      explanation="The asset pipeline bites at scale — bundle size, cache hit-rate, native-lib alignment, and accessibility. A few rules that hold across iOS/Android/web."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Pill label="Native image libs" value="16 KB ELF alignment" tone="primary" />
          <Pill label="Custom splash native modules" value="dev build required" tone="danger" />
        </Box>
        <Text variant="caption" tone="muted">
          The deferred 16 KB Android ELF alignment fix (actioned in the build-deployment screen)
          affects native image-decoding libraries — move to a custom dev/EAS build with AGP 8.5.1+ /
          NDK r27+ before targetSdk ≥ 35 makes it a hard install block.
        </Text>
        <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box flex={1} gap="xs">
            <Text variant="small" tone="primary" style={{ fontWeight: '600' }}>
              DO
            </Text>
            {PRODUCTION_DO.map((line) => (
              <Box key={line} row gap="xs">
                <Pill value="DO" tone="success" />
                <Text variant="caption" style={{ flex: 1 }}>
                  {line}
                </Text>
              </Box>
            ))}
          </Box>
          <Box flex={1} gap="xs">
            <Text variant="small" tone="danger" style={{ fontWeight: '600' }}>
              AVOID
            </Text>
            {PRODUCTION_AVOID.map((line) => (
              <Box key={line} row gap="xs">
                <Pill value="NO" tone="danger" />
                <Text variant="caption" style={{ flex: 1 }}>
                  {line}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
        <Code language="tsx" caption="accessibility on images — required for screen-reader users">{`<Image
  source={\{ uri }}
  accessibilityLabel="Profile photo of Ada Lovelace"
  accessibilityRole="image"
  // accessibilityHint is optional — only when the image is interactive.
/>`}</Code>
      </Box>
    </Section>
  );
}
