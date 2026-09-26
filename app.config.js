/**
 * Adds the secrets that must NOT live in app.json (the repository is public).
 *
 * GOOGLE_MAPS_ANDROID_KEY: required for the map in a real Android build (Expo Go
 * ships its own key). Set it once as an EAS environment variable:
 *   eas env:create --name GOOGLE_MAPS_ANDROID_KEY --value <key> --environment production --visibility sensitive
 * and restrict the key in Google Cloud to the package `com.vehitrack.app` + the
 * app-signing SHA-1 shown in Play Console.
 */
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  return {
    ...config,
    android: {
      ...config.android,
      ...(mapsKey ? { config: { ...(config.android?.config ?? {}), googleMaps: { apiKey: mapsKey } } } : {}),
    },
  };
};
