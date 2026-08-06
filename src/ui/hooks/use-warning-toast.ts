import { useEffect, useRef } from 'react';
import type { Failure } from '../../core/error-handling/failures';
import { useFailureToast } from './use-failure-toast';

/**
 * useWarningToast — surfaces each non-blocking `Failure` warning EXACTLY ONCE,
 * on a STABLE key, so that semantically-equal warnings don't re-toast on every
 * refetch. Returns the underlying `useFailureToast` store (`entries`/`show`/
 * `dismiss`) so the view can render the toast list exactly as before.
 *
 * Why this exists: the live `usePosts` fetch produces a fresh `Failure` object
 * on every run (the repository re-maps the upstream exception each time), so
 * comparing by reference (`warning !== last`) re-fires the toast on every
 * fetch even when nothing has changed. Comparing on `${kind}:${message}`
 * collapses those duplicate objects into one toast until the warning actually
 * changes.
 *
 * Single source of truth: both `api_handling_hooks.ts` and
 * `exception_handling_hooks.ts` call this hook instead of each keeping their
 * own `lastWarningRef` effect. The toast mechanism itself (`useFailureToast`)
 * is unchanged.
 *
 * @param warning the live warning to surface (pass undefined when there isn't
 *   one — e.g. `state.status === 'loaded' ? state.warning : undefined`).
 */
export function useWarningToast(warning: Failure | undefined) {
  const toast = useFailureToast();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!warning) return;
    const key = warningKey(warning);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    toast.show(warning);
  }, [warning, toast]);

  return toast;
}

/** Stable identity for a warning — kind + full chained message. */
function warningKey(failure: Failure): string {
  return `${failure.kind}:${failure.message}`;
}
