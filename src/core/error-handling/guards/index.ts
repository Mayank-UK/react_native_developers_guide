/**
 * Barrel for the error-pipeline guards. Re-exports the public surface so
 * existing import paths like `import { safeRepositoryCall } from
 * '.../core/error-handling/guards'` keep resolving after the file + spec were
 * grouped under this directory (mirroring the sibling guides' `/guards` folder).
 */
export {
  guardedApiCall,
  toAppException,
  statusToException,
  mapExceptionToFailure,
  safeRepositoryCall,
  forwardNetworkFailure,
  chainedCacheFailure,
} from './guards';
