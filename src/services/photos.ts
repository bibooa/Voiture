import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Parking-spot photos. Stored ONLY in the app's private documents folder and
 * never uploaded. The picker's cache file is copied there so the photo
 * survives cache cleaning.
 */

const DIR = `${FileSystem.documentDirectory}photos/`;

export type PhotoResult = { ok: true; uri: string } | { ok: false; reason: 'cancelled' | 'denied' | 'error' };

async function keep(tempUri: string, carId: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
  const dest = `${DIR}${carId}-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6, // enough to read a pillar number, small on disk
  allowsEditing: false,
  exif: false, // no GPS metadata copied along
};

export async function takePhoto(carId: string): Promise<PhotoResult> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };
    const res = await ImagePicker.launchCameraAsync(OPTIONS);
    if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancelled' };
    return { ok: true, uri: await keep(res.assets[0].uri, carId) };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export async function pickPhoto(carId: string): Promise<PhotoResult> {
  try {
    const res = await ImagePicker.launchImageLibraryAsync(OPTIONS);
    if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancelled' };
    return { ok: true, uri: await keep(res.assets[0].uri, carId) };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Delete a stored photo (ignores files outside our folder or already gone). */
export async function deletePhoto(uri: string | null | undefined): Promise<void> {
  if (!uri || !uri.startsWith(DIR)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}
