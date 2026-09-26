import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, Circle, type Region, type MapType } from 'react-native-maps';
import { useTheme } from '@/theme';
import { CarMarker, UserMarker, HeadingCone } from './markers';
import { mapDarkStyle } from '@/theme/mapStyle';
import type { LatLng } from '@/utils/geo';
import type { LiveFix, ParkedLocation } from '@/types';

export type { LatLng };

export type MapCanvasHandle = {
  /** Frame user + car (or whichever exists). */
  fitAll: () => void;
  centerOnUser: () => void;
  zoomBy: (delta: number) => void;
  resetNorth: () => void;
};

type Props = {
  user: LiveFix | null;
  car: ParkedLocation | null;
  /** Small label over the car pin (e.g. "125 m"). */
  carLabel?: string;
  /** Compass heading to draw the view cone (null = no cone). */
  heading?: number | null;
  /** Real walking route geometry. When absent, a dashed straight line is drawn. */
  route?: LatLng[] | null;
  mapType?: MapType;
  /** Screen area covered by overlays, so centring & framing avoid it. */
  padding?: { top: number; bottom: number };
  /** Camera follows the user. Any manual pan turns it off via onFollowChange. */
  follow?: boolean;
  onFollowChange?: (follow: boolean) => void;
  /** Rotate the map with the compass while following. */
  rotateWithHeading?: boolean;
  /** Reports the camera heading so a compass control can reflect it. */
  onCameraHeading?: (deg: number) => void;
};

const FALLBACK: Region = { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.02, longitudeDelta: 0.02 };

/**
 * The real, interactive map (Apple Maps on iOS, Google Maps on Android).
 * Draws: the user (dot + optional compass cone + accuracy circle), the car
 * (pin + distance label + saved-accuracy circle) and the walking route.
 */
