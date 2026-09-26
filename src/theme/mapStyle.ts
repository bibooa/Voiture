/**
 * Google Maps JSON style for the dark theme. Tuned to match Garée's deep-blue
 * palette so the map blends into the app instead of glaring white at night.
 * Applied only on Android/Google provider standard maps in dark mode.
 */
export const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0b1024' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a93b5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1024' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a3357' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9aa4c8' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b74a0' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#122a1f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3f7a5a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#182036' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0e1428' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8791b5' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#26325a' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#12183a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1a2140' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050912' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a4468' }] },
];
