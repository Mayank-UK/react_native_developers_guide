import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';

/**
 * Notifications view logic — owns every interactive demo's state + side-effects
 * so the view stays a dumb structure. Two concerns:
 *
 *  - local + push notification scheduling/listening via `expo-notifications`
 *  - the permissions model that gates both
 *
 * The hooks here deliberately embody the same React-19-safe patterns documented
 * in the Bug History of agentic_development.md and mirrored in `app_state_hooks.ts`:
 *
 *  (a) `useNotificationLog` reads the id OUTSIDE the `setLog` updater — the
 *      updater stays pure (StrictMode double-invokes updaters in dev). The
 *      side-effecting `setLog` call is in the listener callback, NOT inside
 *      the updater.
 *  (b) listener subscriptions are torn down in their effect's cleanup return,
 *      so `unmount()` of the host view clears them (jest worker-leak guard).
 *
 * No `any`; strict + erasure-clean. Const-object + literal unions, NO enums
 * (erasableSyntaxOnly).
 */

/* -------------------------------------------------------------------------- */
/* 0. Const-objects + literal unions (NO enums)                               */
/* -------------------------------------------------------------------------- */

/**
 * The set of schedulable trigger types `expo-notifications` accepts. A
 * const-object + literal union mirror of the runtime
 * `Notifications.SchedulableTriggerInputTypes` enum (kept as data so it
 * survives `erasableSyntaxOnly`). Cited by the view's <Code> block.
 */
export const NOTIFICATION_TRIGGERS = {
  timeInterval: 'timeInterval',
  date: 'date',
  calendar: 'calendar',
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
  channel: 'channel',
} as const;

export type NotificationTriggerKind =
  keyof typeof NOTIFICATION_TRIGGERS;

/**
 * The lifecycle states a notification permission can be in. The Expo API
 * returns `granted` / `denied` / `undetermined`; `blocked` is the UX state
 * (`canAskAgain === false`) where the user must be sent to OS Settings —
 * the in-app prompt can no longer be shown. Pure data, no enum.
 */
export const PERMISSION_STATUS = {
  granted: 'granted',
  denied: 'denied',
  undetermined: 'undetermined',
  blocked: 'blocked',
} as const;

export type NotificationPermissionStatus =
  (typeof PERMISSION_STATUS)[keyof typeof PERMISSION_STATUS];

/* -------------------------------------------------------------------------- */
/* 1. Pure helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Map a notification permission status to a short UI label. Pure: same input →
 * same output; exported for unit testing.
 */
export function permissionLabel(
  status: NotificationPermissionStatus,
): string {
  switch (status) {
    case 'granted':
      return 'Granted';
    case 'denied':
      return 'Denied — request again to retry';
    case 'undetermined':
      return 'Not yet asked';
    case 'blocked':
      return 'Blocked — enable in OS Settings';
  }
}

/**
 * Map a `Notification` to a short kind word for the log. Foreground-received
 * events arrive via `addNotificationReceivedListener`; tap responses arrive
 * via `addNotificationResponseReceivedListener`. Pure.
 */
export function notificationKind(action: 'received' | 'tap'): string {
  return action === 'received' ? 'received' : 'tap';
}

/**
 * Reduce a raw `NotificationPermissionsStatus` to the four-state union the UI
 * uses. Pure internal helper. Treats `granted === true` as granted, hard
 * denials (`canAskAgain === false`) as blocked, and the absence of a status as
 * undetermined.
 */
export function reducePermissionStatus(
  response: Notifications.NotificationPermissionsStatus | null,
): NotificationPermissionStatus {
  if (!response) return 'undetermined';
  if (response.granted) return 'granted';
  if (!response.canAskAgain) return 'blocked';
  return 'denied';
}

/* -------------------------------------------------------------------------- */
/* 2. usePermissionStatus — LIVE readout of the current permission            */
/* -------------------------------------------------------------------------- */

export interface PermissionReadout {
  /** Current lifecycle state (derived via `reducePermissionStatus`). */
  status: NotificationPermissionStatus;
  /** True while a request is in flight (drives the button affordance). */
  requesting: boolean;
  /** Trigger the system prompt (or re-read if already asked). */
  request: () => Promise<void>;
}

/**
 * Reads + (on demand) requests notification permission. Mirrors the
 * `useXxxPermissions` hook shape used on the device-features screen but uses
 * the global `Notifications.getPermissionsAsync` /
 * `requestPermissionsAsync` (notification permission is app-wide, not
 * per-feature). Re-reads on mount so the LIVE readout reflects reality.
 */
export function usePermissionStatus(): PermissionReadout {
  const [raw, setRaw] =
    useState<Notifications.NotificationPermissionsStatus | null>(null);
  const [requesting, setRequesting] = useState(false);

  const read = useCallback(async () => {
    const value = await Notifications.getPermissionsAsync();
    setRaw(value);
  }, []);

  useEffect(() => {
    void read();
  }, [read]);

  const request = useCallback(async () => {
    setRequesting(true);
    try {
      const value = await Notifications.requestPermissionsAsync();
      setRaw(value);
    } finally {
      setRequesting(false);
    }
  }, []);

  return {
    status: reducePermissionStatus(raw),
    requesting,
    request,
  };
}

/* -------------------------------------------------------------------------- */
/* 3. useLocalNotificationDemo — schedule + log a local notification          */
/* -------------------------------------------------------------------------- */

