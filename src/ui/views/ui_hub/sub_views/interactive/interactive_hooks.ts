import { useCallback, useRef, useState } from 'react';

/**
 * Interactive view logic — owns each live demo's state/behaviour so the view
 * stays a dumb structure. One small hook per interactive card.
 *
 * RN-standard distinctions reflected here:
 *  - Press events fire their own callbacks (press-in/out, press, long-press).
 *  - Focus is TextInput-only; hover is web/mouse-only.
 * No `any`; strict + erasure-clean.
 */

export interface LogEntry {
  id: number;
  text: string;
}

const LOG_MAX = 6;

/**
 * Press-event log (PressStatesCard). Keeps a stable id counter on a ref so it
 * is NOT a state dep (mutating it does not re-render); the render-counter `seq`
 * is what bumps to force the log list to re-render. Newest entry first, capped
 * at LOG_MAX entries.
 */
export function usePressLog() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [seq, setSeq] = useState(1);
  const idRef = useRef(1);

  const push = useCallback((text: string) => {
    const entry: LogEntry = { id: idRef.current++, text };
    setSeq((n) => n + 1);
    setLog((cur) => [entry, ...cur].slice(0, LOG_MAX));
  }, []);

  return { log, seq, push };
}

/** Disabled-gate toggle (DisabledCard). */
export function useDisabledGate(initial = false) {
  const [enabled, setEnabled] = useState(initial);
  return { enabled, toggle: () => setEnabled((v) => !v) };
}

/** TextInput focus + value (FocusCard). */
export function useFocusField(initialValue = '') {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState(initialValue);
  return { focused, setFocused, value, setValue };
}

/** Hover state for the web-only hover demo (HoverCard). */
export function useHoverState() {
  const [hovered, setHovered] = useState(false);
  return { hovered, setHovered };
}
