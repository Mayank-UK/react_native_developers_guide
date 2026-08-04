/**
 * Barrel for the service-locator container. Re-exports the public surface so
 * `import { container } from '.../core/container'` keeps resolving after the
 * file + spec were grouped under this directory (mirroring the sibling guides'
 * `/container` folder).
 */
export { container } from './container';
