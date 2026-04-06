import Map, { type MapRef, Marker, Popup } from 'react-map-gl/maplibre';
import { useRef, useCallback, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

// Define the shape of the data coming from Go
interface PhotoData {
  id: string;
  title: string;
  description: string;
  image_url: string;
  thumb_url: string;
  location: {
    lat: number;
    lng: number;
  }
  captured_at: string;
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
        if (Array.isArray(data)) {
          setPhotos(data);
        } 
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
        longitude: 78.9629,
        latitude: 20.5937,
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
          longitude={photo.location.lng}
          latitude={photo.location.lat}
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
          longitude={selectedPhoto.location.lng}
          latitude={selectedPhoto.location.lat}
          anchor="bottom"
          onClose={() => setSelectedPhoto(null)}
          // Styling the popup to match the dark theme
          style={{ padding: 0, borderRadius: '8px', overflow: 'hidden', backgroundColor: '#1a1a1a', color: 'white' }}
        >
          <div style={{ padding: '10px', textAlign: 'center' }}>
            <img
              src={selectedPhoto.image_url}
              alt={selectedPhoto.title}
              style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
            />

            <div style={{ padding: '12px' }}>
              <h3 style={{
                margin: '0 0 6px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#fff'
              }}>
                {selectedPhoto.title}
              </h3>

              <p style={{
                margin: '0 0 10px 0',
                fontSize: '13px',
                color: '#ccc',
                lineHeight: '1.5'
              }}>
                {selectedPhoto.description || "No description provided."}
              </p>

              <div style={{
                fontSize: '10px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {new Date(selectedPhoto.captured_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}