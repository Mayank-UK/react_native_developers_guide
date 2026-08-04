import {
  success,
  failed,
} from './result';
import { NetworkFailure } from '../error-handling/failures';

describe('Result', () => {
  it('success carries a value', () => {
    const result = success(42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });

  it('success may carry a non-blocking warning', () => {
    const warning = new NetworkFailure();
    const result = success(1, warning);
    if (result.ok) expect(result.warning).toBe(warning);
  });

  it('failed carries a blocking failure', () => {
    const failure = new NetworkFailure();
    const result = failed(failure);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe(failure);
  });
});
