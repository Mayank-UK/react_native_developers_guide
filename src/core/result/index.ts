/**
 * Barrel for Result<T>. Re-exports the public surface so existing import paths
 * like `import { success, failed } from '.../core/result'` and
 * `import type { Result } from '.../core/result'` keep resolving after the file
 * + spec were grouped under this directory.
 */
export { success, failed } from './result';
export type { Result, Success, Failed } from './result';
