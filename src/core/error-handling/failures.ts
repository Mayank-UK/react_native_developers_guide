/**
 * Failure — clean, predictable domain-level error states the UI understands.
 * Mirrors the sibling guides' sealed `Failure`.
 *
 * A Failure has:
 *  - a user-friendly `message`,
 *  - a `severity` (drives blocking vs non-blocking UI presentation),
 *  - an optional chained `cause` (another Failure) preserving the full story
 *    of a compound failure, e.g. cache-failed → because → network-failed.
 *
 * They live in the domain/presentation layers and are what the UI switches on.
 *
 * `FailureSeverity` is a const object + literal union (not an `enum`).
 */

export const FailureSeverity = {
  /** Gentle, dismissible (toast). Data is still usable. */
  Info: 'info',
  /** Non-blocking notice (toast). e.g. showing stale cache. */
  Warning: 'warning',
  /** Blocking — the screen has no data and must show a full-screen error. */
  Critical: 'critical',
} as const;

export type FailureSeverity = (typeof FailureSeverity)[keyof typeof FailureSeverity];

export type FailureKind =
  | 'network'
  | 'server'
  | 'cache'
  | 'auth'
  | 'database'
  | 'unknown';

export abstract class Failure {
  abstract readonly kind: FailureKind;
  abstract readonly severity: FailureSeverity;
  readonly cause?: Failure;
  private readonly rawMessage: string;

  constructor(rawMessage: string, cause?: Failure) {
    this.rawMessage = rawMessage;
    this.cause = cause;
  }

  /** Joined message of the whole chain (cause → this). */
  get message(): string {
    return this.cause
      ? `${this.cause.message} + ${this.rawMessage}`
      : this.rawMessage;
  }

  /** Multi-line trace of the chain, for logs / debugging. */
  get chain(): string {
    const parts = [this.rawMessage];
    let current = this.cause;
    while (current) {
      parts.push(`  → caused by: ${current.rawMessage}`);
      current = current.cause;
    }
    return parts.join('\n');
  }

  /**
   * Return a view of this failure at a different severity. The cause chain is
   * preserved BY REFERENCE — it is never copied or recomputed; `message`,
   * `chain`, `kind`, and `cause` all delegate to the original. Used when an
   * upstream failure is *presented* at a different severity than its kind
   * implies — e.g. a Critical `NetworkFailure` served from stale cache is
   * downgraded to a non-blocking `Warning` so the severity the UI branches on
   * matches how the failure is actually shown (toast, not full-screen error).
   */
  withSeverity(severity: FailureSeverity): Failure {
    return new SeverityOverrideFailure(this, severity);
  }
}

/**
 * Decorator that presents an underlying failure at a different severity. Only
 * `severity` is overridden; `kind`, `message`, `chain`, and `cause` delegate to
 * the wrapped failure, so the cause chain stays intact by reference (no
 * duplication, no re-mapping). Created via {@link Failure.withSeverity}.
 */
class SeverityOverrideFailure extends Failure {
  readonly kind: FailureKind;
  readonly severity: FailureSeverity;
  private readonly original: Failure;

  constructor(original: Failure, severity: FailureSeverity) {
    super('', original.cause);
    this.original = original;
    this.kind = original.kind;
    this.severity = severity;
  }

  override get message(): string {
    return this.original.message;
  }

  override get chain(): string {
    return this.original.chain;
  }
}

export class NetworkFailure extends Failure {
  readonly kind = 'network' as const;
  readonly severity = FailureSeverity.Critical;
  constructor(message = 'No internet connection', cause?: Failure) {
    super(message, cause);
  }
}

export class ServerFailure extends Failure {
  readonly kind = 'server' as const;
  readonly severity = FailureSeverity.Critical;
  constructor(message = 'Server error', cause?: Failure) {
    super(message, cause);
  }
}

/**
 * Local cache / database could not satisfy the request. Defaults to Warning
 * (non-blocking — e.g. we served stale data despite a cache hiccup), but is
 * raised to Critical when the cache was the last resort and it failed too
 * (nothing left to show the user). See `chainedCacheFailure`.
 */
export class CacheFailure extends Failure {
  readonly kind = 'cache' as const;
  readonly severity: FailureSeverity;
  constructor(
    message = 'No cached data available',
    cause?: Failure,
    severity: FailureSeverity = FailureSeverity.Warning,
  ) {
    super(message, cause);
    this.severity = severity;
  }
}

export class AuthFailure extends Failure {
  readonly kind = 'auth' as const;
  readonly severity = FailureSeverity.Warning;
  constructor(message = 'Authentication failed', cause?: Failure) {
    super(message, cause);
  }
}

export class DatabaseFailure extends Failure {
  readonly kind = 'database' as const;
  readonly severity = FailureSeverity.Critical;
  constructor(message = 'Database error', cause?: Failure) {
    super(message, cause);
  }
}

export class UnknownFailure extends Failure {
  readonly kind = 'unknown' as const;
  readonly severity = FailureSeverity.Critical;
  constructor(message = 'Something went wrong', cause?: Failure) {
    super(message, cause);
  }
}
