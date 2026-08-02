/**
 * Minimal structured logger —mirrors the sibling guides' logger. Keeps a name
 * tag (the active environment) and respects `AppConfig.enableLogs`. In a real
 * app you'd swap this for Sentry / Bugsnag etc., but the abstraction boundary
 * stays the same.
 */

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warning: 30,
  error: 40,
};

// `console` is a global in RN; route by severity so log aggregators can filter.
const fn = (level: LogLevel): ((...args: unknown[]) => void) =>
  level === 'error'
    ? console.error
    : level === 'warning'
      ? console.warn
      : console.log;

export class Logger {
  private readonly name: string;
  private readonly minPriority: number;

  constructor(name: string, enableLogs = true) {
    this.name = name;
    this.minPriority = enableLogs ? LEVEL_PRIORITY.debug : LEVEL_PRIORITY.error;
  }

  private log(level: LogLevel, message: string, error?: unknown): void {
    if (LEVEL_PRIORITY[level] < this.minPriority) return;
    const tag = `[${this.name}] ${level.toUpperCase()}: ${message}`;
    if (error !== undefined) fn(level)(tag, error);
    else fn(level)(tag);
  }

  debug(message: string): void {
    this.log('debug', message);
  }
  info(message: string): void {
    this.log('info', message);
  }
  warning(message: string, error?: unknown): void {
    this.log('warning', message, error);
  }
  error(message: string, error?: unknown): void {
    this.log('error', message, error);
  }
}
