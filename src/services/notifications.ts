import { Platform } from 'react-native';

/**
 * Local notifications for optional parking reminders. Everything is local —
 * no push server, no tokens.
 *
 * `expo-notifications` is imported lazily (inside each function) on purpose:
 * importing it at module load triggers a push-token auto-registration side
 * effect that logs a noisy error inside Expo Go (SDK 53+ removed remote push
 * from Expo Go). Deferring the import keeps app startup clean; local reminders
 * still work in a development/production build.
 */

const CHANNEL_ID = 'parking-reminders';
let handlerConfigured = false;

// eslint-disable-next-line @typescript-eslint/no-var-requires
type Notifications = typeof import('expo-notifications');
function getNotifications(): Notifications {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

function configureHandler(N: Notifications) {
  if (handlerConfigured) return;
  handlerConfigured = true;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(N: Notifications) {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Rappels de stationnement',
    importance: N.AndroidImportance.DEFAULT,
    lightColor: '#5B8CFF',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const N = getNotifications();
    const settings = await N.getPermissionsAsync();
    if (settings.granted) return true;
    const req = await N.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/** Schedule a reminder that the car was parked. */
export async function scheduleParkingReminder(
  address: string | null,
  minutes?: number
): Promise<string | null> {
  try {
    const N = getNotifications();
    const ok = await requestNotificationPermission();
    if (!ok) return null;
    configureHandler(N);
    await ensureAndroidChannel(N);

    const body = address
      ? `Votre voiture est garée près de ${address}.`
      : 'Votre voiture est enregistrée. Ouvrez VéhiTrack pour la retrouver.';

    return N.scheduleNotificationAsync({
      content: { title: '🚗 Voiture enregistrée', body, sound: true },
      trigger:
        minutes && minutes > 0
          ? {
              type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: Math.round(minutes * 60),
              channelId: CHANNEL_ID,
            }
          : null,
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string): Promise<void> {
  try {
    await getNotifications().cancelScheduledNotificationAsync(id);
  } catch {
    /* ignore */
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await getNotifications().cancelAllScheduledNotificationsAsync();
  } catch {
    /* ignore */
  }
}
