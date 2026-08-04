/**
 * platform_message.android.ts — Metro resolves THIS file on an Android build
 * when a caller imports `./platform_message` (no extension). See the header of
 * `platform_message.ios.ts` for the full explanation of the extension pair.
 */

/** Short identifier for the platform the bundle was built for. */
export const platformMessage = 'running on native Android (view system render)';

/** A friendly hello used by the LIVE extension-resolution demo. */
export const nativeGreeting = 'Hello from Android — this string came from platform_message.android.ts';
