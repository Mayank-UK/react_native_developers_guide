/**
 * platform_message.ios.ts — Metro resolves THIS file on an iOS build when a
 * caller imports `./platform_message` (no extension). The pair
 * (`platform_message.ios.ts` + `platform_message.android.ts`) is the real
 * teaching artifact cited by the Platform-Specific Code screen: it demonstrates
 * Metro's platform-extension resolution concretely. A `platform_message.ts`
 * sibling carries the shared type and the web/default fallback so tsc + jest
 * resolve cleanly (jest does not always honour platform extensions; tsc always
 * resolves the plain `.ts`).
 */

/** Short identifier for the platform the bundle was built for. */
export const platformMessage = 'running on native iOS (UIKit render)';

/** A friendly hello used by the LIVE extension-resolution demo. */
export const nativeGreeting = 'Hello from iOS — this string came from platform_message.ios.ts';
