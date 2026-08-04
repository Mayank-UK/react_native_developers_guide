/**
 * platform_message.ts — the shared TYPES + the web/default implementation.
 *
 * Resolution rules for `import { ... } from './platform_message'`:
 *
 *  - TypeScript (tsc, `moduleResolution: bundler`): resolves the plain `.ts`,
 *    so this file is the single source of the exported types. The sibling
 *    `platform_message.ios.ts` / `platform_message.android.ts` are still
 *    type-checked (they are in the tsconfig `include` glob) and must keep the
 *    SAME exported shape as this file.
 *  - Metro (Expo bundler, real device build): prefers the platform file —
 *    `.ios.ts` on an iOS bundle, `.android.ts` on an Android bundle — and falls
 *    back to THIS file only on web (or any platform without a matching sibling).
 *  - Jest (jest-expo): platform extensions are NOT guaranteed to resolve, so
 *    this `.ts` is what the test suite imports; it carries the web/default
 *    values used in specs.
 *
 * Keeping a real implementation here (not just `export type`) means jest gets
 * real runtime values AND the web build has a real fallback. The platform
 * siblings override it on device.
 */

/** Short identifier for the platform the bundle was built for. */
export const platformMessage = 'running on web (react-native-web)';

/** A friendly hello used by the LIVE extension-resolution demo. */
export const nativeGreeting = 'Hello from the web/default — this string came from platform_message.ts';
