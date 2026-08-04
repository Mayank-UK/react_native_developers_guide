import { useCallback, useRef, useState } from 'react';
import {
  useFocusEffect,
  useGlobalSearchParams,
  useRouter,
} from 'expo-router';

/**
 * Navigation-routing view logic — owns the live demos' state + behaviour so
 * the view stays a dumb structure. Grounded in Expo Router (file-based routing
 * on React Navigation) — the standard RN navigation since 2023.
 *
 * Hooks:
 *  - useNavLog: a timestamped ring-buffer of navigation actions so the user can
 *    SEE the imperative API fire live. id is read OUTSIDE the setState updater
 *    so the updater stays pure (StrictMode double-invokes updaters in dev).
 *  - useImperativeNav: useRouter + useNavLog + the go(action,target) helper
 *    that drives + logs push/replace/back against REAL routes.
 *  - useDynamicParams: a controlled TextInput value + the typed-pathname
 *    navigation push into /navigation-routing/[id], plus the live global params.
 *  - useFocusLog: useFocusEffect instrumented to log each focus/blur signal.
 *
 * Pure helper (stamp) formats the log timestamps.
 */

export type LogTone = 'default' | 'muted' | 'primary' | 'danger';
export type LogEntry = { id: number; text: string; tone: LogTone };

export function useNavLog(max = 8) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const idRef = useRef(0);
  const log = useCallback(
    (text: string, tone: LogTone = 'default') => {
      const id = idRef.current;
      idRef.current += 1;
      setEntries((prev) => [{ id, text, tone }, ...prev].slice(0, max));
    },
    [max],
  );
  const clear = useCallback(() => setEntries([]), []);
  return [entries, log, clear] as const;
}

/** Compact HH:MM:SS.mmm stamp for the log. */
export function stamp(d = new Date()): string {
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
    d.getMilliseconds(),
    3,
  )}`;
}

export interface ImperativeNav {
  entries: readonly LogEntry[];
  clear: () => void;
  go: (action: 'push' | 'replace' | 'back', target: string) => void;
}

/** useRouter + useNavLog wired to drive + log push/replace/back. */
export function useImperativeNav(): ImperativeNav {
  const router = useRouter();
  const [entries, log, clear] = useNavLog();

  const go = useCallback(
    (action: 'push' | 'replace' | 'back', target: string) => {
      const t = stamp();
      if (action === 'back') {
        log(`${t}  back()`);
        router.back();
        return;
      }
      if (action === 'push') {
        log(`${t}  push(${target})`, 'primary');
        router.push(target as never);
      } else {
        log(`${t}  replace(${target})`, 'danger');
        router.replace(target as never);
      }
    },
    [log, router],
  );

  return { entries, clear, go };
}

export interface DynamicParams {
  value: string;
  setValue: (v: string) => void;
  global: ReturnType<typeof useGlobalSearchParams>;
  navigateToDetail: () => void;
}

/** Controlled value + typed-pathname push into /navigation-routing/[id]. */
export function useDynamicParams(initial = 'post-42'): DynamicParams {
  const router = useRouter();
  const global = useGlobalSearchParams();
  const [value, setValue] = useState(initial);

  const navigateToDetail = useCallback(() => {
    // Typed pathname form — Expo Router checks the [id] segment against params.
    router.push({
      pathname: '/navigation-routing/[id]',
      params: { id: value || 'empty' },
    });
  }, [router, value]);

  return { value, setValue, global, navigateToDetail };
}

export interface FocusLog {
  entries: readonly LogEntry[];
  clear: () => void;
}

/** useFocusEffect instrumented to log each focus/blur signal. */
export function useFocusLog(max = 5): FocusLog {
  const [entries, log, clear] = useNavLog(max);
  const mountsRef = useRef(0);

  // Runs on every focus (and cleans up on blur). Covered deeply on the
  // Lifecycle screen — here we just demonstrate the focus signal live.
  useFocusEffect(
    useCallback(() => {
      mountsRef.current += 1;
      log(`focus #${mountsRef.current} @ ${stamp()}`, 'primary');
      return () => {
        // runs on blur / unmount
        log(`blur @ ${stamp()}`, 'muted');
      };
    }, [log]),
  );

  return { entries, clear };
}
