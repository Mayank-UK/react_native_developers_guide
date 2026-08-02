import type { Logger } from '../../../core/config/logger';

/**
 * RetryPolicy — wraps a fetch dispatch attempt with bounded retries on
 * transient failures. Mirrors the sibling guides' retry interceptor, adapted to
 * fetch (where retry naturally lives in the dispatcher, not a response
 * interceptor).
 *
 * Backoff is exponential with a small jitter floor. `retryOn` decides which
 * errors merit another attempt (typically only network failures — never auth,
 * and by convention here never server errors so dev failure-injection remains
 * deterministic).
 */
export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  retryOn: (error: unknown) => boolean;
}

export class RetryPolicy {
  private readonly options: RetryOptions;

  constructor(options: RetryOptions) {
    this.options = options;
  }

  async run<T>(
    dispatch: () => Promise<T>,
    label: string,
    logger: Logger,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.attempts; attempt++) {
      try {
        const value = await dispatch();
        if (attempt > 0) {
          logger.debug(`← ${label} recovered after ${attempt} retr${attempt === 1 ? 'y' : 'ies'}`);
        }
        return value;
      } catch (error) {
        lastError = error;
        const canRetry =
          attempt < this.options.attempts && this.options.retryOn(error);
        if (!canRetry) break;
        const delay = this.options.baseDelayMs * Math.pow(2, attempt);
        logger.warning(`${label} failed (attempt ${attempt + 1}), retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
    throw lastError;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
