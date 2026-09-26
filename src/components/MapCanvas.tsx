import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polyline, Circle, Region, MapType } from 'react-native-maps';
import { useTheme } from '@/theme';
import { CarMarker, UserMarker, FavoriteMarker } from './markers';
import type { Favorite } from '@/types';
import { mapDarkStyle } from '@/theme/mapStyle';

export type LatLng = { latitude: number; longitude: number };

export type MapCanvasHandle = {
  fitToPoints: (points: LatLng[]) => void;
  centerOn: (point: LatLng, zoomDelta?: number) => void;
};

type Props = {
  user?: LatLng | null;
  userAccuracy?: number | null;
  car?: LatLng | null;
  favorites?: Favorite[];
  showRoute?: boolean;
  mapType?: MapType;
  onMarkerPress?: (id: string) => void;
  initialRegion?: Region;
  style?: any;
};

const FALLBACK_REGION: Region = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

/**
 * The interactive map. Wraps react-native-maps with our custom markers, an
 * accuracy circle around the user, a connecting route line, and a dark map
 * style that matches the app's premium dark theme.
 *
 * Custom markers use `tracksViewChanges` only until first paint (Android perf).
 */
export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  { user, userAccuracy, car, favorites = [], showRoute, mapType = 'standard', onMarkerPress, initialRegion, style },
  ref
) {
  const t = useTheme();
  const mapRef = useRef<MapView>(null);
  const [tracks, setTracks] = useState(true);

  useImperativeHandle(ref, () => ({
    fitToPoints: (points) => {
      const valid = points.filter(Boolean);
      if (valid.length === 0) return;
      if (valid.length === 1) {
        mapRef.current?.animateToRegion(
          { ...valid[0], latitudeDelta: 0.006, longitudeDelta: 0.006 },
          500
        );
        return;
      }
      mapRef.current?.fitToCoordinates(valid, {
        edgePadding: { top: 120, right: 90, bottom: 320, left: 90 },
        animated: true,
      });
    },
    centerOn: (point, zoomDelta = 0.005) => {
      mapRef.current?.animateToRegion(
        { ...point, latitudeDelta: zoomDelta, longitudeDelta: zoomDelta },
        500
      );
    },
  }));

  const region = useMemo<Region>(() => {
    if (initialRegion) return initialRegion;
    if (user) return { ...user, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    if (car) return { ...car, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    return FALLBACK_REGION;
  }, [initialRegion, user, car]);

  // Stop tracking view changes shortly after mount so markers stay smooth.
  const stopTracking = () => setTimeout(() => setTracks(false), 1200);

  return (
    <MapView
      ref={mapRef}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={region}
      mapType={mapType}
      customMapStyle={t.colors.isDark && mapType === 'standard' ? mapDarkStyle : undefined}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled
      pitchEnabled
      onMapReady={stopTracking}
    >
      {user && userAccuracy ? (
        <Circle
          center={user}
          radius={Math.max(userAccuracy, 5)}
          strokeColor={t.colors.primary + '80'}
          fillColor={t.colors.primary + '22'}
          strokeWidth={1}
        />
      ) : null}

      {showRoute && user && car ? (
        <Polyline
          coordinates={[user, car]}
          strokeColor={t.colors.primary}
          strokeWidth={4}
          lineDashPattern={Platform.OS === 'ios' ? [2, 10] : undefined}
          lineCap="round"
        />
      ) : null}

      {favorites.map((f) => (
        <Marker
          key={f.id}
          coordinate={{ latitude: f.latitude, longitude: f.longitude }}
          tracksViewChanges={tracks}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onMarkerPress?.(f.id)}
        >
          <FavoriteMarker icon={f.icon} />
        </Marker>
      ))}

      {user ? (
        <Marker coordinate={user} tracksViewChanges={tracks} anchor={{ x: 0.5, y: 0.5 }}>
          <UserMarker />
        </Marker>
      ) : null}

      {car ? (
        <Marker
          coordinate={car}
          tracksViewChanges={tracks}
          anchor={{ x: 0.5, y: 0.85 }}
          onPress={() => onMarkerPress?.('car')}
        >
          <CarMarker />
        </Marker>
      ) : null}
    </MapView>
  );
});
