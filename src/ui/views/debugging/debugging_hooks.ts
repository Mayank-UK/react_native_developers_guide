import { useCallback, useEffect, useRef, useState } from 'react';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import { usePosts } from '../../hooks/use-posts';

/**
 * Debugging view logic — owns the three LIVE interactive demos' state +
 * behaviour so the view stays a dumb structure. Grounded in THIS app's real
 * debug aids: the structured Logger (`core/config/logger.ts`), the dev scenario
 * knobs (`core/scenario/*`), and the error pipeline's `Failure.chain`.
 *
 * Hooks:
 *  - useDevLog: a tiny in-screen logger sink mirroring `core/config/logger.ts`
 *    (same levels, priority ordering, `[name] LEVEL: message` format). Captures
 *    into a ring buffer AND mirrors each line to the real console so React
 *    Native DevTools sees it.
 *  - useLoggerPanel: useDevLog + the minimum-level filter state.
 *  - useScenarioKnob: drives the real container knobs + usePosts and logs each
 *    reducer transition (loading/loaded/error) as a real logger would.
 *  - useElementInspector: which inspectable tile is selected.
 *
 * Pure helpers: LEVEL_PRIORITY, LEVEL_TONE (severity→pill tone, like the
 * exception-handling screen's severityTone), LEVEL_FILTERS.
 */

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

export interface LogEntry {
  id: number;
  at: string;
  level: LogLevel;
  tag: string;
  message: string;
}

export const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warning: 30,
  error: 40,
};

export const LEVEL_FILTERS = ['all', 'debug', 'info', 'warning', 'error'] as const;
export type LevelFilter = (typeof LEVEL_FILTERS)[number];

// Shared `Pill` has no 'warning' tone — map warning → danger (closest semantic fit).
export const LEVEL_TONE: Record<LogLevel, 'muted' | 'primary' | 'danger'> = {
  debug: 'muted',
  info: 'primary',
  warning: 'danger',
  error: 'danger',
};

/**
 * A tiny in-screen logger sink that mirrors `core/config/logger.ts`: same level
 * names, same priority ordering, same `[name] LEVEL: message` format. The real
 * Logger routes by severity to console.log/warn/error; this panel captures the
 * equivalent into a ring buffer so you can SEE it in-app.
 */
export function useDevLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextId = useRef(0);
  const stamp = () => new Date().toLocaleTimeString();

  const log = useCallback((level: LogLevel, tag: string, message: string) => {
    setEntries((prev) =>
      [...prev, { id: nextId.current++, at: stamp(), level, tag, message }].slice(-40),
    );
    // Also mirror into the REAL console so the React Native DevTools console sees it.
    const line = `[${tag}] ${level.toUpperCase()}: ${message}`;
    if (level === 'error') console.log(line);
    else if (level === 'warning') console.log(line);
    else console.log(line);
  }, []);

  const clear = useCallback(() => setEntries([]), []);
  return { entries, log, clear };
}

export interface LoggerPanel {
  entries: readonly LogEntry[];
  log: (level: LogLevel, tag: string, message: string) => void;
  clear: () => void;
  filter: LevelFilter;
  setFilter: (f: LevelFilter) => void;
  visible: readonly LogEntry[];
}

/** useDevLog + the minimum-severity filter + the filtered view. */
export function useLoggerPanel(): LoggerPanel {
  const { entries, log, clear } = useDevLog();
  const [filter, setFilter] = useState<LevelFilter>('all');
  const visible =
    filter === 'all'
      ? entries
      : entries.filter((e) => LEVEL_PRIORITY[e.level] >= LEVEL_PRIORITY[filter]);
  return { entries, log, clear, filter, setFilter, visible };
}

export interface ScenarioKnob {
  state: ReturnType<typeof usePosts>['state'];
  entries: readonly LogEntry[];
  clear: () => void;
  run: (api: ApiScenario, db: DbScenario, label: string) => void;
}

/** Drives the real container knobs + usePosts and logs each state transition. */
export function useScenarioKnob(): ScenarioKnob {
  const { state, fetch } = usePosts();
  const { entries, log, clear } = useDevLog();
  const lastStatus = useRef<string>('');

  // Observe the real usePosts state machine and log transitions, like a real
  // logger instrumenting a reducer would.
  useEffect(() => {
    const key = `${state.status}`;
    if (key === lastStatus.current) return;
    lastStatus.current = key;
    if (state.status === 'loading') {
      log('debug', 'usePosts', 'dispatch(fetch) → GetPostsUseCase.execute()');
    } else if (state.status === 'loaded') {
      if (state.warning) {
        log('warning', 'repository', `Success(posts, warning=${state.warning.kind}) — non-blocking`);
      } else {
        log('info', 'repository', `Success(${state.posts.length} posts)`);
      }
    } else if (state.status === 'error') {
      log('error', 'repository', `Failed: ${state.failure.kind} (${state.failure.severity})`);
    }
  }, [state, log]);

  const run = useCallback(
    (api: ApiScenario, db: DbScenario, label: string) => {
      log('info', 'dev', `setApiScenario(${api}), setDbScenario(${db}) — ${label}`);
      container.setApiScenario(api);
      container.setDbScenario(db);
      fetch();
    },
    [log, fetch],
  );

  return { state, entries, clear, run };
}

/** Which inspectable tile is selected in the element-inspector demo. */
export function useElementInspector(initial = 0) {
  const [selected, setSelected] = useState<number>(initial);
  return { selected, setSelected };
}
