import Map, { type MapRef, Marker } from 'react-map-gl/maplibre';
import { useRef, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

// Dummy data to test the 3D curvature and vector rendering
const WAYPOINTS = [
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Kannur', lat: 11.8745, lng: 75.3704 },
  { name: 'Hanoi', lat: 21.0285, lng: 105.8542 },
  { name: 'Da Nang', lat: 16.0544, lng: 108.2022 },
  { name: 'Ho Chi Minh City', lat: 10.8231, lng: 106.6297 }
];

export default function MapView() {
  const mapRef = useRef<MapRef>(null);

  // Initialize the smooth 3D globe projection as soon as the canvas mounts
  const onMapLoad = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      map.setProjection({ type: 'globe' });
    }
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 90.0, // Centered roughly between India and Vietnam
        latitude: 15.0,
        zoom: 3 // Zoomed out enough to see the globe's curve
      }}
      style={{ width: '100vw', height: '100vh', backgroundColor: 'transparent' }}
      // CARTO's Dark Matter vector tile style endpoint
      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      onLoad={onMapLoad}
    >
      {WAYPOINTS.map((location, index) => (
        <Marker
          key={index}
          longitude={location.lng}
          latitude={location.lat}
          color="#00f2fe" // A vibrant neon cyan to pop against the dark theme
        />
      ))}
    </Map>
  );
}