import { useCallback, useEffect, useRef, useState } from 'react';
import type { Failure } from '../../core/error-handling/failures';

/**
 * useFailureToast — non-blocking transient notifications for *info/warning*
 * failures. Mirrors the web guide's `useFailureSnackbar` + Flutter's
 * `ScaffoldMessenger`.
 *
 * Pattern: the store exposes a `warning` Failure; the view calls `show(warning)`
 * exactly once per warning via an effect. The toast auto-dismisses after a few
 * seconds. Critical failures use <ShowError/> instead — never this hook.
 */
export interface ToastEntry {
  id: number;
  failure: Failure;
}

const AUTO_DISMISS_MS = 4000;

export function useFailureToast() {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Clear any pending auto-dismiss timers on unmount.
  useEffect(() => {
    const set = timers.current;
    return () => set.forEach((id) => clearTimeout(id));
  }, []);

  const dismiss = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const show = useCallback(
    (failure: Failure) => {
      const id = nextId.current++;
      setEntries((prev) => [...prev, { id, failure }]);
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        dismiss(id);
      }, AUTO_DISMISS_MS);
      timers.current.add(timer);
    },
    [dismiss],
  );

  return { entries, show, dismiss };
}
