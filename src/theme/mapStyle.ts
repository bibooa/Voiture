/**
 * Google Maps style for the dark theme (Android). Tuned for LEGIBILITY first:
 * clearly visible road hierarchy and readable street names, on a navy base that
 * matches the app. iOS uses Apple Maps' native dark mode instead.
 */
export const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#111829' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#b7c0dc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c1120' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2c3654' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#1c2642' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#2e3a5e' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#162036' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8791b3' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14281f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6f9a82' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2a3452' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2138' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#c3cae2' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#242d48' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#303b5e' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#3a4672' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1d2440' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#dfe4f5' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1c2540' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#9aa4c6' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1428' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4f6390' }] },
];