export interface LocalNotificationDemo {
  /** Schedule a local notification ~5s out ( TimeIntervalTrigger ). */
  schedule: () => Promise<void>;
  /** Identifier of the most recently scheduled notification, or null. */
  lastId: string | null;
  /** Whether the last schedule call succeeded. */
  ok: boolean | null;
  /** Optional error message if scheduling threw. */
  error: string | null;
}

/**
 * Schedules a local notification via
 * `Notifications.scheduleNotificationAsync` using a `TimeIntervalTrigger`
 * (~5s). The notification's CONTENT is fixed here; the screen's contract is
 * "press button → in ~5s a notification arrives (foregrounded: it is logged
 * by `useNotificationLog`; backgrounded: it is posted by the OS)".
 *
 * NOTE: for the notification to be PRESENTED while the app is foregrounded
 * the host app must also install a `setNotificationHandler` (see the
 * `useForegroundPresenter` excerpt in the view). This hook only schedules.
 */
export function useLocalNotificationDemo(
  seconds = 5,
): LocalNotificationDemo {
  const [lastId, setLastId] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schedule = useCallback(async () => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hello from RN',
          body: 'This is a locally-scheduled notification.',
          data: { source: 'notifications-screen' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
      setLastId(id);
      setOk(true);
      setError(null);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'schedule failed';
      setOk(false);
      setError(message);
    }
  }, [seconds]);

  return { schedule, lastId, ok, error };
}

/* -------------------------------------------------------------------------- */
/* 4. useNotificationLog — LIVE received + tap event log                      */
/* -------------------------------------------------------------------------- */

export interface NotificationLogEntry {
  /** Monotonic id (idRef-assigned OUTSIDE the setState updater). */
  id: number;
  /** ISO timestamp — when the event fired. */
  at: string;
  /** 'received' (foregrounded) or 'tap' (user interacted). */
  kind: 'received' | 'tap';
  /** Title of the incoming notification, or '(no title)'. */
  title: string;
}

export interface NotificationLog {
  /** Capped, most-recent-first list of events. */
  log: readonly NotificationLogEntry[];
  /**
   * Fire a synthetic 'received' event from a title — used by the screen's
   * 'Simulate foreground receive' button so the demo is observable without
   * waiting on a real schedule. (Real events arrive via the listeners below.)
   */
  simulateReceived: (title: string) => void;
}

/**
 * Subscribe to `addNotificationReceivedListener` (foregrounded delivery) and
 * `addNotificationResponseReceivedListener` (user tapped a notification) and
 * keep a capped event log.
 *
 * React-19-safe: setState happens in the listener callback (an async, external
 * context), NOT inside a setState updater. The id is read from a ref OUTSIDE
 * the updater so the updater itself stays pure — mirrors `useAppStateLog`.
 *
 * The smoke test that mounts this MUST `unmount()` before finishing so the
 * subscriptions don't keep the jest worker alive.
 */
export function useNotificationLog(max = 8): NotificationLog {
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const idRef = useRef(0);

  const append = useCallback(
    (kind: 'received' | 'tap', title: string) => {
      const id = idRef.current;
      idRef.current += 1;
      const entry: NotificationLogEntry = {
        id,
        at: new Date().toISOString(),
        kind,
        title,
      };
      setLog((prev) => [entry, ...prev].slice(0, max));
    },
    [max],
  );

  const simulateReceived = useCallback(
    (title: string) => {
      append('received', title);
    },
    [append],
  );

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(
      (event) => {
        const title = event.request.content.title ?? '(no title)';
        append('received', title);
      },
    );
    const responseSub =
      Notifications.addNotificationResponseReceivedListener((event) => {
        const title =
          event.notification.request.content.title ?? '(no title)';
        append('tap', title);
      });
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [append]);

  return { log, simulateReceived };
}

/* -------------------------------------------------------------------------- */
/* 5b. useForegroundPresenter — installs the foreground display handler       */
/* -------------------------------------------------------------------------- */

/**
 * Installs `Notifications.setNotificationHandler` so that a notification
 * arriving while the app is FOREGROUNDED is shown (the default is to silently
 * drop it). In a real app this is mounted once in `app/_layout.tsx`; here it
 * is scoped to this screen so the demo works in isolation. The handler is
 * cleared on unmount.
 *
 * Side-effect only (no return state) — the view calls it for its effect, not
 * for a value.
 */
export function useForegroundPresenter(): void {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    return () => {
      Notifications.setNotificationHandler(null);
    };
  }, []);
}

/* -------------------------------------------------------------------------- */
/* 5. useExpoPushToken — illustrative read of an Expo push token              */
/* -------------------------------------------------------------------------- */

export interface ExpoPushTokenDemo {
  /** The token string, or null before/after a failed read. */
  token: string | null;
  /** True while a read is in flight. */
  loading: boolean;
  /** Error message if the read failed (e.g. running under Expo Go). */
  error: string | null;
  /** Read (or re-read) the token. No-op safe to call. */
  read: () => Promise<void>;
}

/**
 * Wraps `Notifications.getExpoPushTokenAsync` so the screen can show what a
 * real push token looks like. This is ILLUSTRATIVE in this app — actually
 * sending via `https://exp.host/--/api/v2/push/send` requires a real FCM/APNs
 * key + a custom dev build (taught in section text). Under Expo Go this throws
 * ("Expo Go does not support push tokens") — surfaced in `error` rather than
 * thrown, so the demo never red-screens.
 */
export function useExpoPushToken(): ExpoPushTokenDemo {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await Notifications.getExpoPushTokenAsync({
        projectId: 'illustrative-only',
      });
      setToken(result.data ?? null);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'getExpoPushTokenAsync failed';
      setError(message);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { token, loading, error, read };
}
