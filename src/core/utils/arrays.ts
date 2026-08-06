/**
 * Tiny typed array accessors. Exist to satisfy `noUncheckedIndexedAccess`
 * WITHOUT sprinkling non-null assertions (`arr[i]!`) through call sites: each
 * accessor turns an unsafe index lookup into a value that is either
 * well-typed-and-defined (with a clear runtime message if the assumption is
 * violated) or `T | undefined` for the caller to guard.
 *
 * Use `requireHead` / `requireAt` only for invariant inputs you control
 * (literal `as const` tables, lookups that have already been verified). For
 * arbitrary runtime input, prefer `at(0)` + a guard.
 */

/** Returns the first element or throws with a descriptive message. */
export function requireHead<T>(arr: readonly T[], msg = 'expected a non-empty array'): T {
  const head = arr[0];
  if (head === undefined) throw new Error(msg);
  return head;
}

/** Returns `arr[idx]` or throws with a descriptive message. */
export function requireAt<T>(
  arr: readonly T[],
  idx: number,
  msg?: string,
): T {
  const value = arr[idx];
  if (value === undefined) {
    throw new Error(msg ?? `expected index ${idx} to be defined (length ${arr.length})`);
  }
  return value;
}
