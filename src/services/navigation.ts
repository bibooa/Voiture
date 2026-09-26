import { Linking, Platform, Share } from 'react-native';

/**
 * External turn-by-turn navigation (walking) and location sharing.
 * "ME GUIDER" lets the user pick the app; every option falls back to the web
 * version of Google Maps if the native app cannot be opened.
 */

export type NavApp = { id: 'apple' | 'google' | 'other'; label: string; open: () => Promise<void> };

const webDirections = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

async function openFirst(urls: string[]): Promise<void> {
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      /* try next */
    }
  }
}

/** Navigation apps offered for walking directions on this device. */
export async function navigationApps(latitude: number, longitude: number, label = 'Ma voiture'): Promise<NavApp[]> {
  const q = `${latitude},${longitude}`;
  const name = encodeURIComponent(label);
  const apps: NavApp[] = [];

  if (Platform.OS === 'ios') {
    apps.push({
      id: 'apple',
      label: 'Apple Plans',
      open: () => openFirst([`maps://?daddr=${q}&dirflg=w&q=${name}`, webDirections(latitude, longitude)]),
    });
    let hasGoogle = false;
    try {
      hasGoogle = await Linking.canOpenURL('comgooglemaps://');
    } catch {
      hasGoogle = false;
    }
    apps.push({
      id: 'google',
      label: hasGoogle ? 'Google Maps' : 'Google Maps (web)',
      open: () =>
        openFirst([
          ...(hasGoogle ? [`comgooglemaps://?daddr=${q}&directionsmode=walking`] : []),
          webDirections(latitude, longitude),
        ]),
    });
  } else {
    apps.push({
      id: 'google',
      label: 'Google Maps',
      open: () => openFirst([`google.navigation:q=${q}&mode=w`, webDirections(latitude, longitude)]),
    });
    apps.push({
      id: 'other',
      label: 'Autre application…',
      // `geo:` lets Android offer every installed map/navigation app.
      open: () => openFirst([`geo:${q}?q=${q}(${name})`, webDirections(latitude, longitude)]),
    });
  }
  return apps;
}

/** Legacy helper: open the default walking directions directly. */
export async function openWalkingDirections(latitude: number, longitude: number, label = 'Ma voiture'): Promise<void> {
  const apps = await navigationApps(latitude, longitude, label);
  await apps[0].open();
}

/** Share the car's location as a maps link via the OS share sheet. */
export async function shareLocation(
  latitude: number,
  longitude: number,
  label = 'Ma voiture',
  note?: string | null
): Promise<void> {
  const coords = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const link = `https://www.google.com/maps/search/?api=1&query=${coords}`;
  const message = [`${label} est ici : ${link}`, note ? `Repère : ${note}` : null].filter(Boolean).join('\n');
  try {
    await Share.share({ message });
  } catch {
    /* user dismissed */
  }
}
