import { container } from './container';
import { createAppConfig } from '../config';

/**
 * Wire the DI container SYNCHRONOUSLY at module-eval time, before any React
 * component can mount. This module is imported once by `app/_layout.tsx` (the
 * root layout) before the Drawer — and therefore before any child screen — can
 * render, so the previous `useEffect(() => container.initialize(...))` race is
 * gone: effects fire bottom-up, so a child that resolved a use case during
 * render ran before the Bootstrap effect and hit "Dependency … is not
 * registered". Importing this module makes registration complete as part of
 * the root layout's module evaluation instead.
 *
 * `expo-constants` (`Constants.expoConfig`) is available synchronously on the JS
 * thread at app startup (it ships in the bundle manifest — no bridge call), and
 * `EXPO_PUBLIC_*` vars are inlined at build time, so `createAppConfig()` is safe
 * to call here. The container is also re-initialized per test by jest.setup.ts,
 * and `initialize` is idempotent, so a hot reload / fast-refresh re-eval just
 * rebinds the same fields.
 *
 * Import for the side effect — keep this file free of exports so it stays a
 * single explicit wiring seam (debuggable, no hidden graph).
 */
container.initialize(createAppConfig());
