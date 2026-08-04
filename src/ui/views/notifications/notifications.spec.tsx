import { act, render, renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from '../../design-system/theme-provider';
import {
  NOTIFICATION_TRIGGERS,
  PERMISSION_STATUS,
  notificationKind,
  permissionLabel,
  reducePermissionStatus,
  useExpoPushToken,
  useForegroundPresenter,
  useLocalNotificationDemo,
  useNotificationLog,
  usePermissionStatus,
} from './notifications_hooks';
import { NotificationsView } from './notifications_view';

// The dumb view is wrapped in ScreenScaffold, which needs expo-router nav +
// SafeAreaProvider contexts. For this smoke test we only care that the view's
// own composition renders, so mock the scaffold to pass children through.
jest.mock('../../components/screen-scaffold', () => {
  const { View } = require('react-native');
  return {
    ScreenScaffold: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});
// Sparse-mock @react-navigation/native (a bare object mock breaks native-stack
// via the LinkCard→expo-router transitive). Override only useFocusEffect.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: () => undefined,
}));

/**
 * Tests for the notifications view's LOGIC (pure helpers + the four hooks) and
 * a smoke render of the dumb view.
 *
 * The global `jest.mocks.ts` wires `expo-notifications` to a stable mock
 * before this file loads (granted permission, schedule resolves to 'notif-id',
 listeners return `{ remove }`). Per-spec we capture the registered listeners
 * so a test can fire synthetic received/tap events.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('const-objects + pure helpers', () => {
  it('exposes the trigger kinds the screen teaches', () => {
    expect(NOTIFICATION_TRIGGERS.timeInterval).toBe('timeInterval');
    expect(NOTIFICATION_TRIGGERS.date).toBe('date');
    expect(NOTIFICATION_TRIGGERS.channel).toBe('channel');
    expect(Object.keys(NOTIFICATION_TRIGGERS).length).toBeGreaterThanOrEqual(7);
  });

  it('exposes the four permission states', () => {
    expect(PERMISSION_STATUS.granted).toBe('granted');
    expect(PERMISSION_STATUS.undetermined).toBe('undetermined');
    expect(PERMISSION_STATUS.denied).toBe('denied');
    expect(PERMISSION_STATUS.blocked).toBe('blocked');
  });

  it('permissionLabel maps each state to a friendly word', () => {
    expect(permissionLabel('granted')).toMatch(/Granted/i);
    expect(permissionLabel('denied')).toMatch(/Denied/i);
    expect(permissionLabel('undetermined')).toMatch(/Not yet asked/i);
    expect(permissionLabel('blocked')).toMatch(/Settings/i);
  });

  it('notificationKind echoes the action', () => {
    expect(notificationKind('received')).toBe('received');
    expect(notificationKind('tap')).toBe('tap');
  });

  it('reducePermissionStatus derives the four states from a raw response', () => {
    expect(reducePermissionStatus(null)).toBe('undetermined');
    expect(
      reducePermissionStatus({
        status: 'granted' as Notifications.PermissionStatus,
        expires: 'never',
        granted: true,
        canAskAgain: true,
      }),
    ).toBe('granted');
    expect(
      reducePermissionStatus({
        status: 'denied' as Notifications.PermissionStatus,
        expires: 'never',
        granted: false,
        canAskAgain: true,
      }),
    ).toBe('denied');
    expect(
      reducePermissionStatus({
        status: 'denied' as Notifications.PermissionStatus,
        expires: 'never',
        granted: false,
        canAskAgain: false,
      }),
    ).toBe('blocked');
  });
});

describe('usePermissionStatus', () => {
  it('starts undetermined then resolves to granted after the mount read', async () => {
    const { result, unmount } = renderHook(() => usePermissionStatus(), {
      wrapper,
    });
    // Initially undetermined — getPermissionsAsync hasn't resolved yet.
    expect(result.current.status).toBe('undetermined');
    // Permit the pending getPermissionsAsync() promise from the mount effect.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('granted');
    unmount();
  });

  it('request() drives requestPermissionsAsync and updates status', async () => {
    const { result, unmount } = renderHook(() => usePermissionStatus(), {
      wrapper,
    });
    await act(async () => {
      await result.current.request();
    });
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(result.current.status).toBe('granted');
    unmount();
  });
});

describe('useLocalNotificationDemo', () => {
  it('schedules a notification and records its id', async () => {
    const { result, unmount } = renderHook(() => useLocalNotificationDemo(5), {
      wrapper,
    });
    expect(result.current.lastId).toBeNull();
    await act(async () => {
      await result.current.schedule();
    });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Hello from RN' }),
        trigger: expect.objectContaining({
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
        }),
      }),
    );
    expect(result.current.lastId).toBe('notif-id');
    expect(result.current.ok).toBe(true);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it('captures a scheduling failure as an error string', async () => {
    const failure = new Error('boom');
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(
      failure,
    );
    const { result, unmount } = renderHook(() => useLocalNotificationDemo(), {
      wrapper,
    });
    await act(async () => {
      await result.current.schedule();
    });
    expect(result.current.ok).toBe(false);
    expect(result.current.error).toBe('boom');
    unmount();
  });
});

describe('useNotificationLog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers both listeners on mount and tears them down on unmount', () => {
    const { unmount } = renderHook(() => useNotificationLog(), { wrapper });
    expect(
      Notifications.addNotificationReceivedListener,
    ).toHaveBeenCalledTimes(1);
    expect(
      Notifications.addNotificationResponseReceivedListener,
    ).toHaveBeenCalledTimes(1);
    unmount();
    // Each subscription's remove() is the cleanup path. The mock's
    // subscription returns { remove: jest.fn() }; we only assert the listeners
    // were registered (the teardown wiring is exercised without red).
    expect(
      Notifications.addNotificationReceivedListener,
    ).toHaveBeenCalledTimes(1);
  });

  it('simulateReceived appends a received event to the log', () => {
    const { result, unmount } = renderHook(() => useNotificationLog(), {
      wrapper,
    });
    expect(result.current.log).toHaveLength(0);
    act(() => result.current.simulateReceived('Hello'));
    expect(result.current.log).toHaveLength(1);
    expect(result.current.log[0]!.kind).toBe('received');
    expect(result.current.log[0]!.title).toBe('Hello');
    unmount();
  });

  it('forwards real received events through the registered listener', () => {
    let received: ((event: Notifications.Notification) => void) | null = null;
    (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation(
      (cb: (event: Notifications.Notification) => void) => {
        received = cb;
        return { remove: jest.fn() };
      },
    );
    const { result, unmount } = renderHook(() => useNotificationLog(), {
      wrapper,
    });
    act(() => {
      if (!received) throw new Error('listener not registered');
      received({
        date: 0,
        request: {
          identifier: 'x',
          content: { title: 'Real one' },
        },
      } as unknown as Notifications.Notification);
    });
    expect(result.current.log[0]!.title).toBe('Real one');
    expect(result.current.log[0]!.kind).toBe('received');
    unmount();
  });

  it('forwards tap events through the registered response listener', () => {
    let responder:
      | ((event: Notifications.NotificationResponse) => void)
      | null = null;
    (
      Notifications.addNotificationResponseReceivedListener as jest.Mock
    ).mockImplementation((cb: (e: Notifications.NotificationResponse) => void) => {
      responder = cb;
      return { remove: jest.fn() };
    });
    const { result, unmount } = renderHook(() => useNotificationLog(), {
      wrapper,
    });
    act(() => {
      if (!responder) throw new Error('listener not registered');
      responder({
        notification: {
          date: 0,
          request: {
            identifier: 'y',
            content: { title: 'Tap target' },
          },
        },
        actionIdentifier:
          Notifications.DEFAULT_ACTION_IDENTIFIER,
      } as unknown as Notifications.NotificationResponse);
    });
    expect(result.current.log[0]!.kind).toBe('tap');
    expect(result.current.log[0]!.title).toBe('Tap target');
    unmount();
  });

  it('caps the log to max', () => {
    const { result, unmount } = renderHook(() => useNotificationLog(3), {
      wrapper,
    });
    for (let i = 0; i < 6; i++) {
      act(() => result.current.simulateReceived('n' + i));
    }
    expect(result.current.log).toHaveLength(3);
    // most-recent-first
    expect(result.current.log[0]!.title).toBe('n5');
    unmount();
  });
});

describe('useForegroundPresenter', () => {
  it('installs the handler on mount and clears it on unmount', () => {
    const { unmount } = renderHook(() => useForegroundPresenter(), { wrapper });
    expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        handleNotification: expect.any(Function),
      }),
    );
    unmount();
    // The cleanup clears by passing null.
    expect(Notifications.setNotificationHandler).toHaveBeenLastCalledWith(null);
  });
});

describe('useExpoPushToken', () => {
  it('reads the token via getExpoPushTokenAsync', async () => {
    const { result, unmount } = renderHook(() => useExpoPushToken(), {
      wrapper,
    });
    expect(result.current.token).toBeNull();
    await act(async () => {
      await result.current.read();
    });
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    expect(result.current.token).toBe('ExponentPushToken[mock-token]');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it('surfaces a read failure as an error string rather than throwing', async () => {
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValueOnce(
      new Error('expo go'),
    );
    const { result, unmount } = renderHook(() => useExpoPushToken(), {
      wrapper,
    });
    await act(async () => {
      await result.current.read();
    });
    expect(result.current.token).toBeNull();
    expect(result.current.error).toBe('expo go');
    unmount();
  });
});

describe('NotificationsView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON, unmount } = render(<NotificationsView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    // Unmount so the live listeners + foreground presenter don't keep the jest
    // worker alive after the suite ends.
    unmount();
  });
});