export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  {
    user,
    car,
    carLabel,
    heading = null,
    route,
    mapType = 'standard',
    padding = { top: 0, bottom: 0 },
    follow = false,
    onFollowChange,
    rotateWithHeading = false,
    onCameraHeading,
  },
  ref
) {
  const t = useTheme();
  const mapRef = useRef<MapView>(null);
  const framedOnce = useRef(false);
  const lastCam = useRef({ at: 0, heading: 0 });

  // Custom marker views are bitmaps on Android: let them repaint briefly
  // after their content changes, then freeze them for smooth panning.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const id = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(id);
  }, [carLabel, car?.id, t.colors.isDark]);

  // Android (Google Maps) applies `mapPadding` to framing and centring itself.
  // Apple Maps does not, so on iOS we add the overlay insets explicitly.
  const edge =
    Platform.OS === 'ios'
      ? { top: padding.top + 60, right: 64, bottom: padding.bottom + 40, left: 64 }
      : { top: 60, right: 64, bottom: 40, left: 64 };

  const [camHeading, setCamHeading] = useState(0);

  /**
   * Coordinate to put at the camera centre so that `p` appears in the middle of
   * the *visible* area (between the header and the bottom panel). Needed on iOS
   * only — see `edge` above.
   */
  const visibleCenter = async (p: LatLng): Promise<LatLng> => {
    const shift = (padding.bottom - padding.top) / 2;
    if (Platform.OS !== 'ios' || Math.abs(shift) < 4 || !mapRef.current) return p;
    try {
      const pt = await mapRef.current.pointForCoordinate(p);
      return await mapRef.current.coordinateForPoint({ x: pt.x, y: pt.y + shift });
    } catch {
      return p;
    }
  };

  const fitAll = () => {
    const pts: LatLng[] = [];
    if (user) pts.push(user);
    if (car) pts.push(car);
    if (route && route.length > 1) pts.push(...route);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      mapRef.current?.animateCamera({ center: pts[0], zoom: 17, heading: 0 }, { duration: 450 });
      return;
    }
    mapRef.current?.fitToCoordinates(pts, { edgePadding: edge, animated: true });
  };

  useImperativeHandle(ref, () => ({
    fitAll,
    centerOnUser: async () => {
      if (!user) return;
      mapRef.current?.animateCamera({ center: await visibleCenter(user) }, { duration: 400 });
    },
    zoomBy: async (delta) => {
      const cam = await mapRef.current?.getCamera();
      if (!cam) return;
      if (Platform.OS === 'ios' && cam.altitude != null) {
        mapRef.current?.animateCamera({ altitude: cam.altitude / Math.pow(2, delta) }, { duration: 250 });
      } else if (cam.zoom != null) {
        mapRef.current?.animateCamera({ zoom: cam.zoom + delta }, { duration: 250 });
      }
    },
    resetNorth: () => {
      setCamHeading(0);
      mapRef.current?.animateCamera({ heading: 0 }, { duration: 300 });
    },
  }));

  // Frame user + car once when both are first known.
  useEffect(() => {
    if (framedOnce.current || !user || !car) return;
    framedOnce.current = true;
    const id = setTimeout(fitAll, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user, !!car]);

  // Follow mode (throttled so the camera never fights the user).
  useEffect(() => {
    if (!follow || !user) return;
    const now = Date.now();
    const wantHeading = rotateWithHeading && heading != null ? heading : undefined;
    const headingMoved = wantHeading != null && Math.abs(wantHeading - lastCam.current.heading) > 4;
    if (now - lastCam.current.at < 700 && !headingMoved) return;
    lastCam.current = { at: now, heading: wantHeading ?? lastCam.current.heading };
    let cancelled = false;
    visibleCenter(user).then((center) => {
      if (cancelled) return;
      if (wantHeading != null) setCamHeading(wantHeading);
      mapRef.current?.animateCamera(
        { center, ...(wantHeading != null ? { heading: wantHeading } : {}) },
        { duration: 500 }
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, user, heading, rotateWithHeading]);

  const initialRegion: Region = user
    ? { latitude: user.latitude, longitude: user.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }
    : car
      ? { latitude: car.latitude, longitude: car.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }
      : FALLBACK;

  const hasRoute = !!route && route.length > 1;

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      mapType={mapType}
      customMapStyle={t.colors.isDark && mapType === 'standard' ? mapDarkStyle : undefined}
      userInterfaceStyle={t.colors.isDark ? 'dark' : 'light'}
      mapPadding={{ top: padding.top, right: 0, bottom: padding.bottom, left: 0 }}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      showsScale={false}
      showsBuildings
      showsTraffic={false}
      showsIndoors={false}
      toolbarEnabled={false}
      moveOnMarkerPress={false}
      rotateEnabled
      pitchEnabled={false}
      onPanDrag={() => follow && onFollowChange?.(false)}
      onRegionChangeComplete={async () => {
        const cam = await mapRef.current?.getCamera();
        if (cam?.heading != null) {
          setCamHeading(cam.heading);
          onCameraHeading?.(cam.heading);
        }
      }}
    >
      {/* Accuracy of the saved car position */}
      {car && car.accuracy ? (
        <Circle
          center={car}
          radius={car.accuracy}
          strokeColor={t.colors.car + '99'}
          fillColor={t.colors.car + '1F'}
          strokeWidth={1}
        />
      ) : null}

      {/* Accuracy of the live user position */}
      {user && user.accuracy ? (
        <Circle
          center={user}
          radius={user.accuracy}
          strokeColor={t.colors.primary + '99'}
          fillColor={t.colors.primary + '1F'}
          strokeWidth={1}
        />
      ) : null}

      {hasRoute ? (
        <>
          <Polyline coordinates={route!} strokeColor={t.colors.isDark ? '#0b1020' : '#ffffff'} strokeWidth={8} lineCap="round" lineJoin="round" />
          <Polyline coordinates={route!} strokeColor={t.colors.primary} strokeWidth={5} lineCap="round" lineJoin="round" />
        </>
      ) : user && car ? (
        <Polyline
          coordinates={[user, car]}
          strokeColor={t.colors.textSecondary}
          strokeWidth={2}
          lineDashPattern={[6, 8]}
        />
      ) : null}

      {user && heading != null ? (
        Platform.OS === 'android' ? (
          // Google Maps: flat marker rotated relative to north (bitmap, cheap).
          <Marker coordinate={user} anchor={{ x: 0.5, y: 0.5 }} flat rotation={heading} tracksViewChanges={false}>
            <HeadingCone />
          </Marker>
        ) : (
          // Apple Maps: marker rotation is not supported, but children are live
          // views — rotate the cone relative to the current map heading.
          <Marker coordinate={user} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={{ transform: [{ rotate: `${heading - camHeading}deg` }] }}>
              <HeadingCone />
            </View>
          </Marker>
        )
      ) : null}

      {user ? (
        <Marker coordinate={user} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracks} title="Vous">
          <UserMarker />
        </Marker>
      ) : null}

      {car ? (
        <Marker coordinate={car} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={tracks} title="Votre voiture">
          <CarMarker label={carLabel} />
        </Marker>
      ) : null}
    </MapView>
  );
});
