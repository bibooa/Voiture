import { Linking, Platform, Share } from 'react-native';

/**
 * Launch turn-by-turn navigation to the car using the phone's native maps app
 * (Apple Maps on iOS, Google Maps on Android), defaulting to walking mode since
 * you're on foot heading back to your car.
 */
export async function openWalkingDirections(
  latitude: number,
  longitude: number,
  label = 'Ma voiture'
): Promise<void> {
  const coords = `${latitude},${longitude}`;

  const url =
    Platform.select({
      ios: `maps://?daddr=${coords}&dirflg=w&q=${encodeURIComponent(label)}`,
      android: `google.navigation:q=${coords}&mode=w`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${coords}&travelmode=walking`,
    }) ?? '';

  const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${coords}&travelmode=walking`;

  try {
    const supported = await Linking.canOpenURL(url);
    await Linking.openURL(supported ? url : webFallback);
  } catch {
    await Linking.openURL(webFallback).catch(() => {});
  }
}

/**
 * Share the car's location as a maps link (e.g. to send to someone, or to open
 * it on another device). Uses the OS share sheet.
 */
export async function shareLocation(
  latitude: number,
  longitude: number,
  label = 'Ma voiture',
  note?: string | null
): Promise<void> {
  const coords = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const link = `https://www.google.com/maps/search/?api=1&query=${coords}`;
  const message = [`${label} est ici : ${link}`, note ? `Repère : ${note}` : null]
    .filter(Boolean)
    .join('\n');
  try {
    await Share.share({ message });
  } catch {
    /* user dismissed */
  }
}
