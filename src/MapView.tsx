import Map, { type MapRef, Marker, Popup } from 'react-map-gl/maplibre';
import { useRef, useCallback, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

// Define the shape of the data coming from Go
interface PhotoData {
  id: number;
  title: string;
  imageUrl: string;
  lat: number;
  lng: number;
}

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);

  // Fetch data from the Go backend
  useEffect(() => {
    fetch('http://localhost:8080/api/photos')
      .then(res => res.json())
      .then(data => {
        if (data) setPhotos(data);
      })
      .catch(err => console.error("Failed to fetch photos:", err));
  }, []);

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
        longitude: 90.0,
        latitude: 15.0,
        zoom: 3
      }}
      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      onLoad={onMapLoad}
      style={{ width: '100vw', height: '100vh', backgroundColor: 'transparent' }}
    >
      {/* Map over the database records to render markers */}
      {photos.map((photo) => (
        <Marker 
          key={photo.id}
          longitude={photo.lng}
          latitude={photo.lat}
          color="#00f2fe"
          onClick={e => {
            e.originalEvent.stopPropagation();
            setSelectedPhoto(photo);
          }}
        />
      ))}

      {/* Show a popup if a marker is clicked */}
      {selectedPhoto && (
        <Popup
          longitude={selectedPhoto.lng}
          latitude={selectedPhoto.lat}
          anchor="bottom"
          onClose={() => setSelectedPhoto(null)}
          // Styling the popup to match the dark theme
          style={{ padding: 0, borderRadius: '8px', overflow: 'hidden', backgroundColor: '#1a1a1a', color: 'white' }}
        >
          <div style={{ padding: '10px', textAlign: 'center' }}>
            <img
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.title}
              style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
            />
            <h3 style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#fff' }}>{selectedPhoto.title}</h3>
          </div>
        </Popup>
      )}
    </Map>
  );
}