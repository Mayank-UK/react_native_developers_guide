import { ScreenScaffold } from '../../components/screen-scaffold';
import { Section, Code, Pill } from '../../components';
import { Box, Text, Button } from '../../design-system';
import {
  NOTIFICATION_TRIGGERS,
  PERMISSION_STATUS,
  permissionLabel,
  useExpoPushToken,
  useForegroundPresenter,
  useLocalNotificationDemo,
  useNotificationLog,
  usePermissionStatus,
} from './notifications_hooks';

/**
 * NotificationsView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (notifications_hooks.ts); this file only renders.
 *
 * Teaching artifact for local + push notifications in RN: the permissions
 * model, `expo-notifications` as the cross-platform standard, the
 * Expo-Go-vs-dev-build caveat (this package's plugin/usage-string requirement
 * is taught here, NOT applied to app.config.ts), scheduling local
 * notifications, foreground handling, tap responses, and the Expo push service.
 *
 * No `any`; strict + erasure-clean. Inside `<Code>{`...`}</Code>` there are no
 * nested template literals (no `${` parse trap); the curl push example uses
 * single-quoted strings to avoid backtick escaping entirely.
 */

export function NotificationsView() {
  useForegroundPresenter();
  return (
    <ScreenScaffold
      title="Notifications"
      subtitle="Local + push notifications, permissions, channels."
    >
      <IntroCard />
      <PermissionsCard />
      <LocalNotificationsCard />
      <ForegroundHandlingCard />
      <TapResponseCard />
      <PushNotificationsCard />
      <ProductionNotesCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. What notifications are in RN                                    */
/* ------------------------------------------------------------------ */

function IntroCard() {
  return (
    <Section
      title="Notifications in React Native"
      explanation="Local notifications are scheduled by the app itself; push notifications arrive from your server via a platform transport (APNs/FCM). expo-notifications is the standard cross-platform API for both."
    >
      <Box gap="sm">
        <Text variant="body">
          RN itself ships no notification primitive — the OS-level APIs
          (iOS <Text style={{ fontFamily: 'monospace' }}>UserNotifications</Text>,
          Android <Text style={{ fontFamily: 'monospace' }}>NotificationManager</Text>)
          are wrapped by{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            expo-notifications
          </Text>
          , which provides one JS surface for scheduling, permissions,
          channels, foreground handling, and push tokens.
        </Text>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" tone="muted">
            <Text style={{ fontWeight: '700' }}>Expo Go caveat.</Text>{' '}
            expo-notifications works in Expo Go for{' '}
            <Text style={{ fontFamily: 'monospace' }}>local</Text>{' '}
            scheduling + reception demos, but{' '}
            <Text style={{ fontFamily: 'monospace' }}>push</Text> tokens + a
            real FCM/APNs key require a{' '}
            <Text style={{ fontFamily: 'monospace' }}>custom dev build</Text>{' '}
            (an EAS development build). The plugin/usage-string requirement
            (<Text style={{ fontFamily: 'monospace' }}>"expo-notifications"</Text>{' '}
            added to{' '}
            <Text style={{ fontFamily: 'monospace' }}>plugins</Text> in{' '}
            <Text style={{ fontFamily: 'monospace' }}>app.config.ts</Text>) is
            taught below but NOT applied — Expo Go demos work without it.
          </Text>
        </Box>
        <Text variant="caption" tone="muted">
          Cross-link: the device-features screen documents the same
          Expo-Go-vs-dev-build caveat for{' '}
          <Text style={{ fontFamily: 'monospace' }}>expo-secure-store</Text>;
          the build & deployment screen covers producing a custom dev build.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Permissions model                                               */
/* ------------------------------------------------------------------ */

function PermissionsCard() {
  const { status, requesting, request } = usePermissionStatus();
  const tone =
    status === 'granted'
      ? 'success'
      : status === 'undetermined'
        ? 'primary'
        : 'danger';
  return (
    <Section
      title="The permissions model"
      explanation="Notifications are gated by a system permission the user must grant once. iOS shows the prompt on first request; Android 13+ (POST_NOTIFICATIONS) does the same. Below 13, Android grants by default."
    >
      <Box gap="sm">
        <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
            current
          </Text>
          <Pill tone={tone} value={status} />
          <Text variant="caption" tone="muted">
            {permissionLabel(status)}
          </Text>
        </Box>
        <Button title={requesting ? 'Requesting…' : 'Request permission'} onPress={request} disabled={requesting} />
        <Code>{`// src/ui/views/notifications/notifications_hooks.ts
import * as Notifications from 'expo-notifications';

export function usePermissionStatus() {
  const [raw, setRaw] = useState<NotificationPermissionsStatus | null>(null);

  const read = useCallback(async () => {
    setRaw(await Notifications.getPermissionsAsync());
  }, []);
  useEffect(() => { void read(); }, [read]);

  const request = useCallback(async () => {
    setRaw(await Notifications.requestPermissionsAsync());
  }, []);

  return { status: reducePermissionStatus(raw), request };
}`}</Code>
        <Text variant="caption" tone="muted">
          The four states:{' '}
          {(Object.keys(PERMISSION_STATUS) as Array<keyof typeof PERMISSION_STATUS>).map((k, i) => (
            <Text key={k} variant="caption" tone="muted">
              {i > 0 ? ' · ' : ''}<Text style={{ fontFamily: 'monospace' }}>{PERMISSION_STATUS[k]}</Text>
            </Text>
          ))}.
          {' '}
          <Text style={{ fontFamily: 'monospace' }}>blocked</Text> means the
          user denied with &ldquo;don&rsquo;t ask again&rdquo; — the in-app
          prompt can no longer be shown; send them to OS Settings.
        </Text>
        <Text variant="caption" tone="muted">
          iOS: declared in{' '}
          <Text style={{ fontFamily: 'monospace' }}>AppDelegate</Text> + the
          Info.plist <Text style={{ fontFamily: 'monospace' }}>UIBackgroundModes</Text>{' '}
          entry for remote notifications. Android 13+: the{' '}
          <Text style={{ fontFamily: 'monospace' }}>POST_NOTIFICATIONS</Text>{' '}
          runtime permission (API 33+). On a custom dev build,
          expo-notifications&rsquo; config plugin wires these up; in Expo Go
          the demo reads whatever the host grants.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Local notifications                                             */
/* ------------------------------------------------------------------ */

function LocalNotificationsCard() {
  const { schedule, lastId, ok, error } = useLocalNotificationDemo(5);
  const { simulateReceived } = useNotificationLog();
  return (
    <Section
      title="Local notifications — triggers"
      explanation="Local notifications are scheduled by the app and fired by the OS at a trigger time. No server round-trip — ideal for reminders, alarms, and countdowns."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {(Object.keys(NOTIFICATION_TRIGGERS) as Array<keyof typeof NOTIFICATION_TRIGGERS>).map((k) => (
            <Pill key={k} label="trigger" value={NOTIFICATION_TRIGGERS[k]} />
          ))}
        </Box>
        <Text variant="body">
          Press the button to schedule a notification 5 seconds out. If the
          app is foregrounded when it fires, it appears here as a received
          event; if backgrounded, the OS posts it to the system tray.
        </Text>
        <Button
          title="Schedule (5s)"
          onPress={async () => {
            await schedule();
          }}
        />
        {(ok !== null || error) && (
          <Box p="sm" radius="sm" bg="surfaceVariant" row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Pill tone={ok ? 'success' : 'danger'} value={ok ? 'scheduled' : 'failed'} />
            {lastId ? (
              <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
                id: {lastId}
              </Text>
            ) : null}
            {error ? (
              <Text variant="caption" tone="danger">
                {error}
              </Text>
            ) : null}
          </Box>
        )}
        <Code>{`import * as Notifications from 'expo-notifications';

await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Hello from RN',
    body: 'This is a locally-scheduled notification.',
    data: { source: 'notifications-screen' },
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 5,
  },
});`}</Code>
        <Button
          title="Simulate foreground receive"
          onPress={() => simulateReceived('Simulated receive')}
        />
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Foreground handling                                             */
/* ------------------------------------------------------------------ */

function ForegroundHandlingCard() {
  const { log } = useNotificationLog();
  return (
    <Section
      title="Receiving while foregrounded"
      explanation="By default, a notification that arrives while the app is in the foreground is silently dropped. You opt in to showing it by installing a setNotificationHandler that returns shouldShowBanner."
    >
      <Box gap="sm">
        <Code>{`// Install ONCE (e.g. in app/_layout.tsx for a real app; here scoped to
// this view via useForegroundPresenter).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});`}</Code>
        <Text variant="body">
          The handler must respond within 3 seconds — the OS discards the
          notification otherwise. Any side-effect work (logging, fetching,
          analytics) belongs in the listeners below, NOT in the handler.
        </Text>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="caption" tone="muted" style={{ fontWeight: '700' }}>
            received / tap log (most-recent first)
          </Text>
          <Box gap="xs" mt="xs">
            {log.length === 0 ? (
              <Text variant="caption" tone="muted">
                No events yet. Schedule a local notification above, then wait
                for it to fire (or press &ldquo;Simulate&rdquo;). Under jest,
                the listener spies fire synthetic events in the spec.
              </Text>
            ) : (
              log.map((e) => (
                <Box key={e.id} p="sm" radius="sm" bg="surfaceVariant" row gap="sm" style={{ alignItems: 'center' }}>
                  <Pill tone={e.kind === 'tap' ? 'primary' : 'success'} value={e.kind} />
                  <Box flex={1}>
                    <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
                      {e.at}
                    </Text>
                  </Box>
                  <Text variant="caption" tone="muted">
                    {e.title}
                  </Text>
                </Box>
              ))
            )}
          </Box>
        </Box>
        <Code>{`// Foreground receive listener — wired in useNotificationLog.
const sub = Notifications.addNotificationReceivedListener((event) => {
  console.log('received', event.request.content.title);
});
return () => sub.remove();   // cleanup on unmount (jest worker-leak guard)`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Tap response                                                    */
/* ------------------------------------------------------------------ */

function TapResponseCard() {
  return (
    <Section
      title="Responding to taps"
      explanation="When the user taps a notification (or an action button on it) the app receives a NotificationResponse. This is your hook for deep-linking to a specific screen."
    >
      <Box gap="sm">
        <Code>{`// Wired alongside the receive listener in useNotificationLog.
const sub = Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  // data is your arbitrary payload — e.g. a deep-link target:
  if (typeof data.url === 'string') {
    router.push(data.url);
  }
});
return () => sub.remove();`}</Code>
        <Text variant="caption" tone="muted">
          The tap event fires on cold-start too: if the app was killed, the
          tap that launched it is the most-recent response, readable via{' '}
          <Text style={{ fontFamily: 'monospace' }}>
            Notifications.getLastNotificationResponseAsync()
          </Text>{' '}
          (or the{' '}
          <Text style={{ fontFamily: 'monospace' }}>useLastNotificationResponse</Text>{' '}
          hook). Handle it in your root layout&rsquo;s mount effect.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Push notifications                                              */
/* ------------------------------------------------------------------ */

function PushNotificationsCard() {
  const { token, loading, error, read } = useExpoPushToken();
  return (
    <Section
      title="Push notifications — Expo push service"
      explanation="Push tokens identify a single device-install pair. The Expo push service is the easiest transport: it fans a single POST out to APNs (iOS) and FCM (Android). Real FCM/APNs keys + a custom dev build are required."
    >
      <Box gap="sm">
        <Text variant="body">
          Two steps: get a token on the device, send it to your server, then
          have your server POST to the Expo push service to deliver.
        </Text>
        <Code>{`import * as Notifications from 'expo-notifications';

const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-project-id',   // from EAS / app.config
});
// POST token.data to your backend, store against this user.`}</Code>
        <Button
          title={loading ? 'Reading…' : 'Read Expo push token'}
          onPress={read}
          disabled={loading}
        />
        {token ? (
          <Box p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="caption" tone="muted" style={{ fontWeight: '700' }}>
              token
            </Text>
            <Text variant="caption" style={{ fontFamily: 'monospace' }}>
              {token}
            </Text>
          </Box>
        ) : null}
        {error ? (
          <Box p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="caption" tone="danger">
              {error}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              Under Expo Go this throws — push tokens require a custom dev
              build (FCM/APNs credentials are not provisioned for Expo Go).
            </Text>
          </Box>
        ) : null}
        <Text variant="caption" tone="muted" style={{ fontWeight: '700' }}>
          Sending a push (server-side, illustrative)
        </Text>
        <Code>{`# POST to the Expo push service from your server. Do NOT call this
# from the app — the Expo push service expects your server-side auth.
curl -X POST \\
  -H 'accept: application/json' \\
  -H 'content-type: application/json' \\
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "New message",
    "body": "Tap to read",
    "data": { "url": "/messages/42" }
  }' \\
  https://exp.host/--/api/v2/push/send`}</Code>
        <Text variant="caption" tone="muted">
          For FCM directly (bypassing the Expo service), set{' '}
          <Text style={{ fontFamily: 'monospace' }}>useFCMTokens: true</Text>{' '}
          in the plugin config and call{' '}
          <Text style={{ fontFamily: 'monospace' }}>getDevicePushTokenAsync()</Text>.
          Either path needs an EAS build with real{' '}
          <Text style={{ fontFamily: 'monospace' }}>FCM server key</Text> /
          APNs auth key uploaded via{' '}
          <Text style={{ fontFamily: 'monospace' }}>eas credentials</Text>.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Production notes                                                */
/* ------------------------------------------------------------------ */

const DO_ROWS: ReadonlyArray<{ tone: 'success' | 'danger'; label: string; body: string }> = [
  {
    tone: 'success',
    label: 'DO set up Android channels',
    body: 'On Android 8+ every notification must belong to a channel. Call Notifications.setNotificationChannelAsync(name, { name, importance, sound }) at startup, then reference it via trigger.channelId or content.',
  },
  {
    tone: 'success',
    label: 'DO handle the cold-start tap',
    body: 'On launch, read getLastNotificationResponseAsync() (or the useLastNotificationResponse hook) — the tap that launched the app is otherwise lost.',
  },
  {
    tone: 'success',
    label: 'DO keep the foreground handler fast',
    body: 'setNotificationHandler.handleNotification must resolve within 3s. Do analytics/DB writes in a listener, not in the handler.',
  },
  {
    tone: 'success',
    label: 'DO wrap getExpoPushTokenAsync in try/catch',
    body: 'It hits the network and can fail offline (or throw under Expo Go). Persist the token only on success; retry on the next app open.',
  },
  {
    tone: 'danger',
    label: 'AVOID treating Expo Go as a push target',
    body: 'Push tokens + a real FCM/APNs key require a custom dev build (eas build --profile development). Expo Go throws when you request a token.',
  },
  {
    tone: 'danger',
    label: 'AVOID relying on background delivery in JS',
    body: 'When the app is suspended, your JS listeners do not fire. High-priority FCM data messages or a background notification task are the only reliable paths — both need a dev build.',
  },
  {
    tone: 'danger',
    label: 'AVOID hardcoded icon/sound asset names',
    body: 'Bundle the icon/sound under android/app/src/main/res (or app.json expo-plugin fields) — a missing asset silently renders no icon / plays no sound.',
  },
];

function ProductionNotesCard() {
  return (
    <Section
      title="Production notes"
      explanation="A do/avoid list. Notifications touch the OS permission UI, the system tray, deep-linking, and background execution — each has a production-only gotcha not visible in Expo Go."
    >
      <Box gap="xs">
        {DO_ROWS.map((r) => (
          <Box key={r.label} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
            <Pill tone={r.tone} value={r.tone === 'success' ? 'DO' : 'AVOID'} />
            <Box flex={1}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.label}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.body}
              </Text>
            </Box>
          </Box>
        ))}
        <Code>{`// app.config.ts — the plugin config (NOT applied in this demo app;
// taught here so you can copy it when you move to a custom dev build).
plugins: [
  ['expo-notifications', {
    icons: ['./assets/notif-icon.png'],
    enableBackgroundRemoteNotifications: true,
  }],
]`}</Code>
      </Box>
    </Section>
  );
}
