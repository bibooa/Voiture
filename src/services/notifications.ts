import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local notifications for optional parking reminders. Everything is local —
 * no push server, no tokens. Reminders are opt-in and configurable.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // `shouldShowAlert` is the legacy field; banner/list are the newer ones.
    // Setting all keeps this correct across expo-notifications versions.
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'parking-reminders';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Rappels de stationnement',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#5B8CFF',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Schedule a reminder that the car was parked. If `minutes` is provided the
 * reminder fires after that delay, otherwise it is an immediate confirmation.
 */
export async function scheduleParkingReminder(
  address: string | null,
  minutes?: number
): Promise<string | null> {
  const ok = await requestNotificationPermission();
  if (!ok) return null;
  await ensureAndroidChannel();

  const body = address
    ? `Votre voiture est garée près de ${address}.`
    : 'Votre voiture est enregistrée. Ouvrez Garée pour la retrouver.';

  return Notifications.scheduleNotificationAsync({
    content: {
      title: '🚗 Voiture enregistrée',
      body,
      sound: true,
    },
    trigger:
      minutes && minutes > 0
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.round(minutes * 60),
            channelId: CHANNEL_ID,
          }
        : null,
  });
}

export async function cancelReminder(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* ignore */
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* ignore */
  }
}
